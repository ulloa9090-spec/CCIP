# 05 — Selective Space Mapper

## Definition
A Space is an optional bounded 3D reference zone created deliberately by the user.

Examples:
- measurement station;
- rack section;
- marked floor area;
- one room section.

## Non-goal
Do not silently scan/model the whole warehouse.

## Create
1. New Space.
2. Establish floor/orientation.
3. Define selected boundaries.
4. Add/observe anchors or known geometry.
5. Validate calibration.
6. Name/save.

## Reopen
Relocalize and validate against known anchors/geometry. Require recalibration when residual error is too high.

## Relationship
A Spot may optionally have a transform inside a Space.
A Bin may optionally be physically located at a Spot.
Neither Spot nor Bin requires a Space.

## Precision
Persistent SLAM can drift. Precision workflows must validate old transforms before use.
