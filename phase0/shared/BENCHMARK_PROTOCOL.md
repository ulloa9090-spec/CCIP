# Phase 0 — Measurement Benchmark Protocol

Implements `docs/20_PHASE0_EXECUTION_RESEARCH_PROMPT.md` section 4 and
`docs/16_TESTING_VALIDATION.md`. This protocol is executed by a human on
real hardware — the harness apps only capture the `measuredCm` value and
the sensor context; everything else is filled in by the tester.

## 1. Ground-truth reference objects

Before testing, assemble **at least 3 rigid rectangular objects** and
measure each with a tape measure or calipers, independently, to the
nearest millimeter. Write the verified dimensions down before opening the
app — never adjust ground truth after seeing an app result.

Suggested set (adjust to what you have on hand):

| Label | Suggested object | Approx. size |
|---|---|---|
| `REF-S` | Small shoebox or parcel | ~20 × 15 × 10 cm |
| `REF-M` | Medium moving/shipping box | ~40 × 30 × 25 cm |
| `REF-L` | Large moving box or storage tote | ~60 × 40 × 40 cm |

Record each object's verified `length`, `width`, `height` in the CSV
template (`benchmark-results-template.csv`) once, then reuse that label
for every trial.

## 2. Method under test (Phase 0 slice)

Phase 0's harness ships **capability detection only** (see
`phase0/README.md` for why). The point-to-point AR measurement screen
described below is the immediate next task; this protocol is written now
so it is ready the moment that screen lands, and so the capability data
already collected can be cross-referenced with benchmark runs later.

When the point-to-point measurement screen is available, the method is:
tap one edge endpoint, tap the opposite endpoint, the app raycasts both
taps onto the AR world mesh/plane and reports the 3D distance. One edge
(one axis) is measured per pair of taps; length, width and height of the
same object are three separate measurement passes.

## 3. Variables to vary across trials

For each reference object, repeat the measurement while varying:

- **Axis**: length, width, height (separately).
- **Distance from object**: ~0.5 m, ~1 m, ~2 m.
- **Viewing angle**: front-on (~0°), ~30°, ~45° off-axis.
- **Lighting**: normal indoor room lighting, and one low-light pass.
- **Surface**: as available — matte cardboard, glossy/reflective, dark-colored.
- **Repeat trials**: at least 5 repetitions per (axis, distance, angle)
  combination to measure repeatability, not just single-shot error.

Do not change more than one variable at a time when trying to explain a
specific failure.

## 4. What to record per trial

One row per trial in `benchmark-results-template.csv`:

- `testId` — sequential.
- `platform`, `deviceModel`, `osVersion`.
- `objectLabel` (`REF-S` / `REF-M` / `REF-L`).
- `axis` (`length` / `width` / `height`).
- `groundTruthCm` — from step 1, never edited afterward.
- `measuredCm` — value the app reports.
- `absoluteErrorCm` — `|measuredCm - groundTruthCm|`.
- `percentErrorPct` — `absoluteErrorCm / groundTruthCm * 100`.
- `trialNumber` — 1..5+ for repeatability.
- `distanceFromObjectM`, `viewingAngleDeg`, `lighting`, `surface`.
- `method` — always `"point-to-point"` for this phase.
- `sensorsUsed` — free text, e.g. `"AR world tracking, no LiDAR"`.
- `timeToResultSec` — wall-clock from first tap to result shown.
- `confidenceNote` — anything the app surfaced about tracking quality.
- `environmentNotes` — anything unusual (clutter, reflections, tracking loss).

## 5. Metrics to compute afterward

Per dimension and per device:

- Mean absolute error, mean percentage error.
- Bias (signed mean error — does the app systematically over/under-measure?).
- Repeatability (standard deviation across repeated trials of the same setup).
- Failure rate (trials where no result was produced, or the app requested recalibration).
- Median time to result.

Also compute volume error: `measuredVolume = L×W×H (measured)` vs.
`groundTruthVolume`, as percentage error.

## 6. Boundary/fit cases (for later — Phase 5 prep, not required in Phase 0)

Once Spot/Bin compatibility exists, re-run this protocol against cases
where an object clearly fits, barely fits, fails one dimension, fits only
after rotation, or violates a clearance/weight rule. Not applicable yet —
recorded here so the same CSV shape can be extended later without
redesigning it.

## 7. Reporting

Never claim a precision target (e.g. "±1 cm") until this benchmark has
run on both a representative iPhone and a representative Android device
with real ground-truth data. Until then, precision claims in any UI or
documentation must stay qualitative (`measured` / `estimated` / `low
confidence`), per `docs/01_PRODUCT_VISION.md` ("Trust") and
`docs/16_TESTING_VALIDATION.md`.

## 8. Do not calibrate yet

A first real baseline exists for iOS point-to-point
(`phase0/evidence/ios/POINT_TO_POINT_BENCHMARK.md`): a consistent
positive bias of roughly +5 to +7 mm across 10–40 in, good short-run
repeatability, no evidence yet that error scales with distance. Until a
future task explicitly revisits this section:

- **Do not** compensate by subtracting a hardcoded offset derived from
  one baseline.
- **Do not** introduce calibration constants into the measurement code.
- **Preserve raw AR measurement behavior** — the displayed number is
  exactly what the raycast produced, nothing between them.
- A new UI/interaction increment (e.g. multi-point/polyline measurement)
  **must not hide or artificially correct** the existing baseline; if
  anything, expose more of the raw signal (per-segment method/source),
  not less.
- This rule applies equally to **angle** measurements, not just
  distance: a first data point (`TOOL_REGISTRY_STATUS.md` "Angle" row,
  2026-09-08) measured a geometrically-90° corner as 88.8° — the raw
  value, not rounded or snapped toward 90°, for the same reason as
  above.

Rationale: one baseline on one device cannot distinguish the open error
sources below from each other, so any constant derived from it would be
overfit noise dressed up as calibration. Revisit only after controlled
tests isolate which source(s) actually dominate:

- manual endpoint placement (human tap/reticle precision);
- raycast target selection (which plane/point actually got hit);
- existing-plane geometry accuracy;
- estimated-plane fallback accuracy;
- camera pose / tracking stability over the measurement;
- LiDAR / scene reconstruction quality (current raycast path doesn't use
  it yet — see `POINT_TO_POINT_BENCHMARK.md` "an unexercised path");
- user motion during capture;
- viewing angle relative to the measured line;
- surface texture and lighting.
