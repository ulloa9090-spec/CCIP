# 18 — Claude Handoff

## This package is authoritative
Ignore earlier BoxOp documents unless the user explicitly reintroduces a requirement. This consolidated package begins the implementation baseline.

## Initial files to give Claude
- `00_DOCUMENT_MAP.md`
- `01_PRODUCT_VISION.md`
- `02_MASTER_ARCHITECTURE.md`
- `03_CLAUDE_CODE_RULES.md`
- `17_IMPLEMENTATION_ROADMAP.md`

Then load module docs only as required.

## First prompt to Claude Code

> This repository is the beginning of the BoxOp application. The files in `/docs` are the canonical product and engineering specifications and supersede earlier drafts. Read `00_DOCUMENT_MAP.md`, `01_PRODUCT_VISION.md`, `02_MASTER_ARCHITECTURE.md`, `03_CLAUDE_CODE_RULES.md`, and `17_IMPLEMENTATION_ROADMAP.md`. Do not build the whole application yet. First inspect the repository and prepare Phase 0: real-device technical validation for iOS and Android. Before making a major architectural change, report the existing repository state, proposed technical-spike structure, iOS plan, Android plan, measurement benchmark plan, decisions that must remain open, and the exact first implementation step. Treat Spot (storage location) and Bin (physical container) as distinct entities. The application code/technical identifiers are English; all user-facing strings must be localization-ready for English and Spanish (`es-419`) from the first UI implementation. Do not claim unvalidated measurement precision.

## Context efficiency
If Claude Code can read `/docs`, do not paste the entire library into chat repeatedly. Point Claude to the specific documents needed for the current phase.

## Visual reference
Provide the approved UI concept image as inspiration alongside `12_UI_UX_DESIGN_SYSTEM.md` and `13_SCREEN_SPECIFICATIONS.md`. The image is conceptual; written specs govern behavior.
