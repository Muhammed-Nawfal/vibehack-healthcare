# Mira — Maternity Triage Companion

A gentle, mobile-first maternity symptom-triage prototype. A pregnant or
postnatal patient describes their concern in their own words; Mira asks a short
set of guided questions and routes them to the right NHS pathway (self-monitor,
GP, Early Pregnancy Unit, maternity triage, or 999).

> **Hackathon prototype — synthetic data only.** All phone numbers are clearly
> marked `PLACEHOLDER` values. This is guidance, not a diagnosis. In an
> emergency, call 999.

## Architecture

| Layer | Stack |
|-------|-------|
| Frontend | Vite + React 19 + TypeScript, React Router, mobile-first (centred, max-width ~480px) |
| Backend | Java 17+ (built/tested on 21) + Spring Boot 3.5, in-memory session store |
| LLM | z.ai GLM — used for **two** narrow jobs only (see Safety) |

### Clinical safety model (non-negotiable)

- **The deterministic `TriageRulesEngine` — never the LLM — decides urgency and
  disposition.** When inputs are ambiguous it always escalates to the higher level.
- The LLM has exactly two touch-points: (1) intake interpretation (free text →
  symptom cluster) and (2) the clinician SBAR note. Neither decides urgency.
- Patient screens never show a diagnosis, condition name, cluster, or flag —
  only urgency, pathway, a calm instruction, and safety-netting.
- The clinician SBAR lives only on the separate `/clinician` route and is never
  linked from the patient flow.
- Every patient screen shows: *"This is guidance, not a diagnosis. In an
  emergency, call 999."*

## Screens & routes

| Route | Screen |
|-------|--------|
| `/` | Welcome |
| `/triage/gestation` | Weeks pregnant / postnatal toggle / nearest unit picker |
| `/triage` | Main concern (free text + voice) |
| `/triage/questions` | Guided question flow (999 safety screen → cluster → branch → red-flag sweep) |
| `/triage/result` | Patient-facing disposition + tap-to-call |
| `/clinician?session=<id>` | Clinician-only SBAR summary (separate, not linked) |

## API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/trusts` | List synthetic trusts for the unit picker |
| `POST` | `/api/triage/sessions` | Create a session; runs LLM intake interpretation |
| `POST` | `/api/triage/sessions/{id}/answers` | Run the deterministic rules engine → disposition |
| `GET` | `/api/triage/sessions/{id}/clinician-summary` | SBAR note (409 if triage not complete) |

## Running locally

### Backend

```bash
cd backend
./mvnw spring-boot:run
```

Runs on `http://localhost:8080`. It starts and works **without** an LLM key —
intake falls back to the `OTHER` cluster and the clinician SBAR uses a
deterministic summary built from the recorded session data.

Requires a JDK 17+ on the `PATH` (`JAVA_HOME` set). For example with a Homebrew
OpenJDK 21:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173` and talks to the backend at
`http://localhost:8080/api` by default.

## Environment variables

### Backend

| Var | Default | Purpose |
|-----|---------|---------|
| `ZAI_API_KEY` | _(empty)_ | z.ai GLM key. **Never commit this.** If unset, the app degrades gracefully. |
| `ZAI_MODEL` | `glm-5.1` | z.ai model name. |
| `CORS_ALLOWED_ORIGIN_PATTERNS` | `http://localhost:*` | Comma-separated allowed frontend origins/patterns. |

You can instead drop secrets into the git-ignored
`backend/config/local.properties` (see `local.properties.example`):

```properties
zai.api-key=your-key-here
zai.model=glm-5.1
```

Example with env vars:

```bash
ZAI_API_KEY=sk-... ZAI_MODEL=glm-5.1 \
CORS_ALLOWED_ORIGIN_PATTERNS=https://mira.example.com \
./mvnw spring-boot:run
```

### Frontend

| Var | Default | Purpose |
|-----|---------|---------|
| `VITE_API_BASE_URL` | `http://localhost:8080/api` (dev) | Backend API base URL. |

## Demo paths

All four work by tapping through the UI:

1. **Reassuring** — Trust A, 30 weeks → *"I've had a headache since this
   morning"* → confirm *Headache/vision/swelling* → all "No" → **GP_ROUTINE**.
2. **Escalating** — same start, answer 3+ pre-eclampsia questions "Yes" →
   **EMERGENCY_999**. Then open `/clinician?session=<id>` for the SBAR.
3. **Bleeding emergency** — Trust A, 28 weeks → *"I'm bleeding"* → confirm
   *Bleeding* → soaking + severe pain → **EMERGENCY_999**.
4. **Gestation gating to EPU** — Trust B (triage from 18 weeks), 14 weeks →
   *"baby not moving"* → confirm *Baby moving less* → less than usual →
   rules engine routes 14-week MAT_TRIAGE_NOW down to the **EPU** pathway.

## Synthetic trusts

| Id | Name | Maternity triage | EPU |
|----|------|------------------|-----|
| `trust_a` | City Maternity Hospital | `PLACEHOLDER-111-001` (from 16 wks) | `PLACEHOLDER-111-002` (5–16 wks) |
| `trust_b` | Riverside Women's Unit | `PLACEHOLDER-222-001` (from 18 wks) | `PLACEHOLDER-222-002` (5–18 wks) |
| `trust_c` | Northern Maternity Centre | `PLACEHOLDER-333-001` (from 16 wks) | `PLACEHOLDER-333-002` (5–16 wks) |
