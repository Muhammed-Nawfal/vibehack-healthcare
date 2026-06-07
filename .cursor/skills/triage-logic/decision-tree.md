# Triage Decision Tree — Structured Data

This file provides the complete decision tree in a structured format suitable for implementation.

## Session State Model

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
  "sweepAnswers": [
    { "questionId": "sweep_bleeding", "answer": "no", "flags": [] }
  ],
  "disposition": null,
  "llmInterpretation": null,
  "llmSbar": null
}
```

## Complete Question Catalog

### Global 999 Screen

```json
{
  "id": "global_999",
  "type": "multi_select",
  "questions": [
    { "id": "g999_1", "text": "Heavy bleeding with severe tummy pain?", "trigger": "EMERGENCY_999" },
    { "id": "g999_2", "text": "Severe chest pain or trouble breathing while resting?", "trigger": "EMERGENCY_999" },
    { "id": "g999_3", "text": "Fainting, collapsing, or a fit (seizure)?", "trigger": "EMERGENCY_999" },
    { "id": "g999_4", "text": "A painful, red, swollen leg?", "trigger": "EMERGENCY_999" },
    { "id": "g999_5", "text": "Sudden, severe tummy pain that will not ease?", "trigger": "EMERGENCY_999" }
  ]
}
```

### RFM Branch

```json
{
  "cluster": "RFM",
  "baseDisposition": "MAT_TRIAGE_NOW",
  "questions": [
    {
      "id": "rfm_1",
      "text": "Can you feel your baby moving at all right now?",
      "type": "single_select",
      "options": [
        { "label": "No movement at all", "value": "no_movement", "disposition": "MAT_TRIAGE_NOW", "flags": ["no_movement"] },
        { "label": "Less than usual / different pattern", "value": "less_than_usual", "disposition": "MAT_TRIAGE_NOW", "flags": [] },
        { "label": "Feels normal for my baby", "value": "feels_normal", "disposition": "GP_ROUTINE", "flags": [] }
      ]
    },
    {
      "id": "rfm_2",
      "text": "When did you notice the change?",
      "type": "single_select",
      "options": [
        { "label": "Last few hours / today", "value": "recent", "disposition": "MAT_TRIAGE_NOW", "flags": [] },
        { "label": "Yesterday or longer", "value": "delayed", "disposition": "MAT_TRIAGE_NOW", "flags": ["delayed_presentation"] }
      ]
    },
    {
      "id": "rfm_3",
      "text": "Have you contacted your maternity team about movements before this pregnancy?",
      "type": "single_select",
      "options": [
        { "label": "Yes", "value": "yes", "disposition": "MAT_TRIAGE_NOW", "flags": ["recurrent_rfm"] },
        { "label": "No", "value": "no", "disposition": "MAT_TRIAGE_NOW", "flags": [] }
      ]
    }
  ]
}
```

### PREECLAMPSIA Branch

```json
{
  "cluster": "PREECLAMPSIA",
  "baseDisposition": "GP_ROUTINE",
  "escalationRule": "any_single_yes => MAT_TRIAGE_NOW; count_yes >= 3 => EMERGENCY_999",
  "questions": [
    {
      "id": "prec_1",
      "text": "Headache that won't go away with rest, water or paracetamol?",
      "type": "yes_no",
      "yesDisposition": "MAT_TRIAGE_NOW",
      "yesFlags": ["severe_headache"],
      "countsPositive": true
    },
    {
      "id": "prec_2",
      "text": "Changes to your vision — blurring, flashing lights or spots?",
      "type": "yes_no",
      "yesDisposition": "MAT_TRIAGE_NOW",
      "yesFlags": ["visual_disturbance"],
      "countsPositive": true
    },
    {
      "id": "prec_3",
      "text": "Sudden swelling of your face, hands or fingers?",
      "type": "yes_no",
      "yesDisposition": "MAT_TRIAGE_NOW",
      "yesFlags": ["sudden_swelling"],
      "countsPositive": true
    },
    {
      "id": "prec_4",
      "text": "Pain just below your ribs, especially on the right?",
      "type": "yes_no",
      "yesDisposition": "MAT_TRIAGE_NOW",
      "yesFlags": ["epigastric_pain"],
      "countsPositive": true
    },
    {
      "id": "prec_5",
      "text": "Do you feel very unwell in yourself?",
      "type": "yes_no",
      "yesDisposition": "MAT_TRIAGE_NOW",
      "yesFlags": ["feels_very_unwell"],
      "countsPositive": true
    }
  ]
}
```

### BLEEDING Branch

```json
{
  "cluster": "BLEEDING",
  "baseDisposition": "MAT_TRIAGE_NOW",
  "combinationRule": "heavy_bleeding AND severe_pain => EMERGENCY_999",
  "questions": [
    {
      "id": "bleed_1",
      "text": "How much bleeding?",
      "type": "single_select",
      "options": [
        { "label": "Spotting", "value": "spotting", "disposition": "MAT_TRIAGE_NOW", "flags": [] },
        { "label": "Needs a pad", "value": "needs_pad", "disposition": "MAT_TRIAGE_NOW", "flags": [] },
        { "label": "Soaking through a pad / clots", "value": "soaking", "disposition": "MAT_TRIAGE_NOW", "flags": ["heavy_bleeding"] }
      ]
    },
    {
      "id": "bleed_2",
      "text": "Pain with the bleeding?",
      "type": "single_select",
      "options": [
        { "label": "No / mild", "value": "no_mild", "disposition": "MAT_TRIAGE_NOW", "flags": [] },
        { "label": "Severe constant pain", "value": "severe", "disposition": "MAT_TRIAGE_NOW", "flags": ["severe_pain"] }
      ]
    },
    {
      "id": "bleed_3",
      "text": "Leaking fluid?",
      "type": "single_select",
      "options": [
        { "label": "No", "value": "no", "disposition": "MAT_TRIAGE_NOW", "flags": [] },
        { "label": "Clear/straw-coloured", "value": "clear", "disposition": "MAT_TRIAGE_NOW", "flags": ["possible_waters"] },
        { "label": "Green/brown", "value": "green_brown", "disposition": "MAT_TRIAGE_NOW", "flags": ["discoloured_fluid"] }
      ]
    }
  ]
}
```

### Red-Flag Sweep

```json
{
  "id": "sweep",
  "questions": [
    { "id": "sweep_bleeding", "text": "Any bleeding or fluid leaking?", "type": "yes_no", "yesDisposition": "MAT_TRIAGE_NOW", "targetCluster": "BLEEDING" },
    { "id": "sweep_preeclampsia", "text": "Any headache that won't shift, vision changes, or sudden swelling?", "type": "yes_no", "yesDisposition": "MAT_TRIAGE_NOW", "targetCluster": "PREECLAMPSIA" },
    { "id": "sweep_rfm", "text": "Have your baby's movements been normal for you today?", "type": "yes_no_inverted", "yesDisposition": "MAT_TRIAGE_NOW", "targetCluster": "RFM", "note": "\"No\" triggers, not \"Yes\"" }
  ]
}
```

## Disposition Resolution Algorithm

```
1. Start with base disposition for the selected cluster
2. Walk through each answer in the branch:
   - If answer raises a flag, record it
   - If answer specifies a disposition higher than current, raise current
3. Check combination rules:
   - If flags include both heavy_bleeding AND severe_pain → EMERGENCY_999
   - If PREECLAMPSIA positive count >= 3 → EMERGENCY_999
4. Walk through red-flag sweep answers:
   - Any positive raises disposition to at least MAT_TRIAGE_NOW
5. Apply gestation gating:
   - If gestation < 16 weeks AND disposition == MAT_TRIAGE_NOW → EPU
6. Final disposition = max(current, any sweep-triggered level)
```

## Demo Happy Paths

### Path 1: Standard RFM
Welcome → 30 weeks → "Baby moving less" → rfm_1: "Less than usual" → rfm_2: "Last few hours" → rfm_3: "No" → sweep: all negative → MAT_TRIAGE_NOW (amber urgency) → consent to send → clinician SBAR view

### Path 2: Sweep Escalation
Welcome → 30 weeks → "Baby moving less" → rfm_1: "Less than usual" → rfm_2: "Recent" → rfm_3: "No" → sweep_bleeding: "No" → sweep_preeclampsia: "Yes" (headache/swelling) → MAT_TRIAGE_NOW (escalated by sweep) → clinician SBAR view

### Path 3: Emergency via Combination
Welcome → 28 weeks → "Bleeding or fluid" → bleed_1: "Soaking" (heavy_bleeding) → bleed_2: "Severe constant pain" (severe_pain) → EMERGENCY_999 (combination rule) → 999 screen
