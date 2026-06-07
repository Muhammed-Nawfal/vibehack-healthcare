package com.mira.backend.controller;

import com.mira.backend.dto.TrustSummary;
import com.mira.backend.trust.TrustRegistry;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Exposes the synthetic trust list so the gestation screen can populate its
 * "nearest maternity unit" picker without hard-coding trusts in the frontend.
 */
@RestController
@RequestMapping("/api/trusts")
public class TrustController {

    @GetMapping
    public List<TrustSummary> listTrusts() {
        return TrustRegistry.all().stream()
                .map(t -> new TrustSummary(t.id(), t.name()))
                .toList();
    }
}
