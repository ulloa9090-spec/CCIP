# 07 — Smart Placement

## Stage 1: deterministic compatibility
For each candidate:
1. apply clearances;
2. enumerate allowed 3D orientations;
3. compare all three dimensions;
4. apply weight/status constraints;
5. return valid orientations.

## Supported comparisons
- Object → Spot
- Object → Bin
- Bin → Spot

## Stage 2: ranking
Rank valid destinations by:
- least wasted usable volume;
- preferred clearance;
- zone;
- accessibility;
- availability/occupancy;
- business rules.

## Stage 3: AI assistance
AI may explain/rank soft preferences or interpret notes. It cannot override geometry, weight or safety constraints.

## Output
- compatible/not compatible;
- best destination;
- alternatives;
- orientation;
- remaining clearance;
- reason/warnings.

## Assignment
Persist current placement plus history.
