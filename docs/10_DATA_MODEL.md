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

## Rules
- UUID-style stable IDs
- canonical base unit internally
- display conversion separately
- version calibrations
- preserve raw provenance
- media separate from relational metadata
- explicit migrations
- indexed code/date/location/status searches
