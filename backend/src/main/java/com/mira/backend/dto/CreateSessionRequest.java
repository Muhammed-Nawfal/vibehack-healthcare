package com.mira.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

/**
 * Patient input from the Main Concern screen. The woman describes her symptoms
 * in her own words (typed or transcribed from speech in the browser).
 * Gestation weeks come from the patient's Supabase profile at sign-up.
 */
public class CreateSessionRequest {

    @NotBlank(message = "Please describe what's worrying you.")
    private String freeText;

    @Min(value = 0, message = "Gestation weeks must be at least 0.")
    @Max(value = 42, message = "Gestation weeks must be at most 42.")
    private Integer gestationWeeks;

    private boolean isPostnatal;

    public CreateSessionRequest() {
    }

    public String getFreeText() {
        return freeText;
    }

    public void setFreeText(String freeText) {
        this.freeText = freeText;
    }

    public Integer getGestationWeeks() {
        return gestationWeeks;
    }

    public void setGestationWeeks(Integer gestationWeeks) {
        this.gestationWeeks = gestationWeeks;
    }

    public boolean isPostnatal() {
        return isPostnatal;
    }

    public void setPostnatal(boolean postnatal) {
        isPostnatal = postnatal;
    }
}
