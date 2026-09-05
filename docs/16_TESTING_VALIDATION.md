# 16 — Testing & Validation

## Principle
Accuracy is an empirical engineering metric.

## Ground truth
Use independently verified rigid reference objects and appropriate physical measuring tools/procedures.

## Matrix
Vary:
- target type: Object/Bin/Spot
- size
- distance
- angle
- lighting
- texture
- reflective/dark surfaces
- clutter/occlusion
- device model
- depth/no-depth
- reference/no-reference
- handheld/station

## Metrics
Per dimension:
- absolute error
- percentage error
- bias
- repeatability
- failure rate
- time to result

Also volume error.

## Fit validation
Test boundary cases where an Object/Bin:
- clearly fits;
- barely fits;
- fails one dimension;
- fits only after rotation;
- violates clearance;
- violates weight/status rules.

## Regression
Maintain physical regression objects and reproducible test cases.

Fail clearly rather than returning false confidence.
