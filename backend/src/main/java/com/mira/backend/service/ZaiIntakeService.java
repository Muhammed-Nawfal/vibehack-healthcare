package com.mira.backend.service;

import ai.z.openapi.ZaiClient;
import ai.z.openapi.service.model.ChatCompletionCreateParams;
import ai.z.openapi.service.model.ChatCompletionResponse;
import ai.z.openapi.service.model.ChatMessage;
import ai.z.openapi.service.model.ChatMessageRole;
import ai.z.openapi.service.model.ResponseFormat;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mira.backend.dto.IntakeInterpretation;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Set;

/**
 * Intake interpretation via the z.ai (GLM) Java SDK.
 *
 * <p>SAFETY: the LLM ONLY maps free text to a triage cluster. It never decides
 * urgency, disposition, or pathway, and never produces patient-facing text. If
 * the key is missing or the model misbehaves, we fall back to the OTHER cluster
 * and let the deterministic rules engine over-escalate downstream.
 */
@Service
public class ZaiIntakeService {

    private static final Logger log = LoggerFactory.getLogger(ZaiIntakeService.class);

    private static final Set<String> ALLOWED_CLUSTERS =
            Set.of("RFM", "PREECLAMPSIA", "BLEEDING", "OTHER");

    private static final String SYSTEM_PROMPT = """
            You are a clinical intake classifier for a UK maternity triage tool called Mira.
            You do NOT diagnose, you do NOT decide urgency or disposition, and you NEVER speak to the patient.
            Your only job is to read the patient's free-text description and map it to ONE primary symptom cluster.

            Allowed clusters:
            - RFM: reduced, less, or changed fetal movements ("baby moving less / not moving").
            - PREECLAMPSIA: headache, vision changes (blurring, flashing lights, spots), sudden swelling of face/hands/fingers, pain just below the ribs, or feeling very unwell in oneself.
            - BLEEDING: vaginal bleeding, spotting, passing clots, or leaking fluid / waters.
            - OTHER: anything that does not clearly fit the clusters above.

            Also list any additionalClusters that are plausibly present, extract a few short key signals,
            and set urgent999Suspected to true ONLY if the text strongly suggests a life-threatening emergency
            (heavy bleeding with severe tummy pain, severe chest pain or trouble breathing at rest,
            fainting / collapse / seizure, a painful red swollen leg, or sudden severe tummy pain that will not ease).

            Return ONLY a JSON object, no markdown fences and no commentary, with exactly this shape:
            {"primaryCluster":"RFM|PREECLAMPSIA|BLEEDING|OTHER","additionalClusters":["..."],"extractedSignals":{"key":"value"},"urgent999Suspected":false}
            """;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final String apiKey;
    private final String model;

    private ZaiClient client;

    public ZaiIntakeService(
            @Value("${zai.api-key:}") String apiKey,
            @Value("${zai.model:glm-5.1}") String model) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = (model == null || model.isBlank()) ? "glm-5.1" : model.trim();
    }

    @PostConstruct
    void init() {
        if (apiKey.isBlank()) {
            log.warn("ZAI_API_KEY is not set -- intake interpretation will fall back to OTHER. "
                    + "Set ZAI_API_KEY (env var or backend/config/local.properties) to enable the LLM.");
            return;
        }
        try {
            this.client = ZaiClient.builder()
                    .ofZAI()
                    .apiKey(apiKey)
                    .build();
            log.info("z.ai intake client initialised (model={}).", model);
        } catch (Throwable t) {
            // Never let client setup crash the app -- degrade to the safe fallback.
            this.client = null;
            log.error("Failed to initialise z.ai client -- intake will fall back to OTHER: {}",
                    t.toString());
        }
    }

    /**
     * Maps the patient's free text to a triage cluster. Never throws -- always
     * returns a usable interpretation (safe OTHER fallback on any problem).
     */
    public IntakeInterpretation interpret(String freeText) {
        if (client == null) {
            return IntakeInterpretation.safeFallback();
        }
        try {
            ChatCompletionCreateParams request = ChatCompletionCreateParams.builder()
                    .model(model)
                    .messages(Arrays.asList(
                            ChatMessage.builder()
                                    .role(ChatMessageRole.SYSTEM.value())
                                    .content(SYSTEM_PROMPT)
                                    .build(),
                            ChatMessage.builder()
                                    .role(ChatMessageRole.USER.value())
                                    .content(freeText)
                                    .build()))
                    .doSample(true)
                    .temperature(0.2f)
                    .responseFormat(ResponseFormat.builder().type("json_object").build())
                    .stream(false)
                    .build();

            ChatCompletionResponse response = client.chat().createChatCompletion(request);

            if (response == null || !response.isSuccess() || response.getData() == null
                    || response.getData().getChoices() == null
                    || response.getData().getChoices().isEmpty()) {
                log.warn("z.ai intake call failed: {}", response == null ? "null response" : response.getMsg());
                return IntakeInterpretation.safeFallback();
            }

            Object content = response.getData().getChoices().get(0).getMessage().getContent();
            String json = extractJson(content == null ? null : content.toString());
            if (json == null) {
                return IntakeInterpretation.safeFallback();
            }

            IntakeInterpretation interpretation = objectMapper.readValue(json, IntakeInterpretation.class);
            interpretation.setPrimaryCluster(normalizeCluster(interpretation.getPrimaryCluster()));
            return interpretation;
        } catch (Exception e) {
            log.warn("z.ai intake interpretation error, using safe fallback: {}", e.getMessage());
            return IntakeInterpretation.safeFallback();
        }
    }

    /** Pulls the JSON object out of the model output, tolerating stray text or code fences. */
    private String extractJson(String raw) {
        if (raw == null) {
            return null;
        }
        int start = raw.indexOf('{');
        int end = raw.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return raw.substring(start, end + 1);
        }
        return null;
    }

    private String normalizeCluster(String cluster) {
        if (cluster == null) {
            return "OTHER";
        }
        String upper = cluster.trim().toUpperCase();
        return ALLOWED_CLUSTERS.contains(upper) ? upper : "OTHER";
    }
}
