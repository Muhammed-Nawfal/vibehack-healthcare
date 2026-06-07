package com.mira.backend.controller;

import com.mira.backend.dto.CreateSessionRequest;
import com.mira.backend.dto.CreateSessionResponse;
import com.mira.backend.dto.IntakeInterpretation;
import com.mira.backend.model.TriageSession;
import com.mira.backend.service.ZaiIntakeService;
import com.mira.backend.store.SessionStore;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/triage")
public class TriageController {

    private final ZaiIntakeService intakeService;
    private final SessionStore sessionStore;

    public TriageController(ZaiIntakeService intakeService, SessionStore sessionStore) {
        this.intakeService = intakeService;
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
        Integer gestationWeeks = request.getGestationWeeks();
        boolean postnatal = request.isPostnatal();

        IntakeInterpretation interpretation =
                intakeService.interpret(freeText, gestationWeeks, postnatal);

        String sessionId = UUID.randomUUID().toString();
        sessionStore.save(
                new TriageSession(sessionId, freeText, gestationWeeks, postnatal, interpretation));

        return ResponseEntity.ok(new CreateSessionResponse(sessionId, interpretation));
    }
}
