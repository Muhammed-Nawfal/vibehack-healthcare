package com.mira.backend.service;

import com.mira.backend.dto.AnswerEntry;
import com.mira.backend.dto.Contact;
import com.mira.backend.dto.Disposition;
import com.mira.backend.dto.SubmitAnswersRequest;
import com.mira.backend.model.UrgencyLevel;
import com.mira.backend.trust.Trust;
import com.mira.backend.trust.TrustRegistry;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Deterministic triage rules engine. SAFETY: this -- never the LLM -- decides
 * urgency and disposition. When inputs are ambiguous it always resolves to the
 * HIGHER urgency level (over-escalation).
 *
 * <p>Pipeline: 999 short-circuit -> base disposition by cluster -> branch
 * answers (collecting flags) -> red-flag sweep -> gestation gating ->
 * contact resolution -> patient-facing copy.
 *
 * <p>Valid pathways: NHS_111 | EPU | MAT_TRIAGE_NOW | EMERGENCY_999.
 * GP_ROUTINE does not exist as a maternity destination.
 */
@Service
public class TriageRulesEngine {

    private static final String SAFETY_NETTING =
            "Call 999 right away if you have heavy bleeding, severe pain, "
                    + "difficulty breathing, or you feel faint or collapse.";

    /** Engine output: the patient-facing disposition plus the internal flags (for SBAR only). */
    public record Result(Disposition disposition, Set<String> flags) {
    }

    public Result evaluate(SubmitAnswersRequest req) {
        Set<String> flags = new LinkedHashSet<>();
        Trust trust = TrustRegistry.findOrDefault(req.getTrustId());

        // Step 1 -- 999 short-circuit.
        if (req.isGlobal999Triggered()) {
            flags.add("global_999_triggered");
            return new Result(build(UrgencyLevel.EMERGENCY_999, trust, req), flags);
        }

        String cluster = req.getPrimaryCluster() == null
                ? "OTHER" : req.getPrimaryCluster().trim().toUpperCase();
        Map<String, String> answers = toMap(req.getAnswers());

        // Step 2 -- base disposition by cluster.
        // PREECLAMPSIA starts at NHS_111: all-negative pre-eclampsia screen ->
        // call 111 for advice (not GP; that pathway doesn't exist for maternity).
        UrgencyLevel urgency = switch (cluster) {
            case "PREECLAMPSIA" -> UrgencyLevel.NHS_111;
            case "RFM", "BLEEDING", "OTHER" -> UrgencyLevel.MAT_TRIAGE_NOW;
            default -> UrgencyLevel.MAT_TRIAGE_NOW;
        };

        // Step 3 -- branch answers + flags.
        switch (cluster) {
            case "RFM" -> urgency = evaluateRfm(answers, flags);
            case "PREECLAMPSIA" -> urgency = evaluatePreeclampsia(answers, flags, urgency);
            case "BLEEDING" -> urgency = evaluateBleeding(answers, flags);
            default -> { /* OTHER: keep base MAT_TRIAGE_NOW */ }
        }

        // Step 4 -- red-flag sweep. Any positive raises to at least MAT_TRIAGE_NOW.
        if (hasPositiveSweep(req.getSweepAnswers(), flags)) {
            urgency = urgency.max(UrgencyLevel.MAT_TRIAGE_NOW);
        }

        // Step 5 -- gestation gating (handled inside build()).
        return new Result(build(urgency, trust, req), flags);
    }

    private UrgencyLevel evaluateRfm(Map<String, String> answers, Set<String> flags) {
        // Even "feels normal" still routes to 111: the woman is worried enough to
        // use this app, so she deserves a professional opinion, not self-monitoring.
        UrgencyLevel urgency = UrgencyLevel.NHS_111;
        String rfm1 = answers.get("rfm_1");
        if ("no_movement".equals(rfm1)) {
            flags.add("no_movement");
            urgency = UrgencyLevel.MAT_TRIAGE_NOW;
        } else if ("less_than_usual".equals(rfm1)) {
            urgency = UrgencyLevel.MAT_TRIAGE_NOW;
        }
        // feels_normal -> stays NHS_111 (reassuring but still seek advice)
        if ("yesterday_or_longer".equals(answers.get("rfm_2"))) {
            flags.add("delayed_presentation");
            urgency = urgency.max(UrgencyLevel.MAT_TRIAGE_NOW);
        }
        if ("yes".equals(answers.get("rfm_3"))) {
            flags.add("recurrent_rfm");
            urgency = urgency.max(UrgencyLevel.MAT_TRIAGE_NOW);
        }
        return urgency;
    }

    private UrgencyLevel evaluatePreeclampsia(Map<String, String> answers, Set<String> flags,
            UrgencyLevel base) {
        Map<String, String> flagByQuestion = Map.of(
                "prec_1", "severe_headache",
                "prec_2", "visual_disturbance",
                "prec_3", "sudden_swelling",
                "prec_4", "epigastric_pain",
                "prec_5", "feels_very_unwell");

        int positives = 0;
        for (Map.Entry<String, String> e : flagByQuestion.entrySet()) {
            if ("yes".equals(answers.get(e.getKey()))) {
                positives++;
                flags.add(e.getValue());
            }
        }
        if (positives >= 3) {
            return UrgencyLevel.EMERGENCY_999;
        }
        if (positives >= 1) {
            return base.max(UrgencyLevel.MAT_TRIAGE_NOW);
        }
        return base; // NHS_111: all negative, low-risk
    }

    private UrgencyLevel evaluateBleeding(Map<String, String> answers, Set<String> flags) {
        UrgencyLevel urgency = UrgencyLevel.MAT_TRIAGE_NOW;
        if ("soaking".equals(answers.get("bleed_1"))) {
            flags.add("heavy_bleeding");
        }
        if ("severe".equals(answers.get("bleed_2"))) {
            flags.add("severe_pain");
        }
        String bleed3 = answers.get("bleed_3");
        if ("clear".equals(bleed3)) {
            flags.add("possible_waters");
        } else if ("green_brown".equals(bleed3)) {
            flags.add("discoloured_fluid");
        }
        // Combination rule: heavy bleeding + severe pain -> emergency.
        if (flags.contains("heavy_bleeding") && flags.contains("severe_pain")) {
            urgency = UrgencyLevel.EMERGENCY_999;
        }
        return urgency;
    }

    private boolean hasPositiveSweep(List<AnswerEntry> sweepAnswers, Set<String> flags) {
        boolean positive = false;
        Map<String, String> sweep = toMap(sweepAnswers);
        if ("yes".equals(sweep.get("sweep_bleeding"))) {
            flags.add("sweep_bleeding_positive");
            positive = true;
        }
        if ("yes".equals(sweep.get("sweep_prec"))) {
            flags.add("sweep_preeclampsia_positive");
            positive = true;
        }
        // INVERTED: "no" (movements not normal today) is the positive trigger.
        if ("no".equals(sweep.get("sweep_rfm"))) {
            flags.add("sweep_rfm_positive");
            positive = true;
        }
        return positive;
    }

    /**
     * Applies gestation gating, resolves contact details, and attaches the
     * patient-facing copy for the final urgency level.
     */
    private Disposition build(UrgencyLevel urgency, Trust trust, SubmitAnswersRequest req) {
        // Step 5 -- gestation gating (skipped for emergencies and postnatal cases).
        if (urgency == UrgencyLevel.MAT_TRIAGE_NOW && !req.isPostnatal()
                && req.getGestationWeeks() < trust.maternityTriageFromWeeks()) {
            if (req.getGestationWeeks() >= trust.epuFromWeeks()
                    && req.getGestationWeeks() < trust.epuToWeeks()) {
                urgency = UrgencyLevel.EPU;
            } else {
                // Too early even for the EPU pathway: call 111 for advice.
                urgency = UrgencyLevel.NHS_111;
            }
        }

        // Step 6 -- resolve contact details.
        Disposition d = new Disposition();
        d.setUrgencyLevel(urgency.name());

        Contact primaryContact;
        switch (urgency) {
            case EMERGENCY_999 -> {
                primaryContact = new Contact("Emergency services", "999");
                d.setNearbyContacts(List.of());
            }
            case EPU -> {
                primaryContact = new Contact(trust.name(), trust.epuPhone());
                d.setNearbyContacts(nearby(trust));
            }
            case MAT_TRIAGE_NOW -> {
                primaryContact = new Contact(trust.name(), trust.maternityTriagePhone());
                d.setNearbyContacts(nearby(trust));
            }
            default -> { // NHS_111
                primaryContact = new Contact("NHS 111", "111");
                d.setNearbyContacts(List.of());
            }
        }
        d.setPrimaryContact(primaryContact);

        // Step 7 -- patient-facing copy (hard-coded; never from the LLM).
        applyCopy(d, urgency);
        return d;
    }

    private List<Contact> nearby(Trust trust) {
        return TrustRegistry.find(trust.nearbyTrustIds()).stream()
                .map(t -> new Contact(t.name(), t.maternityTriagePhone()))
                .toList();
    }

    private void applyCopy(Disposition d, UrgencyLevel urgency) {
        d.setSafetyNetting(SAFETY_NETTING);
        switch (urgency) {
            case EMERGENCY_999 -> {
                d.setPathwayName("Call 999 now");
                d.setPathwayAction("call");
                d.setPatientMessage("This needs emergency care now. Please call 999, or ask someone "
                        + "to call for you. Tell them how many weeks pregnant you are.");
            }
            case MAT_TRIAGE_NOW -> {
                d.setPathwayName("Call your maternity triage line");
                d.setPathwayAction("call");
                d.setPatientMessage("These are symptoms your maternity team will always want to check "
                        + "promptly. Call your maternity triage line now — it's open day and night. "
                        + "Don't wait until morning. You are not wasting their time.");
            }
            case EPU -> {
                d.setPathwayName("Contact your Early Pregnancy Unit");
                d.setPathwayAction("call");
                d.setPatientMessage("Because you're in early pregnancy, contact the Early Pregnancy "
                        + "Unit today. If you can't reach them, call NHS 111 for advice.");
            }
            default -> { // NHS_111
                d.setPathwayName("Call NHS 111");
                d.setPathwayAction("call");
                d.setPatientMessage("Your answers don't suggest an urgent concern right now — but you "
                        + "deserve a professional opinion. Call NHS 111 (dial 111), free any time, "
                        + "and they'll connect you with a midwife or nurse. If anything changes or you "
                        + "feel worse, call your maternity triage line directly.");
            }
        }
    }

    private Map<String, String> toMap(List<AnswerEntry> entries) {
        Map<String, String> map = new LinkedHashMap<>();
        if (entries != null) {
            for (AnswerEntry e : entries) {
                if (e != null && e.getQuestionId() != null) {
                    map.put(e.getQuestionId(), e.getAnswer());
                }
            }
        }
        return map;
    }
}
