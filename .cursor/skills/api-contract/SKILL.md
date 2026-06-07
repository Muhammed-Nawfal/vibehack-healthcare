---
name: api-contract
description: >
  Mira REST API contract including endpoint definitions, request/response JSON schemas, session
  state model, LLM integration spec, and CORS configuration. Use when implementing backend
  controllers, services, or frontend API calls for the Mira triage system.
---

# Mira API Contract

## Base URL

`/api/triage` — all endpoints are under this prefix.

## Endpoints

### POST /api/triage/sessions

Creates a new triage session. Returns the session ID and the first question (global 999 safety screen).

**Request:**
```json
{
  "gestationWeeks": 30,
  "isPostnatal": false,
  "freeText": "I haven't felt my baby move much today"
}
```

**Response (200):**
```json
{
  "sessionId": "uuid-string",
  "firstQuestion": {
    "questionId": "g999_1",
    "text": "Heavy bleeding with severe tummy pain?",
    "type": "yes_no",
    "isSafetyScreen": true,
    "screenProgress": { "current": 1, "total": 5 }
  }
}
```

If `freeText` is provided, the backend calls the LLM intake interpretation and includes the result in the session state. The `primaryCluster` pre-selects the complaint chip.

### POST /api/triage/sessions/{id}/answers

Submits an answer for the current question. Returns either the next question or a final disposition.

**Request:**
```json
{
  "questionId": "rfm_1",
  "answer": "no_movement"
}
```

**Response — next question (200):**
```json
{
  "nextQuestion": {
    "questionId": "rfm_2",
    "text": "When did you notice the change?",
    "type": "single_select",
    "options": [
      { "label": "Last few hours / today", "value": "recent" },
      { "label": "Yesterday or longer", "value": "delayed" }
    ],
    "branch": "RFM",
    "progress": { "current": 2, "total": 3 }
  }
}
```

**Response — disposition reached (200):**
```json
{
  "disposition": {
    "urgencyLevel": "MAT_TRIAGE_NOW",
    "pathwayName": "Call your maternity triage line",
    "patientMessage": "These are symptoms your maternity team will always want to check promptly...",
    "safetyNetting": "Call 999 right away if...",
    "pathwayAction": "call",
    "phoneNumber": "PLACEHOLDER-000-000"
  }
}
```

### GET /api/triage/sessions/{id}/result

Returns the patient-facing disposition. Only available after all questions are answered.

**Response (200):**
```json
{
  "urgencyLevel": "MAT_TRIAGE_NOW",
  "pathwayName": "Call your maternity triage line",
  "patientMessage": "These are symptoms your maternity team will always want to check promptly. Call your maternity triage line now — it's open day and night. Don't wait until morning. You are not wasting their time.",
  "safetyNetting": "Call 999 right away if you experience heavy bleeding, severe pain, fainting, or your baby stops moving altogether.",
  "pathwayAction": "call",
  "phoneNumber": "PLACEHOLDER-000-000"
}
```

### GET /api/triage/sessions/{id}/clinician-summary

Returns the SBAR clinician summary. Only accessible via the separate clinician route. NEVER surfaced in patient flow.

**Response (200):**
```json
{
  "situation": "30-week primigravida reporting reduced fetal movements since earlier today.",
  "background": "No previous episodes of reduced movements reported. No other symptoms initially volunteered.",
  "assessment": "Reduced fetal movements, onset within last few hours. Red-flag sweep negative for bleeding, negative for headache/vision/swelling. No 999 triggers identified.",
  "recommendation": "Attend maternity triage unit for assessment including CTG. Advise to call triage line immediately if movements stop completely.",
  "urgencyLevel": "MAT_TRIAGE_NOW",
  "recommendedAction": "Call maternity triage line — PLACEHOLDER-000-000",
  "timestamp": "2026-06-07T02:30:00Z"
}
```

## Session State Model

The backend holds session state in memory (no database for prototype):

```json
{
  "sessionId": "uuid",
  "gestationWeeks": 30,
  "isPostnatal": false,
  "primaryCluster": "RFM",
  "freeText": null,
  "answers": [
    { "questionId": "rfm_1", "answer": "no_movement", "flags": ["no_movement"] }
  ],
  "flags": ["no_movement"],
  "sweepAnswers": [],
  "disposition": null,
  "llmInterpretation": null,
  "llmSbar": null,
  "createdAt": "2026-06-07T02:25:00Z"
}
```

## LLM Integration

Both LLM calls happen in the backend only. Frontend never sees the API key.

### Intake Interpretation

Triggered when `freeText` is provided at session creation.

- **Endpoint**: Chat completions (OpenAI-compatible)
- **Env vars**: `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`
- **Temperature**: 0.2
- **Force JSON output**: Yes
- **Returns**: `{ primaryCluster, additionalClusters, extractedSignals, urgent999Suspected }`
- If `urgent999Suspected` is true, the global 999 safety screen is shown first.

### SBAR Generation

Triggered when the disposition is reached and the clinician summary is requested.

- Same endpoint and env vars
- **Input**: gestation, postnatal, chosen complaint, all answers, flags, final disposition
- **Temperature**: 0.2
- **Force JSON output**: Yes
- **Returns**: `{ situation, background, assessment, recommendation }`

## CORS Configuration

Enable CORS so the frontend (localhost:5173) can call the backend (localhost:8080):

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:5173")
                .allowedMethods("GET", "POST")
                .allowedHeaders("*");
    }
}
```

For full JSON schema examples with all field types, see [schemas.md](schemas.md)
