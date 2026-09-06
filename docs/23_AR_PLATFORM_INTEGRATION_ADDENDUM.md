# 23 — AR Platform Integration Addendum
Version: 1.0
Status: Candidate strategy, contingent on the Phase 0 framework decision

## Scope

This addendum only applies **if** `20_PHASE0_EXECUTION_RESEARCH_PROMPT.md`
section 6 concludes BoxOp should use a shared cross-platform UI layer. If
Phase 0 instead concludes independent native iOS/Android implementations
are the right architecture, this document does not apply — go straight
from native UI to the `ARPlatformAdapter` boundary defined in
`21_AR_MEASUREMENT_SYSTEM.md` without a bridge layer.

## Strategy (shared-UI branch only)

A shared-UI layer owns product UI/business logic. Native adapters own
spatial APIs.

- iOS → ARKit
- Android → ARCore

Use a normalized `ARPlatformAdapter` (see `21_AR_MEASUREMENT_SYSTEM.md`
"AR provider responsibilities").

## Common capabilities

Support detection, session lifecycle, tracking state, planes, raycast/hit
test, anchors, camera pose, optional depth, optional mesh/reconstruction,
capability discovery and normalized errors.

## Bridge decision (only once a shared-UI framework is chosen)

Before implementation, evaluate current:
- maintained AR plugins for the chosen framework (e.g. a Flutter AR
  plugin, if Flutter is the framework Phase 0 selects);
- Pigeon / platform channels (Flutter-specific) or the equivalent
  mechanism for whichever framework is chosen;
- a custom plugin;
- platform views.

Selection criteria: maintenance, Android/iOS support, advanced ARKit
access, ARCore Depth access, performance, lifecycle control,
extensibility and licensing — the same bar `03_CLAUDE_CODE_RULES.md`
rule 15 sets for any major dependency.

## Parity rule

Product semantics should be consistent across platforms, but native
internals may differ. Unsupported capabilities degrade gracefully rather
than being faked — the same principle as `09_CAMERA_SENSOR_HARDWARE.md`
("Capability detection") and `21_AR_MEASUREMENT_SYSTEM.md` ("Fallbacks").
