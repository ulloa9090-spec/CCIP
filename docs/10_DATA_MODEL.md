# 10 — Canonical Data Model

## Entities
- User
- Device
- SensorProfile
- Space
- Anchor
- Spot
- Bin
- Object
- Measurement
- Record
- Media
- Note
- Weight
- Placement
- Report
- SyncOperation

## Key relationships
- `Space 0..1 → many Spots`
- `Spot 0..1 ← current Bin`
- `Spot 0..1 ← direct Object placement`
- `Bin 0..1 ← Object placement`
- `Object/Bin/Spot → many Measurements`
- `Record → media/notes`
- `Placement → history`

## Measurement minimum
`id, targetType, targetId, length, width, height, volume, baseUnit, uncertainty, confidenceClass, method, deviceId, spaceId?, calibrationId?, createdAt`

## Spot minimum
`id, code, name?, usableLength, usableWidth, usableHeight, clearance, maxWeight?, location?, status, spaceId?, transform?, createdAt`

## Bin minimum
`id, code, name?, internalLength, internalWidth, internalHeight, externalLength?, externalWidth?, externalHeight?, maxWeight?, tareWeight?, status, currentSpotId?, createdAt`

## Object minimum
`id, code?, name?, weight?, currentBinId?, currentSpotId?, createdAt`

## Pending entities (not yet implemented)
`24_AR_CAPABILITIES_ADDENDUM.md` introduces `MeasurementSession` (owns
many `MeasurementGeometry`) as a grouping layer above the `Measurement`
entity above — e.g. one session against Bin A-104 holding a Line, a
Height and a Cuboid measurement together. Add these two entities here
with their fields once that capability is implemented; until then this
section is the pointer, not the schema.

## Rules
- UUID-style stable IDs
- canonical base unit internally
- display conversion separately
- version calibrations
- preserve raw provenance
- media separate from relational metadata
- explicit migrations
- indexed code/date/location/status searches
