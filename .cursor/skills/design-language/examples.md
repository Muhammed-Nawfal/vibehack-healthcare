# Design Language — Component Examples

## CSS Variable Setup

```css
:root {
  /* Backgrounds */
  --color-bg-pearl: #FBF7F2;
  --color-bg-warm: #FFFDF9;
  --color-surface-soft: #EFE3D4;
  --color-surface-tan: #E8D9C5;

  /* Accent */
  --color-accent: #D98E5A;
  --color-accent-dark: #C97B5A;
  --color-text: #4A3F35;

  /* Urgency */
  --color-urgency-low: #8DA888;
  --color-urgency-medium: #E0A458;
  --color-urgency-emergency: #C56B5C;

  /* Shadows */
  --shadow-card: 0 2px 8px rgba(74, 63, 53, 0.08);
  --shadow-elevated: 0 4px 16px rgba(74, 63, 53, 0.12);
}
```

## Urgency Badge

```tsx
<div style={{
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 16px',
  borderRadius: '20px',
  backgroundColor: `${urgencyColor}26`,  // 15% opacity
  color: urgencyColor,
  fontWeight: 600,
  fontSize: '14px',
}}>
  {urgencyLabel}
</div>
```

## Symptom Chip

```tsx
<button style={{
  padding: '12px 20px',
  borderRadius: '24px',
  border: 'none',
  backgroundColor: isSelected ? '#D98E5A' : '#EFE3D4',
  color: isSelected ? '#FFFDF9' : '#4A3F35',
  fontSize: '16px',
  fontWeight: 500,
  minHeight: '44px',
  cursor: 'pointer',
  transition: 'all 200ms ease',
}}>
  {label}
</button>
```

## Pathway Card

```tsx
<div style={{
  backgroundColor: '#FFFDF9',
  borderRadius: '20px',
  padding: '24px',
  boxShadow: '0 2px 8px rgba(74, 63, 53, 0.08)',
}}>
  <h3 style={{ fontFamily: 'Fraunces, serif', color: '#4A3F35', marginBottom: '12px' }}>
    {pathwayName}
  </h3>
  <p style={{ fontFamily: 'Nunito, sans-serif', color: '#4A3F35', marginBottom: '16px' }}>
    {patientMessage}
  </p>
  <button style={{
    backgroundColor: '#D98E5A',
    color: '#FFFDF9',
    border: 'none',
    borderRadius: '12px',
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 200ms ease',
  }}>
    Call now
  </button>
</div>
```

## Question Screen Layout

```tsx
<div style={{
  backgroundColor: '#FBF7F2',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  padding: '24px',
  maxWidth: '600px',
  margin: '0 auto',
}}>
  {/* Progress indicator */}
  <div style={{ marginBottom: '32px' }}>
    <StepDots current={2} total={4} />
  </div>

  {/* Question */}
  <h1 style={{
    fontFamily: 'Fraunces, serif',
    color: '#4A3F35',
    fontSize: '24px',
    lineHeight: 1.3,
    marginBottom: '24px',
  }}>
    {questionText}
  </h1>

  {/* Answer options as tappable cards */}
  {options.map(option => (
    <button key={option.value} style={{
      backgroundColor: '#FFFDF9',
      border: '2px solid #E8D9C5',
      borderRadius: '16px',
      padding: '16px 20px',
      marginBottom: '12px',
      textAlign: 'left',
      fontSize: '16px',
      color: '#4A3F35',
      minHeight: '56px',
      cursor: 'pointer',
      transition: 'all 200ms ease',
    }}>
      {option.label}
    </button>
  ))}
</div>
```

## Responsive Breakpoints

```
Mobile:  < 640px   (full-width cards, stacked layout)
Tablet:  640-1024px (constrained max-width, side margins)
Desktop: > 1024px   (max-width container centred, wider cards if desired)
```

Use a max-width container (e.g. 480-600px) centred on larger screens for the triage flow, since the one-question-at-a-time pattern works best in a narrow column regardless of device.
