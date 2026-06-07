# API Contract — Full JSON Schemas

## Create Session Request

```json
{
  "gestationWeeks": {
    "type": "integer",
    "required": true,
    "minimum": 0,
    "description": "Weeks of gestation. 0 if postnatal."
  },
  "isPostnatal": {
    "type": "boolean",
    "required": true,
    "description": "True if given birth in the last 6 weeks"
  },
  "freeText": {
    "type": "string | null",
    "required": false,
    "description": "Optional free-text description of concern. Triggers LLM intake interpretation if provided."
  }
}
```

## Create Session Response

```json
{
  "sessionId": {
    "type": "string (UUID)",
    "description": "Unique session identifier"
  },
  "firstQuestion": {
    "type": "object",
    "description": "The first question to display (global 999 safety screen)",
    "shape": {
      "questionId": "string",
      "text": "string",
      "type": "'yes_no' | 'single_select' | 'multi_select'",
      "isSafetyScreen": "boolean",
      "screenProgress": { "current": "number", "total": "number" }
    }
  }
}
```

## Submit Answer Request

```json
{
  "questionId": {
    "type": "string",
    "required": true,
    "description": "The ID of the question being answered"
  },
  "answer": {
    "type": "string",
    "required": true,
    "description": "The selected answer value (matches option.value from the question)"
  }
}
```

## Submit Answer Response — Next Question Variant

```json
{
  "nextQuestion": {
    "questionId": "string",
    "text": "string",
    "type": "'yes_no' | 'single_select'",
    "options": [
      { "label": "string (display text)", "value": "string (machine value)" }
    ],
    "branch": "'RFM' | 'PREECLAMPSIA' | 'BLEEDING' | 'SWEEP' | null",
    "progress": { "current": "number", "total": "number" },
    "isSweep": "boolean (true if this is a red-flag sweep question)"
  }
}
```

## Submit Answer Response — Disposition Variant

```json
{
  "disposition": {
    "urgencyLevel": "'SELF_MONITOR' | 'GP_ROUTINE' | 'EPU' | 'MAT_TRIAGE_NOW' | 'EMERGENCY_999'",
    "pathwayName": "string",
    "patientMessage": "string",
    "safetyNetting": "string",
    "pathwayAction": "'call' | 'self_monitor' | 'visit'",
    "phoneNumber": "string (PLACEHOLDER)"
  }
}
```

## Patient Result Response

```json
{
  "urgencyLevel": "'SELF_MONITOR' | 'GP_ROUTINE' | 'EPU' | 'MAT_TRIAGE_NOW' | 'EMERGENCY_999'",
  "pathwayName": "string — e.g. 'Call your maternity triage line'",
  "patientMessage": "string — calm, no condition names",
  "safetyNetting": "string — 'Call 999 right away if...'",
  "pathwayAction": "'call' | 'self_monitor' | 'visit'",
  "phoneNumber": "string (PLACEHOLDER)"
}
```

## Clinician Summary Response

```json
{
  "situation": "string — who, gestation, presenting complaint",
  "background": "string — relevant history, what prompted contact",
  "assessment": "string — answers, flags, clusters triggered",
  "recommendation": "string — disposition and recommended action",
  "urgencyLevel": "'SELF_MONITOR' | 'GP_ROUTINE' | 'EPU' | 'MAT_TRIAGE_NOW' | 'EMERGENCY_999'",
  "recommendedAction": "string — e.g. 'Call maternity triage line'",
  "timestamp": "string (ISO 8601)"
}
```

## LLM Intake Interpretation Response Schema

```json
{
  "primaryCluster": "'RFM' | 'PREECLAMPSIA' | 'BLEEDING' | 'OTHER'",
  "additionalClusters": ["string — cluster IDs"],
  "extractedSignals": {
    "type": "object",
    "description": "Key-value pairs of signals extracted from free text, e.g. { 'pain': true, 'bleeding': false }"
  },
  "urgent999Suspected": {
    "type": "boolean",
    "description": "If true, show global 999 safety screen first"
  }
}
```

## LLM SBAR Generation Response Schema

```json
{
  "situation": "string",
  "background": "string",
  "assessment": "string",
  "recommendation": "string"
}
```

## Error Responses

All endpoints may return:

```json
{
  "status": 400 | 404 | 500,
  "error": "string — error type",
  "message": "string — human-readable description"
}
```

| Code | Meaning |
|------|---------|
| 400 | Invalid request body or answer value |
| 404 | Session not found |
| 500 | Internal error (including LLM call failure) |

## Frontend API Base URL

Configured via `VITE_API_BASE_URL` env var (default: `http://localhost:8080/api`).
