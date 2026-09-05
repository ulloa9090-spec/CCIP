# 06 — Spot & Bin Model

## Critical distinction

### Spot = storage location / opening / physical position
Examples:
- rack opening A-01-03;
- shelf position;
- floor slot;
- pallet position;
- empty cubby/opening.

A Spot is **where something can be placed**.

### Bin = physical container
Examples:
- black/yellow storage tote;
- reusable plastic container;
- crate;
- parts bin.

A Bin is **a physical container that itself can be placed in a Spot**.

### Object = item/package
Example:
- cardboard shipping box;
- product;
- parcel.

An Object can be placed directly in a Spot or inside a Bin, depending on workflow.

## UI terminology
Use explicit labels:
- `Spot (Storage Location)`
- `Bin (Container)`

A measurement selector can switch:
`Object | Spot | Bin`

## Spot fields
- ID/code/name
- usable internal/opening L/W/H
- clearances
- max weight
- zone/rack/location
- status
- photo
- notes/tags
- optional `spaceId` and transform

## Bin fields
- ID/code/name
- usable internal L/W/H
- external L/W/H when useful
- max weight
- tare weight when useful
- status
- photo
- notes/tags
- current `spotId` optional

## Relationships
- Spot can hold a Bin.
- Spot can hold an Object directly.
- Bin can contain one or more Objects in future occupancy workflows.
- Bin can move between Spots.
- Object placement history must remain auditable.

## Compatibility
Evaluate:
- Object → Spot
- Object → Bin
- Bin → Spot

Use the appropriate internal/external dimensions:
- Object→Bin uses Bin internal usable dimensions.
- Bin→Spot uses Bin external dimensions vs Spot usable dimensions.
- Object→Spot uses Object dimensions vs Spot usable dimensions.

## Assignment examples
`Object BOX-100 → Spot R1-S3`
`Object BOX-101 → Bin BIN-22 → Spot R2-S1`

This distinction is canonical for all future implementation.
