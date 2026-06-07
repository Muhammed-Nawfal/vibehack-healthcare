package com.mira.backend.trust;

import java.util.List;

/**
 * A synthetic NHS maternity trust. All phone numbers are clearly-marked
 * PLACEHOLDER values -- there is no real patient or service data here.
 *
 * <p>The week thresholds drive the deterministic gestation gating in the rules
 * engine (e.g. routing early-pregnancy concerns to an Early Pregnancy Unit).
 */
public record Trust(
        String id,
        String name,
        String maternityTriagePhone,
        int maternityTriageFromWeeks,
        String epuPhone,
        int epuFromWeeks,
        int epuToWeeks,
        int postnatalUpToWeeks,
        List<String> nearbyTrustIds) {
}
