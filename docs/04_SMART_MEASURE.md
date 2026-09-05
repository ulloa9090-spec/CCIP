# 04 — Smart Measure

## Purpose
Measure an Object, Bin or Spot using a common measurement engine.

## Modes
### Automatic
Point → acquire useful observations → segment/identify target → fit geometry → return dimensions.

### Adaptive Guided
Ask only for missing evidence: top view, side view, closer distance, movement around target or visible reference.

### Point-to-Point
Manual user-selected endpoints/planes.

### Reference-Assisted
Use a known marker, board, mat or rigid reference to establish/validate scale.

### Station Mode
Measure relative to a validated saved Space.

## Target type
Before or during capture, measurement context can be:
- `Object`
- `Bin (Container)`
- `Spot (Storage Location)`

The same engine is reused; domain-specific save fields change.

## Result
- L/W/H
- volume
- units
- method
- confidence class
- estimated uncertainty
- device/calibration provenance
- optional evidence references

## UX states
`Point at target` → `Hold steady` → `Result`

Corrective guidance examples:
- Move closer
- Show the top
- Move slightly right
- Reference not visible
- Tracking lost

No unvalidated precision claim.
