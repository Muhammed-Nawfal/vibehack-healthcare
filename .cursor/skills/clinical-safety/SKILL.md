---
name: clinical-safety
description: >
  Enforce Mira clinical safety constraints, patient-facing copy rules, disposition templates,
  and the over-escalation policy. Use when building patient-facing screens, result displays,
  clinician views, LLM prompts, or any code that handles triage answers and routing.
---

# Mira Clinical Safety

## Core Constraints Checklist

Before any patient-facing screen ships, verify:

- [ ] No diagnosis, differential, or condition name visible to patient
- [ ] No internal flags or cluster names in patient-facing JSON or UI
- [ ] Clinician SBAR summary is on a separate route, not reachable from patient flow
- [ ] LLM never decides urgency or disposition
- [ ] Over-escalation applied: ambiguous answers route UP
- [ ] Disclaimer present: "This is guidance, not a diagnosis. In an emergency, call 999."
- [ ] Safety-netting text included on every disposition result
- [ ] Only placeholder phone numbers used

## Urgency Hierarchy

```
SELF_MONITOR < GP_ROUTINE < EPU < MAT_TRIAGE_NOW < EMERGENCY_999
```

Always resolve to the HIGHEST urgency reached across all answers and the red-flag sweep.

## Patient-Facing Copy Per Disposition

Use these verbatim. NO condition names, urgency + pathway only.

**EMERGENCY_999:**
- Message: "This needs emergency care now. Please call 999, or ask someone to call for you. Tell them how many weeks pregnant you are."
- Pathway: "Call 999 now"

**MAT_TRIAGE_NOW:**
- Message: "These are symptoms your maternity team will always want to check promptly. Call your maternity triage line now — it's open day and night. Don't wait until morning. You are not wasting their time."
- Pathway: "Call your maternity triage line"

**EPU:**
- Message: "Because you're in early pregnancy, contact the Early Pregnancy Unit, your GP, or NHS 111 today."
- Pathway: "Early Pregnancy Unit / GP / 111"

**GP_ROUTINE:**
- Message: "This doesn't look urgent right now, but speak to your GP or midwife in the next day or two."
- Pathway: "GP / midwife"

**SELF_MONITOR:**
- Message: "This can usually be monitored at home for now — but trust your instincts and call maternity triage straight away if anything changes."
- Pathway: "Self-monitor"

All dispositions also include a safety-netting line: "Call 999 right away if..."

## Gestation Gating

- Under 16 weeks: MAT_TRIAGE_NOW redirects to EPU (Early Pregnancy Unit / GP / 111)
- 16 weeks to birth: MAT_TRIAGE_NOW is the hub
- Postnatal (last ~6 weeks): maternity triage if reachable, else 111; emergency signs still go to 999

## Global 999 Triggers

If ANY of these are true at the safety screen, short-circuit to EMERGENCY_999:
- Heavy bleeding (soaking a pad or passing clots) together with severe tummy pain
- Severe chest pain, or trouble breathing while resting
- Fainting, collapsing, or a fit (seizure)
- A painful, red, swollen leg
- Sudden, severe tummy pain that will not ease

## LLM Safety Boundaries

- LLM intake interpretation returns structured JSON only: `{ primaryCluster, additionalClusters, extractedSignals, urgent999Suspected }`
- LLM SBAR generation returns structured JSON only: `{ situation, background, assessment, recommendation }`
- System prompts must state: you do NOT diagnose or decide urgency; you never speak to the patient

For full clinical logic details, see [constraints-reference.md](constraints-reference.md)
