package com.mira.backend.trust;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Hard-coded registry of synthetic maternity trusts (no database). All phone
 * numbers are PLACEHOLDER values. Used by the gestation-gating step of the
 * deterministic rules engine and exposed (id + name) to the frontend trust
 * picker via {@code GET /api/trusts}.
 */
public final class TrustRegistry {

    private static final Map<String, Trust> TRUSTS = new LinkedHashMap<>();

    static {
        register(new Trust(
                "trust_a",
                "City Maternity Hospital",
                "PLACEHOLDER-111-001",
                16,
                "PLACEHOLDER-111-002",
                5,
                16,
                6,
                List.of("trust_b", "trust_c")));

        register(new Trust(
                "trust_b",
                "Riverside Women's Unit",
                "PLACEHOLDER-222-001",
                18,
                "PLACEHOLDER-222-002",
                5,
                18,
                8,
                List.of("trust_a", "trust_c")));

        register(new Trust(
                "trust_c",
                "Northern Maternity Centre",
                "PLACEHOLDER-333-001",
                16,
                "PLACEHOLDER-333-002",
                5,
                16,
                6,
                List.of("trust_a", "trust_b")));
    }

    private TrustRegistry() {
    }

    private static void register(Trust trust) {
        TRUSTS.put(trust.id(), trust);
    }

    /** All trusts in registration order. */
    public static List<Trust> all() {
        return List.copyOf(TRUSTS.values());
    }

    /** Looks up a single trust by id. */
    public static Optional<Trust> find(String trustId) {
        return Optional.ofNullable(TRUSTS.get(trustId));
    }

    /**
     * Resolves a trust by id, defaulting to the first registered trust if the id
     * is unknown or null. Over-escalation principle: never fail to produce a
     * usable contact for the patient.
     */
    public static Trust findOrDefault(String trustId) {
        if (trustId != null) {
            Trust match = TRUSTS.get(trustId);
            if (match != null) {
                return match;
            }
        }
        return TRUSTS.values().iterator().next();
    }

    /** Resolves a list of trust ids, skipping any that are unknown. */
    public static List<Trust> find(List<String> trustIds) {
        if (trustIds == null) {
            return List.of();
        }
        return trustIds.stream()
                .map(TRUSTS::get)
                .filter(t -> t != null)
                .collect(Collectors.toList());
    }
}
