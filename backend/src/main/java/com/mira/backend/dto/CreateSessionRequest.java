package com.mira.backend.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Patient input from the Main Concern screen. The woman describes her symptoms
 * in her own words (typed or transcribed from speech in the browser).
 */
public class CreateSessionRequest {

    @NotBlank(message = "Please describe what's worrying you.")
    private String freeText;

    public CreateSessionRequest() {
    }

    public String getFreeText() {
        return freeText;
    }

    public void setFreeText(String freeText) {
        this.freeText = freeText;
    }
}
