package com.mira.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.ArrayList;
import java.util.List;

/**
 * Body for {@code POST /api/triage/sessions/{id}/answers}. Carries the context
 * captured on the gestation screen plus the full client-side question flow
 * answers. The deterministic rules engine -- never the LLM -- turns this into a
 * disposition.
 */
public class SubmitAnswersRequest {

    private int gestationWeeks;
    private boolean isPostnatal;
    private String trustId;
    private boolean global999Triggered;

    /** One of: RFM | PREECLAMPSIA | BLEEDING | OTHER (the confirmed branch). */
    private String primaryCluster = "OTHER";

    private List<AnswerEntry> answers = new ArrayList<>();
    private List<AnswerEntry> sweepAnswers = new ArrayList<>();

    public SubmitAnswersRequest() {
    }

    public int getGestationWeeks() {
        return gestationWeeks;
    }

    public void setGestationWeeks(int gestationWeeks) {
        this.gestationWeeks = gestationWeeks;
    }

    @JsonProperty("isPostnatal")
    public boolean isPostnatal() {
        return isPostnatal;
    }

    @JsonProperty("isPostnatal")
    public void setPostnatal(boolean postnatal) {
        isPostnatal = postnatal;
    }

    public String getTrustId() {
        return trustId;
    }

    public void setTrustId(String trustId) {
        this.trustId = trustId;
    }

    public boolean isGlobal999Triggered() {
        return global999Triggered;
    }

    public void setGlobal999Triggered(boolean global999Triggered) {
        this.global999Triggered = global999Triggered;
    }

    public String getPrimaryCluster() {
        return primaryCluster;
    }

    public void setPrimaryCluster(String primaryCluster) {
        this.primaryCluster = primaryCluster;
    }

    public List<AnswerEntry> getAnswers() {
        return answers;
    }

    public void setAnswers(List<AnswerEntry> answers) {
        this.answers = answers == null ? new ArrayList<>() : answers;
    }

    public List<AnswerEntry> getSweepAnswers() {
        return sweepAnswers;
    }

    public void setSweepAnswers(List<AnswerEntry> sweepAnswers) {
        this.sweepAnswers = sweepAnswers == null ? new ArrayList<>() : sweepAnswers;
    }
}
