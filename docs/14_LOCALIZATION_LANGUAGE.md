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
English is the source language for keys/specification. Spanish translations should use clear Latin American terminology and preserve canonical concepts:
- Spot → `Ubicación` or contextual `Espacio de almacenamiento`
- Bin → `Contenedor`
The UI may show the English domain term in parentheses when useful during early releases.
