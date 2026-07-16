# Design — Velora (Opti26 frontend)

A locked design system for this app. Every view reads this file before emitting
code. Do not regenerate per view — extend or amend this file when the system
needs to grow. Tokens live in `src/tokens.css` (imported first by `src/styles.css`).

/ Hallmark · genre: modern-minimal · design-system: design.md · designed-as-app /

## Genre

**modern-minimal** — a light, restrained ops/analytics dashboard (Stripe / Linear
school). Confident sans display, generous whitespace, one accent, disciplined
surfaces. The product is a corporate-mobility route optimizer: dense tables, a
map, stat tiles, and a constraint-violation report. Function carries the page.

## Macrostructure families

- **App views** (Dashboard, Testcases): **Workbench** — fixed left rail + a
  scrolling work surface of stat tiles, map, tables. No hero, no enrichment.
- **Onboarding / New Case**: **Centered task card** — a single narrowed column,
  wordmark + one sentence + the upload card + primary CTA. One quiet piece of
  CSS-art (the paper-map badge) is allowed here only.
- **Content** (none currently): typography only if added.

## Theme — light, warm off-white paper, single brand-gold accent

Anchor hue ≈ 85 (warm gold). The accent occupies ≤ 5 % of any viewport: active
nav bar, focus rings, the primary CTA fill, and selected-row wash. Everything
else is neutral. Full values in `## Exports`.

- `--color-paper`      oklch(97.5% 0.006 85)  — app background, warm off-white
- `--color-paper-2`    oklch(99.4% 0.003 85)  — card / panel surface
- `--color-paper-3`    oklch(95% 0.008 85)    — hover / inset / muted surface
- `--color-ink`        oklch(24% 0.012 65)    — primary text
- `--color-ink-2`      oklch(40% 0.010 66)    — secondary text
- `--color-muted`      oklch(54% 0.010 68)    — labels / tertiary
- `--color-faint`      oklch(68% 0.008 72)    — disabled / decorative only
- `--color-rule`       oklch(91% 0.007 85)    — hairline borders
- `--color-rule-2`     oklch(86% 0.009 85)    — stronger borders / inputs
- `--color-accent`     oklch(72% 0.135 84)    — brand gold: fills, active, focus
- `--color-accent-strong` oklch(64% 0.14 80)  — gold hover
- `--color-accent-ink` oklch(30% 0.055 70)    — text/icon ON gold fill
- `--color-accent-text` oklch(50% 0.115 66)   — gold as text/link on paper (AA)
- `--color-accent-soft` oklch(95.5% 0.03 85)  — pale gold wash, selected rows
- `--color-focus`      oklch(60% 0.14 72)
- `--color-green` / `--color-green-soft`  — success (routed, savings ↑)
- `--color-red` / `--color-red-soft`      — error / destructive / hard violation
- `--color-amber`                         — warning / soft violation

## Typography — 2 + 1

- **Display**: Space Grotesk, weight 500–700, tracking −0.02em. Headings, section
  titles, stat values, wordmark.
- **Body**: Inter, weight 400–600. UI, prose, table cells. *Deliberate choice*:
  this is a data-dense dashboard — Inter's tabular figures and screen legibility
  are the right tool, and the genre sanctions Inter as body. `tabular-nums` on all
  numeric data.
- **Outlier (mono)**: JetBrains Mono, weight 400–500. IDs (employee/vehicle),
  clock times, coordinates, code-like tokens. Two roles only.
- Killed from the old build: Plus Jakarta Sans, Fraunces, and a phantom `"Roboto"`
  that was referenced ~30× but never imported (silently fell back to system sans).

## Spacing

4-point named scale, values in `tokens.css`. Views use named tokens
(`var(--space-md)`), never raw px.

## Motion

- Easings: `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-in-out`.
- Reveal pattern: **none** — the app is composed, not animated in. Motion is
  reserved for state feedback (hover, progress bars, the route-loading spinner).
- `prefers-reduced-motion: reduce` → spinners/shimmer collapse to static.

## Microinteractions stance

- Silent success; no celebratory toasts.
- Hover/active on interactive surfaces uses `--color-paper-3`; active nav/selection
  uses the gold left-bar + `--color-accent-soft` wash.
- `:focus-visible` → 2px `--color-focus` ring, never animated.

## CTA voice

- **Primary**: gold fill (`--color-accent`) + `--color-accent-ink` text, pill/rounded,
  bold. The one sanctioned accent-as-fill (small surface). Used for "Run
  Optimization", "Load Test Case".
- **Secondary**: outlined (`--color-rule-2` border) + ink text, transparent fill.
- **Toggle/segmented** (map mode, opt mode): rest = paper-2 + rule border; active =
  accent-soft wash + accent-text + accent border.

## Per-view allowances

- New Case MAY use the one CSS-art paper-map badge. App views MUST NOT add
  enrichment — the map + data carry them.
- Charts (SavingsWaterfall) use: gold = optimized/positive, red = cost/negative,
  neutral grey = baseline. Never rely on red/green alone — pair with labels.

## What views MUST share

- The Velora wordmark (Space Grotesk 600) + "Fleet Intelligence" eyebrow.
- The gold accent and its ≤ 5 % placement.
- Space Grotesk display / Inter body / JetBrains Mono ID pairing.
- CTA voice (gold-fill primary, outlined secondary).
- Stat-tile rhythm: top hairline + label (mono/caps) + display value.

## What views MAY differ on

- Macrostructure within the family (Workbench vs Centered card).
- Local composition (grid columns, map placement).

## Exports

### tokens.css

```css
:root {
  --color-paper:        oklch(97.5% 0.006 85);
  --color-paper-2:      oklch(99.4% 0.003 85);
  --color-paper-3:      oklch(95% 0.008 85);
  --color-ink:          oklch(24% 0.012 65);
  --color-ink-2:        oklch(40% 0.010 66);
  --color-muted:        oklch(54% 0.010 68);
  --color-faint:        oklch(68% 0.008 72);
  --color-rule:         oklch(91% 0.007 85);
  --color-rule-2:       oklch(86% 0.009 85);
  --color-accent:       oklch(72% 0.135 84);
  --color-accent-strong:oklch(64% 0.14 80);
  --color-accent-ink:   oklch(30% 0.055 70);
  --color-accent-text:  oklch(50% 0.115 66);
  --color-accent-soft:  oklch(95.5% 0.03 85);
  --color-focus:        oklch(60% 0.14 72);
  --color-green:        oklch(58% 0.13 155);
  --color-green-soft:   oklch(95% 0.045 155);
  --color-red:          oklch(55% 0.19 27);
  --color-red-soft:     oklch(95.5% 0.035 25);
  --color-amber:        oklch(72% 0.15 75);

  --font-display: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
  --font-body:    "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono:    "JetBrains Mono", ui-monospace, monospace;

  --space-3xs: 0.25rem; --space-2xs: 0.5rem; --space-xs: 0.75rem;
  --space-sm: 1rem; --space-md: 1.5rem; --space-lg: 2rem;
  --space-xl: 3rem; --space-2xl: 4.5rem; --space-3xl: 7rem;

  --text-xs: 0.75rem; --text-sm: 0.875rem; --text-base: 1rem;
  --text-md: 1.125rem; --text-lg: 1.375rem; --text-xl: 1.75rem;
  --text-2xl: 2.25rem; --text-3xl: 3rem;

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --dur-short: 200ms;
  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 14px; --radius-pill: 999px;
}
```

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper:  oklch(97.5% 0.006 85);
  --color-ink:    oklch(24% 0.012 65);
  --color-accent: oklch(72% 0.135 84);
  --font-display: "Space Grotesk", sans-serif;
  --font-body:    "Inter", sans-serif;
  --font-mono:    "JetBrains Mono", monospace;
  --spacing-md:   1.5rem;
  --text-md:      1.125rem;
  --ease-out:     cubic-bezier(0.16, 1, 0.3, 1);
}
```

### shadcn/ui CSS variables (light)

```css
:root {
  --background: oklch(97.5% 0.006 85);
  --foreground: oklch(24% 0.012 65);
  --card:       oklch(99.4% 0.003 85);
  --primary:    oklch(72% 0.135 84);
  --primary-foreground: oklch(30% 0.055 70);
  --muted:      oklch(95% 0.008 85);
  --muted-foreground: oklch(54% 0.010 68);
  --border:     oklch(91% 0.007 85);
  --input:      oklch(86% 0.009 85);
  --ring:       oklch(60% 0.14 72);
  --radius:     0.625rem;
}
```
