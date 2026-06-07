package com.mira.backend.model;

import com.mira.backend.dto.AnswerEntry;
import com.mira.backend.dto.Disposition;
import com.mira.backend.dto.IntakeInterpretation;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * In-memory triage session state. For the prototype there is no database; the
 * session accumulates everything gathered across the flow -- the free-text
 * concern, the LLM interpretation, the gestation context, the collected
 * answers, the flags raised by the rules engine, and the final disposition --
 * so the clinician summary endpoint can build an accurate SBAR.
 */
public class TriageSession {

    private final String sessionId;
    private final String freeText;
    private final IntakeInterpretation interpretation;
    private final Instant createdAt;

    // Populated when the answers are submitted.
    private Integer gestationWeeks;
    private boolean postnatal;
    private String trustId;
    private boolean global999Triggered;
    private String primaryCluster;
    private List<AnswerEntry> answers = new ArrayList<>();
    private List<AnswerEntry> sweepAnswers = new ArrayList<>();
    private Set<String> flags = new LinkedHashSet<>();
    private Disposition disposition;

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

    public Integer getGestationWeeks() {
        return gestationWeeks;
    }

    public void setGestationWeeks(Integer gestationWeeks) {
        this.gestationWeeks = gestationWeeks;
    }

    public boolean isPostnatal() {
        return postnatal;
    }

    public void setPostnatal(boolean postnatal) {
        this.postnatal = postnatal;
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

    public Set<String> getFlags() {
        return flags;
    }

    public void setFlags(Set<String> flags) {
        this.flags = flags == null ? new LinkedHashSet<>() : flags;
    }

    public Disposition getDisposition() {
        return disposition;
    }

    public void setDisposition(Disposition disposition) {
        this.disposition = disposition;
    }

    public boolean isComplete() {
        return disposition != null;
    }
}
