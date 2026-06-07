package com.mira.backend.service;

import ai.z.openapi.ZaiClient;
import ai.z.openapi.service.model.ChatCompletionCreateParams;
import ai.z.openapi.service.model.ChatCompletionResponse;
import ai.z.openapi.service.model.ChatMessage;
import ai.z.openapi.service.model.ChatMessageRole;
import ai.z.openapi.service.model.ResponseFormat;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mira.backend.dto.AnswerEntry;
import com.mira.backend.dto.ClinicianSummary;
import com.mira.backend.model.TriageSession;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Map;
import java.util.StringJoiner;

/**
 * SBAR clinician handoff generation via the z.ai (GLM) Java SDK.
 *
 * <p>SAFETY: this is one of only two LLM touch-points in the system. It writes a
 * clinician-only SBAR note from the structured session data -- it does NOT
 * decide urgency or disposition (the deterministic rules engine already did)
 * and its output is NEVER shown to the patient. If the key is missing or the
 * model misbehaves, we fall back to a deterministic SBAR built from the data so
 * the clinician view still works.
 */
@Service
public class ZaiSbarService {

    private static final Logger log = LoggerFactory.getLogger(ZaiSbarService.class);

    private static final String SYSTEM_PROMPT = """
            You are writing a concise clinical SBAR handoff note for a maternity triage midwife. \
            Write only from the data provided. Include relevant positives and the pertinent \
            negatives that were screened. Do not invent information. This is clinician-only and \
            never shown to the patient. \
            IMPORTANT: the "recommendation" field must be written for the RECEIVING CLINICIAN \
            (midwife, obstetrician, or triage nurse) — state what assessments or actions they \
            should take (e.g. CTG, blood pressure monitoring, bloods, USS). Do NOT write \
            patient-facing instructions such as "call your maternity unit" — the clinician \
            reading this IS at the maternity unit. The triage track has already been decided; \
            your job is to summarise the clinical next steps. \
            Return ONLY valid JSON with no markdown fences: \
            { "situation": "...", "background": "...", "assessment": "...", "recommendation": "..." }""";

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final String apiKey;
    private final String model;

    private ZaiClient client;

    public ZaiSbarService(
            @Value("${zai.api-key:}") String apiKey,
            @Value("${zai.model:glm-5.1}") String model) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = (model == null || model.isBlank()) ? "glm-5.1" : model.trim();
    }

    @PostConstruct
    void init() {
        if (apiKey.isBlank()) {
            log.warn("ZAI_API_KEY is not set -- clinician SBAR will use a deterministic fallback.");
            return;
        }
        try {
            this.client = ZaiClient.builder().ofZAI().apiKey(apiKey).build();
            log.info("z.ai SBAR client initialised (model={}).", model);
        } catch (Throwable t) {
            this.client = null;
            log.error("Failed to initialise z.ai SBAR client -- using deterministic fallback: {}",
                    t.toString());
        }
    }

    /**
     * Generates an SBAR summary for a completed session. Never throws -- always
     * returns a usable summary (deterministic fallback on any problem).
     */
    public ClinicianSummary generate(TriageSession session) {
        String urgency = session.getDisposition().getUrgencyLevel();
        String recommendedAction = recommendedAction(session);
        String structured = buildStructuredInput(session);

        ClinicianSummary summary = (client == null) ? null : callLlm(structured);
        if (summary == null) {
            summary = deterministicFallback(session, structured);
        }

        summary.setUrgencyLevel(urgency);
        summary.setRecommendedAction(recommendedAction);
        summary.setTimestamp(java.time.Instant.now().toString());
        return summary;
    }

    private ClinicianSummary callLlm(String structuredInput) {
        try {
            ChatCompletionCreateParams request = ChatCompletionCreateParams.builder()
                    .model(model)
                    .messages(Arrays.asList(
                            ChatMessage.builder()
                                    .role(ChatMessageRole.SYSTEM.value())
                                    .content(SYSTEM_PROMPT)
                                    .build(),
                            ChatMessage.builder()
                                    .role(ChatMessageRole.USER.value())
                                    .content(structuredInput)
                                    .build()))
                    .doSample(true)
                    .temperature(0.3f)
                    .responseFormat(ResponseFormat.builder().type("json_object").build())
                    .stream(false)
                    .build();

            ChatCompletionResponse response = client.chat().createChatCompletion(request);
            if (response == null || !response.isSuccess() || response.getData() == null
                    || response.getData().getChoices() == null
                    || response.getData().getChoices().isEmpty()) {
                log.warn("z.ai SBAR call failed: {}",
                        response == null ? "null response" : response.getMsg());
                return null;
            }

            Object content = response.getData().getChoices().get(0).getMessage().getContent();
            String json = extractJson(content == null ? null : content.toString());
            if (json == null) {
                return null;
            }
            JsonNode node = objectMapper.readTree(json);
            ClinicianSummary summary = new ClinicianSummary();
            summary.setSituation(text(node, "situation"));
            summary.setBackground(text(node, "background"));
            summary.setAssessment(text(node, "assessment"));
            summary.setRecommendation(text(node, "recommendation"));
            return summary;
        } catch (Exception e) {
            log.warn("z.ai SBAR generation error, using deterministic fallback: {}", e.getMessage());
            return null;
        }
    }

    /** Builds the structured, de-identified prompt input from the session. */
    private String buildStructuredInput(TriageSession session) {
        StringBuilder sb = new StringBuilder();
        sb.append("Gestation: ");
        if (session.isPostnatal()) {
            sb.append("postnatal (within recent weeks)\n");
        } else {
            sb.append(session.getGestationWeeks()).append(" weeks\n");
        }
        sb.append("Primary symptom cluster: ").append(session.getPrimaryCluster()).append('\n');
        sb.append("Patient's own words: ").append(safe(session.getFreeText())).append('\n');
        sb.append("Global emergency screen triggered: ")
                .append(session.isGlobal999Triggered()).append('\n');

        sb.append("Branch answers:\n");
        appendAnswers(sb, session.getAnswers());
        sb.append("Red-flag sweep answers:\n");
        appendAnswers(sb, session.getSweepAnswers());

        StringJoiner flags = new StringJoiner(", ");
        session.getFlags().forEach(flags::add);
        sb.append("Flags raised: ")
                .append(session.getFlags().isEmpty() ? "none" : flags.toString()).append('\n');

        sb.append("Deterministic disposition (already decided by rules engine — write the SBAR recommendation for the receiving clinician, not the patient): ")
                .append(session.getDisposition().getUrgencyLevel())
                .append(" — ").append(clinicianRecommendation(session)).append('\n');
        return sb.toString();
    }

    private static final Map<String, String> QUESTION_LABELS = Map.ofEntries(
            Map.entry("prec_1", "Persistent headache (not easing with rest/paracetamol)"),
            Map.entry("prec_2", "Vision changes (blurring, flashing lights, spots)"),
            Map.entry("prec_3", "Sudden swelling of face, hands or fingers"),
            Map.entry("prec_4", "Pain below ribs, especially on the right"),
            Map.entry("prec_5", "Feeling very unwell in herself"),
            Map.entry("rfm_1", "Fetal movement — current status"),
            Map.entry("rfm_2", "Onset of movement change"),
            Map.entry("rfm_3", "Previous RFM contact in this pregnancy"),
            Map.entry("bleed_1", "Volume of bleeding"),
            Map.entry("bleed_2", "Pain accompanying the bleeding"),
            Map.entry("bleed_3", "Fluid leaking"),
            Map.entry("sweep_bleeding", "Sweep: any bleeding or fluid leaking"),
            Map.entry("sweep_prec", "Sweep: headache, vision changes or swelling"),
            Map.entry("sweep_rfm", "Sweep: fetal movements normal today"));

    private static final Map<String, String> ANSWER_LABELS = Map.ofEntries(
            Map.entry("yes", "Yes"),
            Map.entry("no", "No"),
            Map.entry("no_movement", "No movement at all"),
            Map.entry("less_than_usual", "Less than usual / different pattern"),
            Map.entry("feels_normal", "Feels normal for this baby"),
            Map.entry("last_few_hours", "Within the last few hours / today"),
            Map.entry("yesterday_or_longer", "Yesterday or longer ago"),
            Map.entry("spotting", "Spotting"),
            Map.entry("needs_pad", "Enough to need a pad"),
            Map.entry("soaking", "Soaking through a pad or passing clots"),
            Map.entry("none_mild", "No pain or mild"),
            Map.entry("severe", "Severe, constant pain"),
            Map.entry("clear", "Clear or straw-coloured fluid"),
            Map.entry("green_brown", "Green or brown fluid"));

    private void appendAnswers(StringBuilder sb, java.util.List<AnswerEntry> answers) {
        if (answers == null || answers.isEmpty()) {
            sb.append("  (none)\n");
            return;
        }
        for (AnswerEntry a : answers) {
            String question = QUESTION_LABELS.getOrDefault(a.getQuestionId(), a.getQuestionId());
            String answer = ANSWER_LABELS.getOrDefault(a.getAnswer(), a.getAnswer());
            sb.append("  - ").append(question).append(": ").append(answer).append('\n');
        }
    }

    private ClinicianSummary deterministicFallback(TriageSession session, String structured) {
        ClinicianSummary s = new ClinicianSummary();
        String gestation = session.isPostnatal()
                ? "postnatal patient"
                : session.getGestationWeeks() + " weeks pregnant";
        s.setSituation(gestation + " presenting via Mira self-triage with a "
                + clusterPhrase(session.getPrimaryCluster()) + " concern. "
                + "Patient's words: \"" + safe(session.getFreeText()) + "\".");
        s.setBackground("Self-reported via the Mira triage flow. "
                + (session.isGlobal999Triggered()
                        ? "Global emergency safety screen was triggered."
                        : "Global emergency safety screen was negative."));
        StringJoiner flags = new StringJoiner(", ");
        session.getFlags().forEach(flags::add);
        s.setAssessment("Collected answers and red-flag sweep recorded. Flags raised: "
                + (session.getFlags().isEmpty() ? "none" : flags.toString()) + ". "
                + "Full structured intake:\n" + structured);
        s.setRecommendation(clinicianRecommendation(session));
        return s;
    }

    /**
     * Short action label for the clinician footer — what pathway the patient was
     * assigned to, stated in professional terms (not patient-facing language).
     */
    private String recommendedAction(TriageSession session) {
        return switch (session.getDisposition().getUrgencyLevel()) {
            case "EMERGENCY_999" -> "Immediate obstetric emergency — patient directed to call 999";
            case "MAT_TRIAGE_NOW" -> "Urgent maternity assessment — patient attending maternity assessment unit";
            case "EPU" -> "Early Pregnancy Unit — urgent early pregnancy assessment";
            default -> "Low urgency — patient advised to contact NHS 111 for telephone clinical triage";
        };
    }

    /**
     * Clinician-facing SBAR recommendation: what the receiving professional should
     * assess or action, based on the triage track and symptom cluster. Never uses
     * patient-facing language (e.g. "call your maternity unit").
     */
    private String clinicianRecommendation(TriageSession session) {
        String urgency = session.getDisposition().getUrgencyLevel();
        String cluster = session.getPrimaryCluster() == null
                ? "OTHER" : session.getPrimaryCluster().trim().toUpperCase();
        StringJoiner flags = new StringJoiner(", ");
        session.getFlags().forEach(flags::add);
        String flagSummary = session.getFlags().isEmpty() ? "none" : flags.toString();

        return switch (urgency) {
            case "EMERGENCY_999" ->
                    "EMERGENCY — patient directed to call 999. On arrival: immediate senior obstetric "
                    + "review, continuous CTG, IV access. Activate obstetric emergency protocol as "
                    + "clinically indicated. Flags: " + flagSummary + ".";
            case "MAT_TRIAGE_NOW" -> switch (cluster) {
                case "RFM" ->
                    "Patient attending for reduced fetal movements. Conduct CTG for minimum 20 minutes. "
                    + "If CTG normal but maternal concern persists, arrange USS for liquor volume and "
                    + "growth (RCOG GTG 57). Flags: " + flagSummary + ".";
                case "PREECLAMPSIA" ->
                    "Patient attending with possible pre-eclampsia features. Assess BP (minimum two "
                    + "readings), urinalysis for protein. If hypertension confirmed: FBC, LFTs, urates, "
                    + "creatinine, fetal assessment per NICE NG133. Flags: " + flagSummary + ".";
                case "BLEEDING" ->
                    "Patient attending for antepartum haemorrhage. Assess haemodynamic stability; "
                    + "establish IV access if active heavy bleeding. Confirm placental location if not "
                    + "documented. Cross-match if haemodynamically compromised. Flags: " + flagSummary + ".";
                default ->
                    "Patient attending for urgent clinical review. Assess as clinically indicated. "
                    + "Flags: " + flagSummary + ".";
            };
            case "EPU" ->
                    "Patient attending Early Pregnancy Unit. Arrange TVS, serum β-hCG, blood group and "
                    + "antibody screen. Administer anti-D prophylaxis if rhesus negative. Exclude ectopic "
                    + "pregnancy. Flags: " + flagSummary + ".";
            default -> // NHS_111
                    "Low-urgency presentation — patient triaged to NHS 111 telephone clinical triage. "
                    + "Safety-netting advice provided. Patient should re-present to maternity triage if "
                    + "symptoms worsen, fail to resolve, or she remains concerned. Flags: " + flagSummary + ".";
        };
    }

    private String clusterPhrase(String cluster) {
        if (cluster == null) {
            return "general";
        }
        return switch (cluster.toUpperCase()) {
            case "RFM" -> "reduced fetal movements";
            case "PREECLAMPSIA" -> "possible pre-eclampsia";
            case "BLEEDING" -> "bleeding / fluid loss";
            default -> "non-specific";
        };
    }

    private String extractJson(String raw) {
        if (raw == null) {
            return null;
        }
        int start = raw.indexOf('{');
        int end = raw.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return raw.substring(start, end + 1);
        }
        return null;
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? "" : value.asText();
    }

    private String safe(String s) {
        return s == null ? "" : s.trim();
    }
}
