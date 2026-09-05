# 20 — PHASE 0 EXECUTION & RESEARCH PROMPT

## Purpose

This document is the instruction set to give Claude/Claude Code before beginning Phase 0 of BoxOp.

Claude should treat the canonical BoxOp documentation already provided in `/docs` as the governing product specification.

# Instruction to Claude Code

Proceed with **Phase 0 — Real-Device Technical Validation / Capability Spike**.

The current environment may be an ephemeral Linux container without direct access to a physical iPhone or Android device. That limitation is understood and accepted.

Your responsibility in this phase is to prepare everything required so the real-device validation can be executed correctly by me on physical hardware.

Do **not** skip Phase 0 and do **not** make the final framework decision prematurely.

## 1. First inspect the project

Before making major changes:

- Inspect the repository structure.
- Identify what already exists.
- Identify languages, frameworks, dependencies and build tooling already present.
- Preserve working architecture unless there is a concrete technical reason to change it.
- Identify missing prerequisites for iOS and Android development.
- Report any blocking assumptions before implementation.

## 2. Build the Phase 0 test harness

Prepare the smallest coherent technical spike needed to validate the real capabilities of representative iPhone and Android devices.

### iOS validation

Prepare a compilable iOS test application or module capable of validating, where supported:

- camera preview and permissions;
- camera metadata;
- device motion / IMU;
- accelerometer and gyroscope;
- AR/spatial tracking;
- plane detection;
- world tracking and device pose;
- depth access;
- LiDAR access when available;
- ToF/depth-related capabilities exposed by the platform;
- device capability detection;
- fallback behavior when premium sensors are unavailable.

### Android validation

Prepare a compilable Android test application or module capable of validating, where supported:

- camera preview and permissions;
- camera metadata;
- device motion / IMU;
- accelerometer and gyroscope;
- AR/spatial tracking;
- plane detection;
- device pose;
- depth access;
- ToF/depth support when exposed;
- device capability detection;
- fallback behavior when advanced sensors are unavailable.

## 3. Capability matrix

The technical spike must report, per device:

- platform and OS version;
- device model;
- camera availability;
- AR/spatial support;
- plane detection support;
- IMU support;
- depth support;
- LiDAR/ToF availability when exposed;
- selected measurement strategy;
- fallback strategy;
- known limitations.

Do not hard-code assumptions that only apply to premium phones.

## 4. Measurement benchmark

Prepare a repeatable benchmark protocol using simple rectangular reference objects with independently verified dimensions.

Test:

- length;
- width;
- height;
- calculated volume;
- repeated measurements;
- multiple camera distances;
- multiple viewing angles;
- normal indoor lighting;
- different surface characteristics when practical.

For every test record:

- ground-truth dimensions;
- measured dimensions;
- absolute error;
- percentage error;
- repeatability;
- time to result;
- device used;
- method used;
- sensors used;
- confidence/uncertainty;
- notes about failures or environment.

Do not claim a precision target until empirical test data supports it.

## 5. Real-device execution

Because physical hardware is required, prepare:

- compilable projects;
- exact setup instructions;
- exact build/run steps;
- exact device connection steps;
- required permissions;
- benchmark procedure;
- result-capture format;
- troubleshooting instructions.

Guide me step by step when I execute the tests on my own iPhone and Android hardware.

Assume I may not be an experienced mobile developer, so instructions should be precise without being unnecessarily complicated.

## 6. Architecture decision after Phase 0

Do not finalize the production mobile framework until real-device results are available.

After benchmark data is collected, evaluate whether BoxOp should use:

- native iOS + native Android implementations with shared specifications/domain contracts; or
- a shared cross-platform layer with native camera/AR/sensor bridges.

Base the recommendation on:

- camera and spatial API access;
- sensor support;
- depth/LiDAR/ToF integration;
- performance;
- reliability;
- maintainability;
- testing complexity;
- long-term extensibility;
- final user experience.

Do not choose a framework merely because it shares more code.

## 7. External research and resources are authorized

You are explicitly authorized to use external technical resources whenever they improve implementation or reduce uncertainty.

You may use, where appropriate:

- official Apple documentation;
- official Google / Android documentation;
- ARKit documentation;
- ARCore documentation;
- camera and sensor documentation;
- GitHub repositories;
- reputable open-source libraries;
- SDK examples;
- reference implementations;
- technical papers;
- vendor documentation;
- package registries;
- development tools;
- Claude skills;
- MCP tools;
- other relevant technical resources available to your environment.

Prefer official documentation and well-maintained, reputable repositories.

When using a third-party library, repository or implementation:

- verify that it is actively maintained;
- review its license;
- evaluate security implications;
- confirm platform compatibility;
- avoid unnecessary dependencies;
- explain why it is being introduced.

Do not introduce a paid service or major architectural dependency without informing me first.

## 8. Product quality standard

BoxOp should be developed as a **high-end, modern, production-quality application**, not as a disposable prototype.

Engineering decisions should support a future application that is:

- sophisticated;
- fast;
- visually polished;
- intuitive;
- stable;
- scalable;
- maintainable;
- privacy-conscious;
- accessible;
- offline-capable;
- technically current;
- adaptable to future sensors and hardware.

The final product should feel like a professional measuring instrument rather than a generic warehouse form application.

Use current stable technologies and modern engineering practices where they materially improve quality.

Do not pursue novelty simply for its own sake. Prefer technology that is proven, supportable and appropriate.

## 9. Sensor philosophy

BoxOp should make the best possible use of available hardware while remaining usable across different phone capabilities.

Potential sources include:

- RGB camera;
- IMU;
- accelerometer;
- gyroscope;
- spatial tracking;
- depth;
- LiDAR;
- ToF;
- calibrated visual references;
- optional BLE sensors;
- optional Bluetooth scales;
- future portable measurement hardware.

All hardware access should remain modular behind well-defined adapters.

The core application must not depend on a single phone model.

## 10. Measurement integrity

Physical dimensions must come from geometry, calibrated references and validated sensor observations.

Generative AI may assist with:

- segmentation;
- object recognition;
- workflow guidance;
- note interpretation;
- recommendation explanations.

Generative AI must **never invent physical dimensions**.

If measurement quality is poor, the system should:

- request another view;
- request movement;
- request a reference;
- lower confidence;
- or refuse to return a final measurement.

It should never return a confident-looking but unsupported value.

## 11. Respect the BoxOp storage model

Canonical domain distinction:

- **Object** = item/package being measured.
- **Bin** = physical container.
- **Spot** = storage location/opening/space.
- **Space** = optional bounded mapped zone.

Do not treat Bin and Spot as interchangeable.

Do not automatically map an entire warehouse.

Spatial mapping must remain user-selected and bounded.

## 12. Language and localization

Engineering remains in English:

- code;
- identifiers;
- schemas;
- APIs;
- filenames;
- technical documentation.

User-facing UI must be localization-ready from the start.

Initial supported languages:

- English;
- Spanish (`es-419`).

Do not scatter hard-coded UI strings throughout the codebase.

## 13. What not to build in Phase 0

Do not expand into the following yet unless strictly required for the technical spike:

- full Bin Manager;
- full Spot Manager;
- advanced placement AI;
- cloud backend;
- desktop application;
- production sync;
- WMS/ERP integrations;
- advanced packing;
- portable hardware product;
- final visual polish.

Phase 0 exists to validate the measurement and sensor foundation first.

## 14. Required response before major implementation

Before making a major architectural change, report:

1. Current repository assessment.
2. Proposed Phase 0 project/module structure.
3. iOS technical-spike plan.
4. Android technical-spike plan.
5. Sensor/capability matrix design.
6. Benchmark protocol.
7. External resources or repositories you expect to use.
8. Architecture decisions that must remain open until real-device testing.
9. Exact first implementation step.

Then proceed with the smallest coherent Phase 0 implementation.

## 15. Definition of Phase 0 complete

Phase 0 is complete only when:

- a representative iPhone can run the test harness;
- a representative Android phone can run the test harness;
- capability detection works;
- camera/spatial observations can be captured;
- relevant sensors are identified correctly;
- at least one rectangular-object measurement benchmark has been executed;
- measurements are compared with ground truth;
- error and repeatability are recorded;
- limitations are documented;
- the recommended production architecture is based on evidence from the real-device tests.

Until those conditions are met, do not treat the production framework decision as final.
