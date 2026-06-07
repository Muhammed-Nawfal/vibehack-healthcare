package com.mira.backend.dto;

/**
 * Public, patient-safe view of a trust for the frontend picker. Only the id and
 * display name are exposed -- internal week thresholds stay server-side.
 */
public record TrustSummary(String id, String name) {
}
