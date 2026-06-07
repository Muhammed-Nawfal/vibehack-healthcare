package com.mira.backend.dto;

/**
 * Clinician-only SBAR handoff note. SAFETY: this is the ONLY place clinical
 * reasoning is surfaced, served from the separate {@code /clinician} route and
 * NEVER shown to or linked from the patient flow.
 */
public class ClinicianSummary {

    private String situation;
    private String background;
    private String assessment;
    private String recommendation;
    private String urgencyLevel;
    private String recommendedAction;
    private String timestamp;

    public ClinicianSummary() {
    }

    public String getSituation() {
        return situation;
    }

    public void setSituation(String situation) {
        this.situation = situation;
    }

    public String getBackground() {
        return background;
    }

    public void setBackground(String background) {
        this.background = background;
    }

    public String getAssessment() {
        return assessment;
    }

    public void setAssessment(String assessment) {
        this.assessment = assessment;
    }

    public String getRecommendation() {
        return recommendation;
    }

    public void setRecommendation(String recommendation) {
        this.recommendation = recommendation;
    }

    public String getUrgencyLevel() {
        return urgencyLevel;
    }

    public void setUrgencyLevel(String urgencyLevel) {
        this.urgencyLevel = urgencyLevel;
    }

    public String getRecommendedAction() {
        return recommendedAction;
    }

    public void setRecommendedAction(String recommendedAction) {
        this.recommendedAction = recommendedAction;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }
}
