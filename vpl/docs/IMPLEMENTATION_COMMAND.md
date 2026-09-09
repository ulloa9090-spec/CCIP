# Prompt inicial para Claude Code

Pega este bloque en Claude Code después de colocar este paquete en el repositorio.

---

Lee primero:

1. `00_START_HERE.md`
2. `CLAUDE.md`
3. `docs/ARCHITECTURE.md`
4. `docs/TECH_STACK.md`
5. `docs/DATA_MODEL.md`
6. `docs/SCIENTIFIC_RULES.md`
7. `docs/TESTING_STRATEGY.md`
8. `docs/phases/PHASE_0_REPOSITORY_FOUNDATION.md`

Tu única tarea ahora es **Phase 0**.

No implementes Phase 1 ni funcionalidades de visión computacional todavía.

Antes de modificar archivos:

1. inspecciona el repositorio;
2. reporta el estado actual;
3. identifica conflictos con la arquitectura;
4. presenta un plan corto de Phase 0;
5. implementa sólo después de esa revisión.

Reglas:

- no hardcodear lógica Powerball en core;
- preservar modularidad;
- usar TypeScript strict;
- usar Python con typing;
- añadir tests;
- registrar dependencias y licencias;
- no introducir servicios pagos;
- no implementar un digital twin;
- no entrenar modelos;
- no descargar datasets externos automáticamente.

Al terminar:

1. ejecuta tests;
2. ejecuta build;
3. crea `PHASE_0_RESULT.md`;
4. incluye comandos exactos para reproducir;
5. detente y espera aprobación.

La fase no está completa si build o tests fallan.
