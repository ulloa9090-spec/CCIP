# iOS Point-to-Point AR Measurement — Real-Device Accuracy Baseline

First physical accuracy data for BoxOp's AR point-to-point measurement,
per `phase0/shared/BENCHMARK_PROTOCOL.md`. Captured on the same device
already validated for capability detection — see `RESULT.md` in this
folder (`iPhone18,2`, iOS 26.6.1, Tier C/LiDAR).

Raw data: [`point-to-point-benchmark-2026-09-07.csv`](./point-to-point-benchmark-2026-09-07.csv).

## Results

| True distance | True (m) | BoxOp result | Absolute error | Percent error |
|---|---:|---:|---:|---:|
| 10 in | 0.2540 m | 0.260 m | +6.0 mm | +2.36% |
| 20 in | 0.5080 m | 0.5153 m (avg of 3) | +7.3 mm | +1.44% |
| 30 in | 0.7620 m | 0.767 m | +5.0 mm | +0.66% |
| 40 in | 1.0160 m | 1.021 m | +5.0 mm | +0.49% |

20-inch repeatability (3 independent trials): 0.517 m, 0.515 m, 0.514 m —
range 3 mm.

## Preliminary interpretation

- Good short-run repeatability (3 mm range across 3 trials at 20 in).
- A consistent **positive** absolute bias of roughly **+5 to +7 mm**
  across the tested range.
- No clear evidence yet that absolute error grows proportionally with
  distance (it stays in a narrow 5–7 mm band from 10 in to 40 in).
- Percentage error *decreases* as distance increases, simply because the
  same ~5–7 mm bias is a smaller fraction of a larger true distance.

This is a **preliminary baseline**, not a calibration model — see the
constraints below and in `phase0/shared/BENCHMARK_PROTOCOL.md`.

## Important: an unexercised path

The capability report recommends *"Reference-Assisted / Station Mode
using LiDAR scene mesh"* for this device (it has LiDAR). **The current
point-to-point implementation does not use that path yet** — its raycast
is plane-based only (`ARRaycastQuery.Target.existingPlaneGeometry`,
falling back to `.estimatedPlane`), never `.estimatedPlane`'s LiDAR-aware
alternative or actual scene-mesh hit testing. So this baseline measures
ARKit's plane-tracking accuracy, not the device's best-case LiDAR
accuracy — a real, currently-untested axis for future improvement, not
evidence that LiDAR wouldn't help.

## Constraints on what happens next (binding until superseded)

- **Do not** compensate by subtracting a hardcoded 5–7 mm offset.
- **Do not** introduce calibration constants yet.
- **Preserve raw AR measurement behavior** — nothing between the raycast
  result and the displayed number.
- The next UI/interaction increment (continuous multi-point measurement)
  **must not hide or artificially correct** this baseline.

These are now encoded in `phase0/shared/BENCHMARK_PROTOCOL.md` directly
so they bind future work on this repo, not just this conversation.

## Open error sources for future controlled testing

Not yet isolated from one another — each needs its own controlled test
before any calibration is justified:

- manual endpoint placement (human tap/reticle precision);
- raycast target selection (which plane/point actually got hit);
- existing-plane geometry accuracy;
- estimated-plane fallback accuracy;
- camera pose / tracking stability over the measurement;
- LiDAR / scene reconstruction quality (unexercised so far — see above);
- user motion during capture;
- viewing angle relative to the measured line;
- surface texture and lighting.
