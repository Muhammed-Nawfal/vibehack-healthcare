package com.mira.backend.dto;

/**
 * Response for session creation. Returns the session id plus the internal
 * interpretation that the next (questions) page uses to choose which branch to
 * run. This is NOT patient-facing copy -- it carries no diagnosis or pathway.
 */
public class CreateSessionResponse {

    private String sessionId;
    private IntakeInterpretation interpretation;

    public CreateSessionResponse() {
    }

    public CreateSessionResponse(String sessionId, IntakeInterpretation interpretation) {
        this.sessionId = sessionId;
        this.interpretation = interpretation;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public IntakeInterpretation getInterpretation() {
        return interpretation;
    }

    public void setInterpretation(IntakeInterpretation interpretation) {
        this.interpretation = interpretation;
    }
}
