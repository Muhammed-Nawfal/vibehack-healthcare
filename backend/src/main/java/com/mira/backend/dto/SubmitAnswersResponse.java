package com.mira.backend.dto;

/** Wraps the disposition returned to the patient after the question flow. */
public record SubmitAnswersResponse(Disposition disposition) {
}
