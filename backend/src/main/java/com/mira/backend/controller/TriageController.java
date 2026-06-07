package com.mira.backend.controller;

import com.mira.backend.dto.ClinicianSummary;
import com.mira.backend.dto.CreateSessionRequest;
import com.mira.backend.dto.CreateSessionResponse;
import com.mira.backend.dto.IntakeInterpretation;
import com.mira.backend.dto.SubmitAnswersRequest;
import com.mira.backend.dto.SubmitAnswersResponse;
import com.mira.backend.model.TriageSession;
import com.mira.backend.service.TriageRulesEngine;
import com.mira.backend.service.ZaiIntakeService;
import com.mira.backend.service.ZaiSbarService;
import com.mira.backend.store.SessionStore;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashSet;
import java.util.UUID;

@RestController
@RequestMapping("/api/triage")
public class TriageController {

    private final ZaiIntakeService intakeService;
    private final ZaiSbarService sbarService;
    private final TriageRulesEngine rulesEngine;
    private final SessionStore sessionStore;

    public TriageController(ZaiIntakeService intakeService, ZaiSbarService sbarService,
            TriageRulesEngine rulesEngine, SessionStore sessionStore) {
        this.intakeService = intakeService;
        this.sbarService = sbarService;
        this.rulesEngine = rulesEngine;
        this.sessionStore = sessionStore;
    }

    /**
     * Creates a triage session from the patient's free-text concern. Runs the LLM
     * intake interpretation (cluster classification only) and stores the session
     * so later screens can build the question flow.
     */
    @PostMapping("/sessions")
    public ResponseEntity<CreateSessionResponse> createSession(
            @Valid @RequestBody CreateSessionRequest request) {
        String freeText = request.getFreeText().trim();

        IntakeInterpretation interpretation = intakeService.interpret(freeText);

        String sessionId = UUID.randomUUID().toString();
        sessionStore.save(new TriageSession(sessionId, freeText, interpretation));

        return ResponseEntity.ok(new CreateSessionResponse(sessionId, interpretation));
    }

    /**
     * Accepts the completed question flow and returns the patient-facing
     * disposition. SAFETY: the deterministic {@link TriageRulesEngine} -- never
     * the LLM -- decides urgency here.
     */
    @PostMapping("/sessions/{id}/answers")
    public ResponseEntity<SubmitAnswersResponse> submitAnswers(
            @PathVariable("id") String id,
            @RequestBody SubmitAnswersRequest request) {
        TriageSession session = sessionStore.find(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));

        TriageRulesEngine.Result result = rulesEngine.evaluate(request);

        session.setGestationWeeks(request.getGestationWeeks());
        session.setPostnatal(request.isPostnatal());
        session.setTrustId(request.getTrustId());
        session.setGlobal999Triggered(request.isGlobal999Triggered());
        session.setPrimaryCluster(request.getPrimaryCluster());
        session.setAnswers(request.getAnswers());
        session.setSweepAnswers(request.getSweepAnswers());
        session.setFlags(new LinkedHashSet<>(result.flags()));
        session.setDisposition(result.disposition());
        sessionStore.save(session);

        return ResponseEntity.ok(new SubmitAnswersResponse(result.disposition()));
    }

    /**
     * Clinician-only SBAR handoff. SAFETY: served on a separate path, never
     * reachable from the patient flow. Only callable once a disposition exists.
     */
    @GetMapping("/sessions/{id}/clinician-summary")
    public ResponseEntity<ClinicianSummary> clinicianSummary(@PathVariable("id") String id) {
        TriageSession session = sessionStore.find(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));

        if (!session.isComplete()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Triage is not complete yet for this session.");
        }

        return ResponseEntity.ok(sbarService.generate(session));
    }
}
