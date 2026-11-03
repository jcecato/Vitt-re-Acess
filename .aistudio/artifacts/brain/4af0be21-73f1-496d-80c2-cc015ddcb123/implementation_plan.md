# Cover Screen Slogan Update

Update the cover screen slogan on the Vittáre Acess landing card (`VittareCoverScreen.tsx`) to feature the refined, value-focused phrasing: **"Tudo para seu acompanhamento, na palma da mão."** with green gradient highlighting on the first line.

## User Review & Critical Decisions

> [!IMPORTANT]
> The user confirmed the following options in Phase 1:
> - **Confirmed Slogan Phrasing**: "Tudo para seu acompanhamento, na palma da mão."
> - **Confirmed Gradient Distribution**: Line 1 ("Tudo para seu acompanhamento,") in emerald gradient, Line 2 ("na palma da mão.") in muted neutral tone (#dfe9f2).

---

## 1. Overview & Core Concept

- **What It Does**: Refreshes the central slogan of the Vittáre Acess cover card to clearly convey comprehensive health monitoring and clinical precision in an elegant, approachable tone.
- **Target Audience**: Patients, elderly users, and caregivers accessing the Vittáre Acess portal.
- **Key Value**: Provides an inspiring, high-value value proposition on the initial landing screen before login/enter.

---

## 2. User Experience & Visual Design

- **Typography & Font**:
  - Font Family: `Cormorant Garamond` (Serif Display)
  - Line 1: `<span>Tudo para seu acompanhamento,</span>` — Styled with `font-weight: bold;` and emerald gradient (`linear-gradient(90deg, #8bf0b6, var(--green) 60%, var(--green-2))`).
  - Line 2: `na palma da mão.` — Styled with `font-weight: normal;` and soft light blue-gray tone (`#dfe9f2`).
- **Layout & Spacing**:
  - Single line-break (`<br />`) between phrase 1 and phrase 2 to preserve vertical balance and prevent horizontal text overflow on narrow mobile screens.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: First-Line Gradient Accent**:
  - *Chosen Approach*: Apply `-webkit-background-clip: text` only to `<span>Tudo para seu acompanhamento,</span>`.
  - *Why*: Directs maximum visual emphasis to the core benefit ("Tudo para seu acompanhamento") while keeping the secondary phrase readable and grounded.
- **Decision 2: Line Break Structure**:
  - *Chosen Approach*: Explicit line break after the comma.
  - *Why*: Ensures consistent 2-line rhythm across device viewports without awkward word wraps.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   VittareCoverScreen                   │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ header.vc-hero                                   │  │
│  │   ├── div.vc-logo (VittareLogo cross icon)       │  │
│  │   ├── h1.vc-brand ("VITTÁRE ACESS™")            │  │
│  │   └── p.vc-slogan                                │  │
│  │         ├── span [Bold + Gradient]               │  │
│  │         │     "Tudo para seu acompanhamento,"    │  │
│  │         ├── <br />                               │  │
│  │         └── "na palma da mão." [Normal + Muted]  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ form.vc-form (Login fields & Enter button)       │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

- **Affected File**: `/src/modules/cover/VittareCoverScreen.tsx`
- **Validation**: TypeScript compilation (`tsc --noEmit`) and Vite bundle build (`npm run build`).
