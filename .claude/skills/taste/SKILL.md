---
name: taste
description: Judgment calibration for scope, restraint, and "is this actually good" decisions — what to build, what to cut, and when something is done vs over-engineered. Use when deciding whether to add a feature/flag/abstraction, when a task feels finished but something nags, when choosing between a simple option and a more "complete" one, or when reviewing a plan or diff for scope creep. Complements `impeccable-design` (visual craft) and `emil-kowalski-design` (motion) — this one is about the judgment call itself, not a specific craft domain.
---

# Taste

Taste is pattern-matched judgment: having seen enough good and bad examples that
you can tell which one you're looking at quickly, without a checklist. This skill
can't give you the pattern-matching itself, but it can give you the questions that
substitute for it when you're not sure.

## The core question

For any addition — a feature, a config flag, an abstraction, a parameter, a
fallback path — ask: **does removing this lose something a real user/caller
actually needs right now, or does it just lose something that felt safer to
keep?** If it's the latter, cut it. Most excess doesn't come from bad ideas; it
comes from good ideas nobody said no to.

## Signs of good taste in a decision

- **The default needs no configuration.** If you're adding a flag/setting to let
  someone avoid the default behavior, ask first whether the default is just
  wrong — fix that instead of adding an escape hatch.
- **The solution is proportional to the problem.** A one-off script doesn't need
  a plugin architecture; a bug fix doesn't need a refactor; three similar lines
  don't need a shared helper yet. Reach for structure when the third or fourth
  case actually shows up, not in anticipation of it.
- **Saying no is visible.** A good plan or PR description says what was
  deliberately left out and why, not just what was added. If nothing was cut,
  that's worth double-checking, not a sign everything was necessary.
- **It survives being explained in one sentence.** If justifying a choice takes
  a paragraph of caveats, it's probably solving an imagined problem rather than
  the actual one in front of you.

## Signs of poor taste to watch for

- **Configuration standing in for a decision.** Exposing a knob is often easier
  than deciding what the right behavior is — and it pushes the hard call onto
  every future caller instead of making it once, well.
- **Copying a pattern without knowing why it's there.** If a codebase does
  something a particular way and you can't reconstruct the reason, don't
  reflexively repeat it in new code — and don't reflexively "clean it up" either
  until you understand what it's protecting against.
- **Decoration disconnected from function.** In code: comments restating what
  the code does, defensive checks for states that can't occur, abstractions with
  one caller. In product: anything added because a competitor has it rather than
  because it serves this product's users.
- **"Done" that still nags.** If a task technically meets the ask but something
  about it still bothers you, don't file that feeling away — it's usually
  pointing at scope that crept in, or a corner that got cut in the wrong place.

## Building the pattern-matcher

Taste comes from exposure and reflection, not rules, so treat rules as training
wheels:

- When something feels off, don't just fix it — name *why* it felt off before
  moving on. The naming is what turns one observation into a reusable pattern.
- Compare before/after when you have the chance (an edit, a refactor, a
  revision) rather than only ever looking at finished output — the delta is
  where the judgment lives, not the result alone.
- Notice your own inconsistency. If you'd flag an addition in someone else's PR
  but wave it through in your own, that gap is the actual thing to close.

## Using this in review

When reviewing a plan, diff, or proposal, ask in order: What's being added that
wasn't asked for? What's being kept "just in case"? Does the default require
configuration to be usable? Would a one-sentence justification for each piece
hold up? Flag anything that fails, and prefer suggesting the cut over
suggesting a caveat that lets it stay.
