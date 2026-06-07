---
name: triage-logic
description: >
  Mira triage decision-tree logic, question flows, answer-to-disposition mappings, flag system,
  and red-flag sweep rules. Use when implementing the adaptive question screens, the rules engine,
  session state handling, or any backend logic that routes from answers to urgency dispositions.
---

# Mira Triage Logic

## Flow Overview

```
Welcome → Gestation → Main Concern → Adaptive Questions (branch) → Red-Flag Sweep → Result
```

## Gestation Gating (Q1)

Captured at screen 2. Determines routing adjustments:
- Under 16 weeks: MAT_TRIAGE_NOW → EPU
- 16 weeks to birth: MAT_TRIAGE_NOW as-is
- Postnatal (toggle "I've given birth in the last 6 weeks"): maternity triage if reachable, else 111; 999 signs still → 999

## Main Concern (Screen 3)

Tappable symptom chips:
- Baby moving less → RFM branch
- Headache or vision changes → PREECLAMPSIA branch
- Bleeding or fluid → BLEEDING branch
- Pain / Feeling unwell / Something else → handled by LLM intake interpretation or OTHER

Plus optional free-text "describe it in your own words" field. If filled, LLM intake interpretation runs to map to a cluster.

## Complaint Branches

### A: RFM (Baby moving less)

Base disposition: MAT_TRIAGE_NOW. Never SELF_MONITOR.

| # | Question | Answers | Disposition / Flag |
|---|----------|---------|-------------------|
| 1 | Can you feel your baby moving at all right now? | No movement at all | MAT_TRIAGE_NOW (flag: no_movement) |
|   |  | Less than usual / different pattern | MAT_TRIAGE_NOW |
|   |  | Feels normal for my baby | GP_ROUTINE |
| 2 | When did you notice the change? | Last few hours / today | MAT_TRIAGE_NOW |
|   |  | Yesterday or longer | MAT_TRIAGE_NOW (flag: delayed_presentation) |
| 3 | Have you contacted your maternity team about movements before this pregnancy? | Yes | MAT_TRIAGE_NOW (flag: recurrent_rfm) |
|   |  | No | MAT_TRIAGE_NOW |

### B: PREECLAMPSIA (Headache, vision changes, swelling)

Base disposition: GP_ROUTINE. Any single "Yes" → MAT_TRIAGE_NOW. 3+ "Yes" → EMERGENCY_999.

| # | Question | Yes → |
|---|----------|-------|
| 1 | Headache that won't go away with rest, water or paracetamol? | MAT_TRIAGE_NOW (flag: severe_headache) |
| 2 | Changes to your vision — blurring, flashing lights or spots? | MAT_TRIAGE_NOW (flag: visual_disturbance) |
| 3 | Sudden swelling of your face, hands or fingers? | MAT_TRIAGE_NOW (flag: sudden_swelling) |
| 4 | Pain just below your ribs, especially on the right? | MAT_TRIAGE_NOW (flag: epigastric_pain) |
| 5 | Do you feel very unwell in yourself? | MAT_TRIAGE_NOW (flag: feels_very_unwell) |

Count positives. >= 3 → EMERGENCY_999.
Postnatal/unreachable maternity triage → 111.

### C: BLEEDING (Bleeding or fluid leaking)

Base disposition: MAT_TRIAGE_NOW.

| # | Question | Answers | Disposition / Flag |
|---|----------|---------|-------------------|
| 1 | How much bleeding? | Spotting | MAT_TRIAGE_NOW |
|   |  | Needs a pad | MAT_TRIAGE_NOW |
|   |  | Soaking through a pad / clots | MAT_TRIAGE_NOW (flag: heavy_bleeding) |
| 2 | Pain with the bleeding? | No / mild | MAT_TRIAGE_NOW |
|   |  | Severe constant pain | MAT_TRIAGE_NOW (flag: severe_pain) |
| 3 | Leaking fluid? | No | MAT_TRIAGE_NOW |
|   |  | Clear/straw-coloured | MAT_TRIAGE_NOW (flag: possible_waters) |
|   |  | Green/brown | MAT_TRIAGE_NOW (flag: discoloured_fluid) |

**Combination rule**: `heavy_bleeding` AND `severe_pain` → EMERGENCY_999.

## Red-Flag Sweep

After the chosen complaint branch completes, ask one question for each OTHER cluster. A positive raises disposition to at least MAT_TRIAGE_NOW.

| Target Cluster | Sweep Question | Positive Answer |
|---------------|----------------|-----------------|
| Bleeding | Any bleeding or fluid leaking? | Yes → MAT_TRIAGE_NOW |
| Pre-eclampsia | Any headache that won't shift, vision changes, or sudden swelling? | Yes → MAT_TRIAGE_NOW |
| RFM | Have your baby's movements been normal for you today? | No → MAT_TRIAGE_NOW |

## Global 999 Safety Screen

Ask up front. If ANY are true, short-circuit to EMERGENCY_999:
- Heavy bleeding + severe tummy pain
- Severe chest pain / trouble breathing at rest
- Fainting, collapsing, or seizure
- Painful, red, swollen leg
- Sudden severe tummy pain that won't ease

For the full decision tree as structured data, see [decision-tree.md](decision-tree.md)
