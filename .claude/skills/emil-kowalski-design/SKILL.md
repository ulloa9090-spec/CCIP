---
name: emil-kowalski-design
description: Apply design-engineering principles for UI motion, micro-interactions, and interface polish in the style of Emil Kowalski (creator of Sonner and Vaul, author of "Animations on the Web"). Covers purposeful easing curves, interruptible/gesture-driven animation, perceived performance, and small-detail polish. Use when building or reviewing transitions, toasts, drawers/bottom sheets, dialogs/modals, hover/focus/active states, drag gestures, or any UI micro-interaction — not for static layout or visual branding work, which the general `design` skill covers.
---

# Emil Kowalski-style design engineering

A checklist and reference for building interfaces with the "design engineer" mindset:
motion and detail as a first-class part of the implementation, not a coat of paint
added at the end. Grounded in the public work and writing of Emil Kowalski —
[Sonner](https://sonner.emilkowal.ski), [Vaul](https://vaul.emilkowal.ski), and
[emilkowal.ski/posts](https://emilkowal.ski) (esp. "Animations on the Web").

## Core philosophy

- **Design in code, not in mockups.** Prototype the real component with real data and
  real states (empty, loading, error, overflow, many-items) instead of a static frame.
  Motion and edge cases only reveal themselves once the thing actually runs.
- **Motion communicates, it doesn't decorate.** Every animation should answer a
  question: where did this element come from, where is it going, what's now more or
  less important? If removing the animation doesn't remove any information, cut it.
- **Small details compound.** Cursor affordances, focus rings, corner-radius
  consistency, drag resistance, and exact timing rarely get noticed individually —
  their absence is what people feel as "this app feels cheap."

## Motion principles

- **Use eased, not linear, timing functions.** Linear motion reads as mechanical.
  Prefer an ease-out for things entering/responding to user input (fast start, soft
  landing) and ease-in for things leaving. A concrete example from Vaul's drawer
  transition: `cubic-bezier(0.32, 0.72, 0, 1)`.
- **Duration scales with distance and size, not a fixed constant.** A small hover
  affordance is ~100-150ms; a panel or drawer entering the viewport is ~250-350ms; a
  full-screen transition can go higher. If it feels sluggish on repeat use, shorten it
  before you add an escape hatch to skip it.
- **Animations must be interruptible.** If the user acts again mid-animation (drags,
  clicks, types), the animation should redirect from its *current* position/velocity,
  not restart from the beginning or ignore the input until it finishes. This is why
  spring-based motion (velocity-aware) usually feels better than a fixed-duration
  tween for anything gesture-driven.
- **Tie the animation to the gesture when there is one.** A swipe-to-dismiss toast or
  a drag-to-close drawer should track the pointer 1:1 while dragging, then either
  settle back or complete the transition based on velocity/distance at release —
  never a canned animation that ignores where the user's hand actually is.
- **Respect `prefers-reduced-motion`.** Fall back to instant or opacity-only
  transitions; never make motion mandatory for understanding the UI.

## Component patterns worth stealing

- **Toasts** (see Sonner): stack with a collapsed height by default, expand to show
  all messages on hover; each toast animates height/position so neighbors reflow
  smoothly instead of jumping; swipe-to-dismiss with resistance at the gesture's edge.
- **Drawers/bottom sheets** (see Vaul): the page content behind the drawer scales
  down and its corners round to match the drawer's corner radius, reinforcing that
  the drawer is "in front of" the page, not just overlaid on it; supports snap points
  instead of only fully-open/fully-closed.
- **Dialogs/modals**: animate scale + opacity together (not just opacity) so the
  dialog visibly emerges from roughly where it was triggered; dim/blur the backdrop
  in sync rather than as a separate abrupt state change.

## Perceived performance

- Prefer optimistic UI updates over waiting for a round-trip when the action is
  very likely to succeed (toggle, favorite, send) — reconcile silently if it fails.
- Skeleton/loading states should match the real content's dimensions so nothing
  reflows when data arrives.
- Instant feedback beats accurate feedback: acknowledge the user's action
  immediately (button press state, optimistic toast) even if the real result
  streams in slightly later.

## When reviewing UI code with this skill

Check for: linear `transition-timing-function` on anything user-facing; fixed
durations reused everywhere regardless of element size; animations that can't be
interrupted or that block input while running; missing `prefers-reduced-motion`
handling; drag gestures that snap back to a canned position instead of tracking the
pointer; loading states whose size doesn't match the loaded content.
