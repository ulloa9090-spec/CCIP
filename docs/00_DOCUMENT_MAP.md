# BoxOp — Definitive Document Map

> This package supersedes every previous BoxOp specification. Claude/Claude Code should treat only this package and later explicitly approved amendments as authoritative.

## Reading order
1. `01_PRODUCT_VISION.md` — what BoxOp is and is not.
2. `02_MASTER_ARCHITECTURE.md` — system layers and engineering boundaries.
3. `03_CLAUDE_CODE_RULES.md` — permanent coding-agent rules.
4. `04_SMART_MEASURE.md` — object measurement engine.
5. `05_SELECTIVE_SPACE_MAPPER.md` — bounded, user-selected spatial mapping.
6. `06_SPOT_BIN_MODEL.md` — Spot vs Bin definitions, relationships and workflows.
7. `07_SMART_PLACEMENT.md` — fit, ranking and assignment.
8. `08_DIGITAL_RECORDS.md` — saved object/inspection records.
9. `09_CAMERA_SENSOR_HARDWARE.md` — phone sensors and optional accessories.
10. `10_DATA_MODEL.md` — canonical domain entities.
11. `11_OFFLINE_SYNC_DESKTOP.md` — offline-first and desktop synchronization.
12. `12_UI_UX_DESIGN_SYSTEM.md` — visual/interaction rules.
13. `13_SCREEN_SPECIFICATIONS.md` — screen-by-screen behavior.
14. `14_LOCALIZATION_LANGUAGE.md` — English engineering + multilingual UI.
15. `15_EXPORTS_INTEGRATIONS.md` — reports, sharing and future APIs.
16. `16_TESTING_VALIDATION.md` — measurement validation.
17. `17_IMPLEMENTATION_ROADMAP.md` — build phases and gates.
18. `18_CLAUDE_HANDOFF.md` — exactly how to start Claude Code.
19. `19_SESSION_TASK_TEMPLATE.md` — reusable per-task prompt.
20. `20_PHASE0_EXECUTION_RESEARCH_PROMPT.md` — Phase 0 kickoff instruction: capability spike, benchmark protocol and required pre-implementation report.
21. `21_AR_MEASUREMENT_SYSTEM.md` — deep technical dive on the AR measurement engine (modes, tracking, coordinate spaces, accuracy validation). Subordinate to `04_SMART_MEASURE.md`; read that first.
22. `22_AR_MEASUREMENT_ROADMAP_DETAIL.md` — milestone-level detail for the AR work inside Phases 2/5/6/8/9/10 of `17_IMPLEMENTATION_ROADMAP.md`. Does not reorder phases or move the Phase 0 gate.
23. `23_AR_PLATFORM_INTEGRATION_ADDENDUM.md` — candidate shared-UI/native-adapter bridge strategy, applicable only if Phase 0 selects a shared cross-platform layer.
24. `24_AR_CAPABILITIES_ADDENDUM.md` — Cylinder geometry and Multi-Measurement Session/Measurement Calculator, extending `21_AR_MEASUREMENT_SYSTEM.md`. Phase 2/5 scope, not required for Phase 0.
25. `25_MEASUREMENT_TOOLS_CATALOG.md` — the full target tool catalog (Line through Pit, 3 capability levels) for Smart Measure. Target capability list, not implementation status — see `phase0/TOOL_REGISTRY_STATUS.md` for what's actually built.

**Framework note**: docs 21–23 mention a shared cross-platform UI layer
(Flutter is discussed as one candidate) alongside native ARKit/ARCore
adapters. This remains a candidate under evaluation, not a decision —
`02_MASTER_ARCHITECTURE.md` ("Cross-platform decision") and
`20_PHASE0_EXECUTION_RESEARCH_PROMPT.md` section 6 still govern when and
how that choice gets made, from real-device Phase 0 evidence.

## Minimal context rule
Do not load all documents for every task.

Always load:
- `00_DOCUMENT_MAP.md`
- `01_PRODUCT_VISION.md`
- `02_MASTER_ARCHITECTURE.md`
- `03_CLAUDE_CODE_RULES.md`

Then load only the feature document(s) required by the current task.

## Canonical vocabulary
- **Object**: item/package being measured.
- **Bin**: a physical container, tote, box or reusable receptacle.
- **Spot**: a physical storage location/space such as a rack opening, shelf position, floor position or slot.
- **Space**: an optional bounded mapped zone used for spatial reference/calibration.
- **Record**: persistent digital measurement/inspection file.
- **Placement**: assignment of an Object and/or Bin to a Spot.

## Language
Code, identifiers, schemas and technical documentation are written in English. User-facing strings are localization keys with English and Spanish (`es-419`) support from the beginning.
