package com.mira.backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Structured result of the LLM intake interpretation. The model ONLY maps the
 * woman's free text to a triage cluster -- it never decides urgency or pathway
 * (that stays in the deterministic rules engine). Mirrors the JSON the LLM is
 * asked to return.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class IntakeInterpretation {

    /** One of: RFM | PREECLAMPSIA | BLEEDING | OTHER */
    private String primaryCluster = "OTHER";

    private List<String> additionalClusters = new ArrayList<>();

    private Map<String, Object> extractedSignals = new LinkedHashMap<>();

    /**
     * Question answers the free text already answers with confidence (e.g.
     * {"prec_1":"yes"}). Keyed by question id, valued by the option value. These
     * pre-fill the question flow so confidently-answered questions are skipped.
     */
    private Map<String, String> extractedAnswers = new LinkedHashMap<>();

    private boolean urgent999Suspected = false;

    public IntakeInterpretation() {
    }

    /** Safe fallback used when the LLM is unavailable or returns unparseable output. */
    public static IntakeInterpretation safeFallback() {
        IntakeInterpretation fallback = new IntakeInterpretation();
        fallback.setPrimaryCluster("OTHER");
        fallback.setUrgent999Suspected(false);
        return fallback;
    }

    public String getPrimaryCluster() {
        return primaryCluster;
    }

    public void setPrimaryCluster(String primaryCluster) {
        this.primaryCluster = primaryCluster;
    }

    public List<String> getAdditionalClusters() {
        return additionalClusters;
    }

    public void setAdditionalClusters(List<String> additionalClusters) {
        this.additionalClusters = additionalClusters;
    }

    public Map<String, Object> getExtractedSignals() {
        return extractedSignals;
    }

    public void setExtractedSignals(Map<String, Object> extractedSignals) {
        this.extractedSignals = extractedSignals;
    }

    public Map<String, String> getExtractedAnswers() {
        return extractedAnswers;
    }

    public void setExtractedAnswers(Map<String, String> extractedAnswers) {
        this.extractedAnswers = extractedAnswers;
    }

    public boolean isUrgent999Suspected() {
        return urgent999Suspected;
    }

    public void setUrgent999Suspected(boolean urgent999Suspected) {
        this.urgent999Suspected = urgent999Suspected;
    }
}
