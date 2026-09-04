---
name: impeccable-design
description: Craftsmanship checklist for visually polished, consistent UI — spacing/grid systems, type scale, color and contrast, alignment, and restraint. Use when building or reviewing static layout, visual hierarchy, typography, color palettes, or component styling in any codebase (web, app, or design tool output). Complements `emil-kowalski-design` (motion/micro-interaction) and does not replace `design`/`artifact-design` (Artifact-specific canvas and capability rules) — apply this one for the underlying visual craft regardless of medium.
---

# Impeccable design

A working checklist for making a UI look and feel deliberate rather than
assembled. Most "looks off" complaints trace back to one of the sections below —
work through them in order before chasing anything more exotic.

## Spacing and grid

- **Pick one spacing scale and never deviate.** A geometric or near-geometric
  scale (4/8/12/16/24/32/48/64) reads as intentional; ad-hoc values like `13px`
  or `22px` read as accidental, even if no one can say why.
- **Related things sit closer than unrelated things.** If two elements are a
  labeled pair (label + input, icon + text), the gap between them should be
  visibly smaller than the gap to the next group. Equal spacing everywhere
  flattens hierarchy — the eye can't tell what belongs together.
- **Whitespace is a layout tool, not leftover space.** Don't fill a container
  just because it's empty; increasing the margin around a sparse element often
  reads as more finished than adding decoration to it.

## Typography

- **Limit yourself to 2-3 type sizes per view** beyond a display/heading size,
  built from a scale (e.g. 1.25x or 1.333x ratio) rather than picked by eye.
- **Line-height shrinks as font-size grows.** Body text wants ~1.5; large
  headings look loose at 1.5 and want closer to 1.1-1.2.
- **Line length matters for body copy.** Target ~45-75 characters per line;
  either constrain the container width or increase font-size rather than
  letting paragraphs stretch full-width on a wide screen.
- **One typeface family is almost always enough.** If you add a second, use it
  for a clearly distinct role (e.g. monospace for code/data), not as a second
  voice for the same kind of content.

## Color

- **Start from as few hues as you can get away with** — one neutral ramp plus
  one or two accent colors handles most interfaces. Every additional hue needs
  to earn its place with a distinct meaning (destructive, success, warning).
- **Check contrast, don't eyeball it.** Body text against its background
  should clear WCAG AA (4.5:1 for normal text, 3:1 for large text/UI
  components). Low-contrast gray-on-white is the single most common
  "unpolished" tell.
- **Color alone shouldn't carry meaning.** Pair a status color with an icon,
  label, or shape difference so the UI still works for color-blind users and
  in a quick glance.
- **Neutral ramps should stay neutral.** A gray scale that's secretly tinted
  blue or green (common when generated from a single hex value) fights with
  every accent color placed on it — verify neutrals render as actually neutral.

## Hierarchy and alignment

- **Every screen needs one clear primary action/focal point.** If everything is
  emphasized (bold, colored, boxed), nothing is — cut competing emphasis until
  one thing wins.
- **Align to a shared axis.** Text, icons, and inputs in a row should share a
  baseline or center-line; edges of cards/sections in a layout should line up
  to an invisible column grid. Near-alignment (off by a few px) is more
  noticeable than no alignment at all.
- **Optical alignment beats mathematical alignment** for icons/glyphs next to
  text — an icon's visual weight often needs a small manual nudge to look
  centered even when its bounding box is centered.

## Restraint

- **Every visual effect needs a job.** Shadows imply elevation, borders imply
  separation, gradients imply light source or depth — if you can't say what an
  effect is communicating, it's probably noise. Prefer removing an element and
  seeing if anything is lost over adding one "to make it feel more designed."
- **Consistency beats novelty within one product.** Reuse an existing
  button/card/spacing pattern rather than inventing a slightly different one
  for a new feature, even if the new one is individually nicer — the
  inconsistency costs more than the improvement gains.

## Review pass

Before calling a UI done, look at it and ask: does spacing follow one scale;
does anything fail contrast; is there more than one thing competing for
attention; does everything on a shared row actually align; would removing any
single decorative element make it look worse or just simpler? Fix what fails
before moving on.
