# Design Principles (distilled from Innerhelm and the personal website)

The sibling projects `../innerhelm` and `../personal-website` share a recognizable visual language. This doc records the decisions they have in common, so the recipe site can adopt the same style on purpose rather than by copying CSS. The concrete tokens and component rules for this site are in [the style guide](./2026-11-25-style-guide.md).

## 1. Sharp corners, everywhere

Both sites set `border-radius: 0` on every interactive control: buttons, text inputs, and textareas (`innerhelm/src/styles/base.scss`, `personal-website/src/styles/base.scss`). Across the personal website's styles, `0` is the most common radius value. The only exceptions are true circles (avatars, dots) and a handful of 2–4px values on small, one-off elements.

**Principle:** rectangles are the default. A corner is only rounded when the object is round.

## 2. Flat surfaces, structure from borders and fills

Shadows are rare and nearly invisible where they exist. Innerhelm uses `rgba(0,0,0,0.03)` shadows, and the personal website overrides third-party code frames with `box-shadow: none !important`. Structure comes from:

- **Solid 1–2px borders** in strong colors. For example, the personal site's footnote separator is `gray-12` (near-black) and its code blocks are outlined in `gray-10`.
- **A 2px accent rule plus a tinted fill** for blockquotes. Both sites do this.
- **Solid color fills** for buttons, with no border and no gradient.

**Principle:** separate things with lines and fills, not elevation.

## 3. Buttons are solid blocks of the brand color

Both sites' buttons share the same recipe: a solid primary fill, white text, `font-weight: 600–700`, an accent or heading font, square corners, and generous padding (`space-xs`/`space-s`). Hover and focus darken the fill: Innerhelm switches to `primary-800`, and the personal site applies `filter: brightness(0.95) contrast(1.1)`. Disabled buttons drop to 0.7–0.8 opacity.

## 4. Type: a readable body face, bold headings, a distinct "label" voice

| | Innerhelm | Personal website |
|---|---|---|
| Body | Piazzolla (serif) | Faustina (serif) |
| Headings | EB Garamond, bold | Figtree (sans), bold |
| Accent / labels | Vollkorn SC (small caps) | Figtree |

Shared decisions:

- **Fluid scales from Utopia.** The type (`--step-*`) and space (`--space-*`) scales interpolate between a mobile and a desktop size. This site already uses them.
- **A base size of at least ~18px**, reaching 20px on desktop in Innerhelm.
- **Generous body leading:** 1.6 in Innerhelm, 1.85em on the personal site. Headings are tight (1.0–1.3), and each step has its own line-height token (`--lh-*`).
- **`text-wrap: pretty`** on headings.
- **Headings tinted with the brand hue**, not pure black: Innerhelm uses `primary-800`, the personal site `primary-12`.
- **A separate "label" voice** (`.u-slub`) for metadata, form labels, and buttons: a bold accent face in a muted color.

## 5. Links look like links

Links are underlined and colored with the brand's dark shade, and they get darker on hover. Innerhelm and this site also use `text-decoration-thickness: from-font` and `text-underline-offset: 2px`. A subtle variant (`u-link-subtle`) drops the underline only where context makes the link obvious, and keeps it on `:focus-visible`.

## 6. Small, deliberate brand touches

- **Square bullets with accent-colored markers** (`list-style-type: square`, `li::marker` colored with the primary). From the personal website.
- **Patterned bands for hero headings:** an SVG pattern on a solid brand fill, with the text haloed by text-shadow. Both sites do this.
- **Drop caps** on the first paragraph, using `initial-letter`. From Innerhelm.
- **A "paper" palette** (warm off-white backgrounds, dashed tan rules) for notebook-like components. From Innerhelm.

## 7. Layout primitives, not bespoke layouts

Both sites build pages from Every Layout primitives (`l-stack`, `l-cluster`, `l-sidebar`, `l-center`) plus `u-guttered` containers capped at a readable measure: about 60ch for prose and about 90ch for wider pages. This site already does the same.

## 8. Theming: system preference, with a two-state override

Colors live in CSS custom properties with full light and dark sets. The personal website's spec (`design-docs/2026-08-18-dark-mode-toggle.md`) defines the toggle:

- System preference is the default.
- A stored `light` or `dark` override is applied with `data-theme` on `<html>`.
- The control only ever shows two states.

This site already ships `ThemeToggle.astro` with that behavior, but no page renders it yet.

## 9. Print is a first-class medium

Innerhelm has full `@media print` rules: backgrounds dropped, text forced to near-black, decorative elements hidden, and headings kept with the content that follows (`break-after: avoid-page`). People print recipes, so this matters more here than it does for a blog.

## What to carry over, and what to push further

**Carry over:** square corners, flat structure, solid buttons, underlined links, Utopia scales, layout primitives, square accent bullets, the label voice, print styles, and the theme toggle model.

**Push further here:**

1. **Contrast.** Both sites use mid-tone grays for secondary text (Innerhelm's labels are `gray-500`), and those fall below WCAG AAA. This site should hold all text to at least 7:1.
2. **Strong edges where edges exist.** Keep borders as rare as the sibling sites do, but where one is needed (checkboxes, text inputs), make it full-contrast and 2px instead of a pale gray.
3. **Legibility over atmosphere.** Recipes get read mid-task, at arm's length, on a phone propped against a backsplash. Choose a hyperlegible face over a literary serif, and use larger sizes and touch targets.
