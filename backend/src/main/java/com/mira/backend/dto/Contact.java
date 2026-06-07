package com.mira.backend.dto;

/**
 * A maternity contact shown to the patient: a friendly name and a (PLACEHOLDER)
 * phone number to tap-to-call. Never contains clinical detail.
 */
public record Contact(String trustName, String phoneNumber) {
}
