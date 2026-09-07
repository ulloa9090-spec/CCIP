# 14 — Localization & Language Policy

## Engineering language
Use English for:
- source code
- variables/functions/classes
- filenames
- database/schema identifiers
- API contracts
- logs intended for developers
- technical Markdown documentation

## User interface
All user-facing text must be localization-ready from the first screen.

Initial locales:
- English (`en`)
- Spanish — Latin America (`es-419`)

Do not hard-code UI strings throughout views/components.

## Locale behavior
- default to device/app language preference;
- allow manual language selection;
- persist preference;
- use locale-aware number/date formatting;
- support unit preferences independently of language.

## Measurement units
Internal canonical units remain independent from display locale.
Support at minimum:
- inches / feet where appropriate;
- centimeters / meters where appropriate.

Never convert by string manipulation; use typed/unit-aware conversion logic.

## Translation workflow
English is the source language for keys/specification. Spanish translations
use clear Latin American terminology and preserve the canonical concepts
defined in `06_SPOT_BIN_MODEL.md` and `00_DOCUMENT_MAP.md` — a Spanish term
never gets to redefine which entity is which; it only names the entity that
already exists.

Canonical terminology:

| English | Spanish (`es-419`) |
|---|---|
| Spot | `Ubicación`, or contextually `Espacio de almacenamiento` |
| Bin | `Contenedor` |
| Bin Location (the Spot a Bin currently sits at) | `Ubicación del contenedor` |
| Storage Bin (a Bin, formal/compound phrasing) | `Contenedor de almacenamiento` |
| Space / Measurement Zone (`05_SELECTIVE_SPACE_MAPPER.md`'s `Space` entity) | `Zona de medición` |

`Bin` is always a physical container in BoxOp — see `06_SPOT_BIN_MODEL.md`
("Bin = physical container ... tote, crate, parts bin"). Do not introduce an
alternate Spanish rendering of `Bin` (e.g. `Espacio`) that isn't a container,
even from an external template or spec — it would collide with `Espacio de
almacenamiento`, the existing contextual translation of `Spot`, and with
`Space`/`Zona de medición` above.

In technical/internal identifiers (code, keys, schemas), always preserve the
canonical English domain term (`Bin`, `Spot`, `Space`) — this is the general
rule from "Engineering language" above, not a UI-only exception.

The UI may show the English domain term in parentheses when useful during
early releases, e.g. `Contenedor (Bin)`.
