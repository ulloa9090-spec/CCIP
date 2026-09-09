# Visual Physics Lab — START HERE

## Objetivo

Este paquete inicia el desarrollo de **Visual Physics Lab (VPL)** con Claude Code.

VPL será una plataforma local-first para:

- importar videos;
- preservar originales;
- extraer metadata;
- detectar escenas y cortes;
- calibrar geometría;
- detectar y segmentar objetos;
- hacer multi-object tracking;
- calcular trayectorias, velocidad, aceleración y eventos;
- mantener identidad probabilística cuando exista oclusión;
- reconstruir geometría 3D;
- construir un gemelo digital;
- comparar observación real vs simulación;
- consultar resultados mediante un asistente científico;
- mantener provenance, confianza y reproducibilidad.

Powerball será el **primer perfil de investigación**, pero el núcleo no debe depender de Powerball.

---

# Orden obligatorio

Claude Code debe trabajar **una fase a la vez**.

No avanzar de fase hasta cumplir los criterios de aceptación de la fase actual.

Orden:

1. Phase 0 — Repository Foundation
2. Phase 1 — Desktop Shell + Project Workspace
3. Phase 2 — Video Ingestion
4. Phase 3 — Scene / Quality Engine
5. Phase 4 — Geometry & Calibration
6. Phase 5 — Detection & Segmentation
7. Phase 6 — Tracking
8. Phase 7 — Physics Metrics
9. Phase 8 — Identity / OCR / Re-identification
10. Phase 9 — Scientific Dataset + Explorer
11. Phase 10 — 3D Reconstruction
12. Phase 11 — Digital Twin
13. Phase 12 — Calibration & Simulation Comparison
14. Phase 13 — Scientific Assistant
15. Phase 14 — Automation / Source Watcher

---

# Regla crítica

Nunca presentar como hecho algo que sea:

- estimado;
- inferido;
- reconstruido;
- interpolado;
- simulado.

Usar siempre estas etiquetas:

```text
OBSERVED
MEASURED
CALCULATED
ESTIMATED
INFERRED
SIMULATED
HYPOTHESIS
UNKNOWN
```

Toda salida científica debe incluir:

```text
value
unit
source
video_id
frame/timestamp
algorithm
algorithm_version
parameters
confidence
run_id
```

---

# Primer objetivo técnico

El MVP inicial termina cuando el sistema puede:

1. crear un proyecto;
2. importar un video;
3. calcular SHA-256;
4. obtener metadata con FFprobe;
5. crear proxy normalizado;
6. detectar escenas;
7. reproducir frame-by-frame;
8. permitir definir regiones;
9. detectar bolas u objetos;
10. generar Track_ID;
11. exportar resultados a CSV y Parquet.

No construir todavía el digital twin antes de completar este MVP.

---

# Archivos clave

- `CLAUDE.md` — instrucciones permanentes para Claude Code.
- `docs/ARCHITECTURE.md` — arquitectura del sistema.
- `docs/TECH_STACK.md` — tecnologías.
- `docs/DATA_MODEL.md` — modelo de datos.
- `docs/SCIENTIFIC_RULES.md` — reglas de evidencia.
- `docs/TESTING_STRATEGY.md` — estrategia de pruebas.
- `docs/phases/` — implementación fase por fase.
- `docs/specs/POWERBALL_PROFILE.md` — primer perfil científico.
