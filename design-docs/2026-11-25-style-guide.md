# Mercer Family Recipes — Style Guide

A cleaner, high-contrast look for the recipe site, built around a **yellow-orange** accent and **high legibility**, with light and dark themes. It builds on the [design principles distilled from Innerhelm and the personal website](./2026-11-25-design-principles.md).

## Goals

1. **Readable mid-task.** People use this site while cooking: a phone propped up across the counter, flour on their hands, a quick glance between steps. Text is large, high-contrast, and set in a typeface designed for legibility.
2. **High contrast, everywhere.** All text meets **WCAG AAA (7:1)**. Borders and other non-text indicators meet at least 3:1. Neither theme has low-contrast "subtle gray" text.
3. **Sharp and flat.** Square corners, solid borders, solid fills. No shadows, gradients, or rounded cards.
4. **Warm, not loud.** The yellow-orange is the kitchen-light accent: it marks what's actionable and what's done. It never fills large areas.

---

## Color

### Tokens

Semantic tokens replace the generated Radix `--primary-*` / `--gray-*` scales. Components use **only** these names.

| Token | Role | Light | Dark |
|---|---|---|---|
| `--color-bg` | Page background | `#FFFDF7` warm paper | `#14110C` warm near-black |
| `--color-surface` | Cards, list items, code, blockquotes | `#FAF3E3` | `#211C14` |
| `--color-text` | Body text, headings, icons | `#17130C` | `#F7F1E4` |
| `--color-text-muted` | Metadata, captions, labels | `#4D4536` | `#CFC4AE` |
| `--color-border` | Control and card borders (2px) | `#17130C` | `#F7F1E4` |
| `--color-rule` | Hairline dividers only (1px) | `#8C8270` | `#7A705E` |
| `--color-accent` | Accent **fill**: primary buttons, checked boxes, highlights | `#F5A70A` | `#FFB51F` |
| `--color-on-accent` | Text and icons on an accent fill | `#17130C` | `#14110C` |
| `--color-accent-strong` | Accent as a **line or indicator**: blockquote rule, list markers, active tab | `#A86400` | `#FFB51F` |
| `--color-accent-soft` | Tinted backgrounds: hover rows, "done" ingredients, search highlights | `#FFE9B8` | `#3D2C0A` |
| `--color-link` | Link text | `#764000` | `#FFC24D` |
| `--color-link-hover` | Link hover and active | `#4A2800` | `#FFE0A3` |
| `--color-focus` | Focus ring | `#17130C` | `#FFB51F` |
| `--color-danger` | Destructive actions and errors (darker than the current `#d3003c`, which is only 5.4:1) | `#9E002D` | `#FF8FA6` |

> ⚠️ **The light-mode accent is a fill, never text.** `#F5A70A` on the paper background is only **2.0:1**, so it can't be used for text and can't be the only edge of a control. In light mode, anything filled with the accent also gets a 2px `--color-border` outline, which is part of the look. For accent-colored *lines* in light mode, use `--color-accent-strong`.

### Measured contrast

Ratios below are WCAG 2.x contrast ratios.

| Pair | Light | Dark | Target |
|---|---|---|---|
| `text` on `bg` | 18.2 | 16.7 | 7:1 |
| `text` on `surface` | 16.7 | 15.0 | 7:1 |
| `text` on `accent-soft` | 15.5 | 11.9 | 7:1 |
| `text-muted` on `bg` | 9.3 | 10.9 | 7:1 |
| `text-muted` on `surface` | 8.6 | 9.8 | 7:1 |
| `text-muted` on `accent-soft` | 7.9 | 7.8 | 7:1 |
| `link` on `bg` | 8.2 | 11.7 | 7:1 |
| `link` on `surface` | 7.6 | 10.5 | 7:1 |
| `link` on `accent-soft` | 7.0 | 8.4 | 7:1 |
| `link-hover` on `bg` | 12.9 | 14.7 | 7:1 |
| `on-accent` on `accent` | 9.2 | 10.7 | 7:1 |
| `danger` on `bg` / `surface` | 8.3 / 7.6 | 8.7 / 7.8 | 7:1 |
| `border` on `bg` / `surface` | 18.2 / 16.7 | 16.7 / 15.0 | 3:1 |
| `accent-strong` on `bg` / `surface` | 4.6 / 4.2 | 10.7 / 9.6 | 3:1 |
| `rule` on `bg` | 3.7 | 3.9 | 3:1 |
| `accent` on `bg` | 2.0 ⚠️ | 10.7 | fill only |

If a token changes, re-check it against every background it can sit on.

### CSS

Theme switching keeps the existing mechanism: the system preference by default, overridden by `data-theme="light|dark"` on `<html>`.

```scss
@layer theme {
    @mixin light-colors {
        color-scheme: light;
        --color-bg: #FFFDF7;
        --color-surface: #FAF3E3;
        --color-text: #17130C;
        --color-text-muted: #4D4536;
        --color-border: #17130C;
        --color-rule: #8C8270;
        --color-accent: #F5A70A;
        --color-on-accent: #17130C;
        --color-accent-strong: #A86400;
        --color-accent-soft: #FFE9B8;
        --color-link: #764000;
        --color-link-hover: #4A2800;
        --color-focus: #17130C;
        --color-danger: #9E002D;
    }

    @mixin dark-colors {
        color-scheme: dark;
        --color-bg: #14110C;
        --color-surface: #211C14;
        --color-text: #F7F1E4;
        --color-text-muted: #CFC4AE;
        --color-border: #F7F1E4;
        --color-rule: #7A705E;
        --color-accent: #FFB51F;
        --color-on-accent: #14110C;
        --color-accent-strong: #FFB51F;
        --color-accent-soft: #3D2C0A;
        --color-link: #FFC24D;
        --color-link-hover: #FFE0A3;
        --color-focus: #FFB51F;
        --color-danger: #FF8FA6;
    }

    :root, [data-theme="light"] { @include light-colors; }
    [data-theme="dark"] { @include dark-colors; }
    @media (prefers-color-scheme: dark) {
        :root:not([data-theme="light"]) { @include dark-colors; }
    }
}
```

Also set `<meta name="theme-color">` to `--color-bg` for each scheme, so mobile browser chrome matches the page.

---

## Typography

### Faces

| Role | Face | Package | Fallback |
|---|---|---|---|
| Body, UI, ingredients, steps | **Atkinson Hyperlegible Next** | `@fontsource-variable/atkinson-hyperlegible-next` | `system-ui, sans-serif` |
| Headings, buttons, labels | **Figtree** (also used on the personal website) | `@fontsource-variable/figtree` | `Arial, sans-serif` |

Atkinson Hyperlegible was designed by the Braille Institute so that easily confused characters (`1 l I`, `0 O`, `rn m`) stay distinct. On a recipe site that matters for quantities like "1 ½ tsp" vs "l ½ tsp", and "10" vs "1O". Figtree gives headings and labels a clean, geometric voice that pairs well with it.

```scss
--font-body: 'Atkinson Hyperlegible Next Variable', system-ui, sans-serif;
--font-heading: 'Figtree Variable', Arial, sans-serif;
--font-label: var(--font-heading);
```

Turn on tabular, lining figures in ingredient lists so quantities line up: `font-variant-numeric: tabular-nums lining-nums;`.

### Scale

Raise the base size. Recipes are read from a distance.

- **Base (`--step-0`):** 18px on mobile up to 20px on desktop. That's a Utopia `minFontSize: 18`, `maxFontSize: 20`, with the type scale ratio rising from 1.2 to 1.25.
- **Body line-height:** 1.6. **Headings:** 1.1–1.25.
- **Measure:** prose and steps at most ~65ch (`u-guttered`). Lists and indexes can use up to 90ch (`u-guttered-lg`).

| Element | Size | Weight | Face | Notes |
|---|---|---|---|---|
| `h1` (recipe title) | `--step-4` | 800 | heading | `text-wrap: balance` |
| `h2` (Ingredients, Steps) | `--step-2` | 750 | heading | 3px `--color-accent-strong` bar on the left, `padding-inline-start: 0.5em` |
| `h3` | `--step-1` | 700 | heading | |
| Body | `--step-0` | 400 | body | |
| Steps (`ol`) | `--step-0` | 400 | body | Numbers in heading face, 700, `--color-accent-strong` |
| Labels / metadata | `--step--1` | 600 | label | `--color-text-muted`; uppercase with `letter-spacing: 0.04em` for short labels only |

Headings use `--color-text`, not a tinted hue. Contrast takes priority over atmosphere.

---

## Shape, borders, and space

- **Corner radius: `0`. No exceptions** for buttons, inputs, cards, chips, modals, images, or focus rings. Circles are allowed only for things that are genuinely round.
- **No shadows.** No `box-shadow` or `drop-shadow` for elevation. A popover or modal is set apart by a 2px `--color-border` outline and a backdrop.
- **Borders have two weights:**
  - `2px solid var(--color-border)` for anything you interact with or that defines a region: buttons, inputs, checkboxes, cards, the search box, modals.
  - `1px solid var(--color-rule)` for dividers inside a region, such as between list rows or under a section.
- **Space:** keep the Utopia space scale and the layout primitives (`l-stack`, `l-cluster`, `l-center`, `l-sidebar`). Prefer `gap` over margins.
- **Touch targets:** at least 44×44px for anything tappable, especially the ingredient checkboxes and the keep-awake toggle.

---

## Components

### Links

- `--color-link`, always underlined, `text-decoration-thickness: max(1px, 0.08em)`, `text-underline-offset: 0.18em`.
- On hover, switch to `--color-link-hover` and thicken the underline to 2px.
- Recipe titles in lists can drop the underline, but bring it back on hover and focus.

### Focus

Every focusable element gets the same ring: `outline: 3px solid var(--color-focus); outline-offset: 2px;` on `:focus-visible`. Don't suppress it, and don't give it a radius.

### Buttons

| Variant | Fill | Text | Border | Hover |
|---|---|---|---|---|
| **Primary** (one per view, e.g. "Back to all recipes", search) | `--color-accent` | `--color-on-accent` | 2px `--color-border` | `--color-text` fill, `--color-bg` text (inverts) |
| **Secondary** (keep awake, reset checklist, theme toggle) | transparent | `--color-text` | 2px `--color-border` | `--color-accent-soft` fill |
| **Danger** | transparent | `--color-danger` | 2px `--color-danger` | `--color-danger` fill, `--color-bg` text |

Use the heading face at 700 weight with `--step--1`/`--step-0` sizes, and padding `var(--space-2xs) var(--space-s)`. Leave text in sentence case. Use **no transition on color**: the state change should be instant and crisp. Disabled buttons: `opacity: 0.55`, `cursor: not-allowed`, no hover change.

### Inputs (search box, any future forms)

- `--color-bg` fill, 2px `--color-border`, radius 0, body face at `--step-0`.
- Placeholder in `--color-text-muted`. It still has to meet 7:1, so the muted token works here.
- Labels sit above the input in the label voice.

### Ingredient checklist

This is the signature interaction, so give it the most care.

- **Checkbox:** a custom 1.25em square with a 2px `--color-border` outline and radius 0.
  - When checked, fill it with `--color-accent` and draw a `--color-on-accent` check mark.
- **Row:** the whole row is the hit target, padded to at least 44px tall.
- **Checked row:**
  - The text stays at full contrast. Don't fade it to gray, because that hurts legibility.
  - Instead, set a `--color-accent-soft` background and `text-decoration: line-through` with `text-decoration-color: var(--color-accent-strong)` and `text-decoration-thickness: 2px`.
- **Quantities:** `tabular-nums`, and optionally bold the leading quantity so it scans as a column.

### Recipe list items (home, family, tag pages)

- Flat rows separated by `1px --color-rule`, or cards with a 2px `--color-border` outline on `--color-surface`. Pick one and use it everywhere; rows are cleaner and recommended.
- Title in the heading face at `--step-1`, 700. Metadata line in the label voice: `Mom & Dad • Last modified 9/26/2026`.
- Hover: `--color-accent-soft` background across the whole row, with no movement or scaling.
- The "work in progress" badge is a square chip: 2px `--color-border`, label voice, `--step--2`, no fill.

### Tags and family chips

Square chips with a 2px `--color-border` outline, `--color-text`, label voice, `#` prefix for tags. Hover uses an `--color-accent-soft` fill. The active or current chip has an `--color-accent` fill with `--color-on-accent` text.

### Disclosure (`details` / `summary`: "By family", "By tag")

- `summary` uses the heading face at `--step-1`, 700, with a custom square marker (`▸` / `▾`) in `--color-accent-strong`.
- Open state: a 3px `--color-accent-strong` bar on the left of the content, like `h2`.

### Blockquotes, notes, and tips

`--color-surface` fill, `3px solid var(--color-accent-strong)` on the left, no radius, padding `--space-s`.

### Lists

Unordered lists use `list-style-type: square` with `::marker { color: var(--color-accent-strong); }`, the personal website's touch. Ordered steps use heading-face numerals as described under typography.

### Search (Pagefind)

Map Pagefind's variables to the tokens (this replaces the current Radix mapping in `Search.astro`):

```css
html:root {
  --pf-font: var(--font-body);
  --pf-text: var(--color-text);
  --pf-text-secondary: var(--color-text-muted);
  --pf-text-muted: var(--color-text-muted);
  --pf-background: var(--color-bg);
  --pf-border: var(--color-border);
  --pf-border-focus: var(--color-focus);
  --pf-border-radius: 0;
  --pf-hover: var(--color-accent-soft);
  --pf-mark: var(--color-accent-strong);
  --pf-outline-focus: var(--color-focus);
  --pf-outline-width: 3px;
  --pf-shadow-sm: none;
  --pf-shadow-md: none;
  --pf-shadow-lg: none;
  --pf-skeleton: var(--color-surface);
  --pf-skeleton-shine: var(--color-accent-soft);
}
```

---

## Motion

Keep it minimal: only `scroll-behavior: smooth` and the disclosure open/close. Color changes on hover are instant. Respect `prefers-reduced-motion: reduce` by turning off smooth scrolling.

## Print

Recipes get printed, so print gets real styles (adapted from Innerhelm):

- White background and black text, ignoring the theme.
- Links print in black with the URL hidden.
- Hide the nav, search, keep-awake, reset checklist, theme toggle, "See also", and tag chips.
- Show checkboxes as empty 2px squares so a printed recipe works as a checklist.
- Keep each `h2` with its list (`break-after: avoid-page`), and avoid breaking inside list items.

---

## Do / Don't

| Do | Don't |
|---|---|
| Use the accent as a **fill** with dark text on it | Put the light-mode accent on text or thin lines |
| Outline accent fills with a 2px `--color-border` in light mode | Rely on the yellow edge alone to show a button's shape |
| Keep muted text at the `--color-text-muted` token (≥7:1) | Lower opacity to de-emphasize text |
| Mark done ingredients with a tint and strikethrough | Gray out done ingredients |
| Use square corners and flat borders | Add `border-radius`, shadows, or gradients |
| Use `gap` and the layout primitives | Hand-tune margins per component |

---

## Migration from the current theme

The site currently generates Radix scales from `#CC5500` (burnt orange) in `src/styles/theme.scss`. Suggested mapping for existing usages:

| Current | New |
|---|---|
| `--gray-1` | `--color-bg` |
| `--gray-3`, `--gray-4` | `--color-surface` |
| `--gray-5`, `--gray-6` | `--color-accent-soft` (hover) or `--color-surface` |
| `--gray-7`, `--gray-8` | `--color-border` (controls) or `--color-rule` (dividers) |
| `--gray-11` | `--color-text-muted` |
| `--gray-12` | `--color-text` |
| `--gray-contrast` | `--color-on-accent` |
| `--primary-8` (focus) | `--color-focus` |
| `--primary-9`, `--primary-10` (button fill) | `--color-accent` |
| `--primary-11` (links) | `--color-link` |
| `--primary-12` (link hover) | `--color-link-hover` |

Suggested order:

1. Add the tokens and fonts.
2. Swap `base.scss`.
3. Restyle the components (buttons, checklist, list rows, chips, details).
4. Update the Pagefind mapping.
5. Remove the Radix color generation and the `opacity: 0.8` metadata styles.
6. Add print styles.
7. Place `ThemeToggle` in the page chrome.
