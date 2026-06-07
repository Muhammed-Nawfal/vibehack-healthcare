---
name: design-language
description: >
  Mira visual design language including color tokens, typography, spacing, component patterns,
  microcopy tone, and CSS conventions. Use when building or styling any UI component, screen,
  or layout for the Mira maternity triage app.
---

# Mira Design Language

Vibe: pure, soft, warm, reassuring, low-anxiety. Avoid generic AI styling.

## Color Tokens

### Backgrounds & Surfaces

| Token | Hex | CSS Variable | Usage |
|-------|-----|-------------|-------|
| pearl | #FBF7F2 | `--color-bg-pearl` | Primary page background |
| warm-white | #FFFDF9 | `--color-bg-warm` | Card/surface background |
| soft-tan | #EFE3D4 | `--color-surface-soft` | Elevated surface, secondary cards |
| tan | #E8D9C5 | `--color-surface-tan` | Borders, dividers, subtle surface |

### Accent & Text

| Token | Hex | CSS Variable | Usage |
|-------|-----|-------------|-------|
| terracotta | #D98E5A | `--color-accent` | Primary accent, buttons, links |
| terracotta-dark | #C97B5A | `--color-accent-dark` | Accent hover/active states |
| warm-brown | #4A3F35 | `--color-text` | Body text, headings |

### Urgency Colors

| Level | Token | Hex | CSS Variable |
|-------|-------|-----|-------------|
| Low | sage | #8DA888 | `--color-urgency-low` |
| Medium | amber | #E0A458 | `--color-urgency-medium` |
| Emergency | coral-red | #C56B5C | `--color-urgency-emergency` |

## Typography

- **Headings**: rounded display serif (e.g. Fraunces, DM Serif Display) — subject to change
- **Body**: clean rounded sans (e.g. Nunito) — subject to change
- Large, friendly, readable sizing. Generous line-height (1.5+ for body, 1.2+ for headings).

## Spacing & Layout

- Responsive design: UI adapts to both mobile and desktop screen sizes
- Generous spacing: use 16px/24px/32px/48px scale
- Card padding: 24px
- Section gaps: 32px

## Component Patterns

### Urgency Badge
- Pill shape with rounded corners (20px radius)
- Background: urgency color at 15% opacity
- Text: urgency color at full opacity
- Label text: "Low", "Medium", "Emergency" (patient-safe, no condition names)

### Pathway Card
- Rounded card (16-24px corners)
- Warm-white background
- Soft diffuse shadow
- Pathway name as heading, action button below
- Call button uses terracotta accent

### Symptom Chips
- Rounded pill buttons (24px radius)
- Soft-tan background, warm-brown text
- Selected state: terracotta background, warm-white text
- Large tap targets (min 44px height)

### Progress Indicator
- Simple step dots or thin bar
- Soft-tan for incomplete, terracotta for complete
- No percentage text (reduces anxiety)

### Question Screen
- One question per screen
- Large, readable question text (heading font)
- Answer options as large tappable cards or buttons
- Calm progress indicator at top
- "Back" option available but not prominent

## Shadows

- Soft diffuse only. No hard or sharp shadows.
- Card shadow: `0 2px 8px rgba(74, 63, 53, 0.08)`
- Elevated shadow: `0 4px 16px rgba(74, 63, 53, 0.12)`

## Border Radius

- Cards: 16-24px
- Buttons: 12-16px
- Chips/pills: 20-24px
- Inputs: 12px

## Transitions

- Gentle: 200-300ms ease
- No bouncing or overshooting animations
- Fade between screens rather than slide

## Microcopy Tone

- Warm and human: "We're here to help" not "System ready"
- Reassuring: "You're not wasting anyone's time" on triage prompts
- No clinical jargon in patient views
- No alarming language except for 999 emergencies

For annotated component markup examples, see [examples.md](examples.md)
