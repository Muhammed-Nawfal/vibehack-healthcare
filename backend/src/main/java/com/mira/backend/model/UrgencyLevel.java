package com.mira.backend.model;

/**
 * Triage urgency hierarchy, lowest to highest. Ordinal order encodes the
 * over-escalation policy: when combining signals we always keep the HIGHER
 * level. EPU sits between NHS_111 and MAT_TRIAGE_NOW and is only reached
 * via gestation gating, never via the max() comparison.
 *
 * Valid maternity pathways (GP_ROUTINE does not exist for maternity patients):
 *   NHS_111        — 111 for reassuring / too-early-for-EPU presentations
 *   EPU            — Early Pregnancy Unit (gestation-gated)
 *   MAT_TRIAGE_NOW — Maternity Assessment Unit / triage line
 *   EMERGENCY_999  — 999 / A&E
 */
public enum UrgencyLevel {
    NHS_111,
    EPU,
    MAT_TRIAGE_NOW,
    EMERGENCY_999;

    /** Returns whichever level is higher up the hierarchy. */
    public UrgencyLevel max(UrgencyLevel other) {
        return this.ordinal() >= other.ordinal() ? this : other;
    }
}
