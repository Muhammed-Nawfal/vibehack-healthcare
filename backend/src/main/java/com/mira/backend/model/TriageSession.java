package com.mira.backend.model;

import com.mira.backend.dto.IntakeInterpretation;

import java.time.Instant;

/**
 * In-memory triage session state. For the prototype there is no database; the
 * session holds the patient's free-text concern and the LLM interpretation so
 * later screens (questions, result) can build on it.
 */
public class TriageSession {

    private final String sessionId;
    private final String freeText;
    private final IntakeInterpretation interpretation;
    private final Instant createdAt;

    public TriageSession(String sessionId, String freeText, IntakeInterpretation interpretation) {
        this.sessionId = sessionId;
        this.freeText = freeText;
        this.interpretation = interpretation;
        this.createdAt = Instant.now();
    }

    public String getSessionId() {
        return sessionId;
    }

    public String getFreeText() {
        return freeText;
    }

    public IntakeInterpretation getInterpretation() {
        return interpretation;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
