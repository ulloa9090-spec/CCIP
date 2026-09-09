# Visual Physics Lab — Resumen técnico

> Lectura del starter pack importado en `vpl/`. Describe planes y mockups conceptuales — nada de esto está implementado todavía.

**Fuente:** `VPL_ClaudeCode_Starter_Pack_v1.0.zip` · **Destino:** `vpl/` (subcarpeta de `CCIP`) · **Perfil inicial:** `powerball` · **Fases definidas:** 15 (0 → 14) · **Estado:** docs — sin implementar

---

## 1. Lo que entendí

VPL es una app de escritorio **local-first** que convierte grabaciones de video en datos científicos trazables: importa, calibra, detecta, trackea y mide — sin presentar como hecho nada que no esté sostenido por evidencia.

### Qué hace
Importa video preservando el original, extrae metadata (FFprobe), detecta escenas y calidad, calibra geometría de la escena, detecta y segmenta objetos, hace tracking multi-objeto, calcula trayectoria/velocidad/aceleración/eventos, reconstruye geometría 3D, construye un gemelo digital y lo compara contra la observación real, y expone todo mediante un asistente científico consultable.

### Perfil vs. núcleo
`Powerball` es el primer caso de estudio (69 bolas blancas, 26 rojas, cámara de mezcla, brazos selectores) pero vive aislado en `profiles/powerball`. El core **no puede** depender de ese vocabulario: `69`, `26`, `Powerball`, `Halogen`, `lottery`.

### Regla epistémica
Ningún valor estimado, inferido, reconstruido, interpolado o simulado puede presentarse como hecho. Toda salida científica declara una de estas ocho etiquetas, más `unit`, `source`, `video_id`, `frame/timestamp`, `algorithm` + `algorithm_version`, `parameters`, `confidence` y `run_id`:

```text
OBSERVED   MEASURED    CALCULATED   ESTIMATED
INFERRED   SIMULATED   HYPOTHESIS   UNKNOWN
```

### Capas separadas
`UI · Domain/Core · Video · Vision · Tracking · Geometry · Physics · Simulation · Storage · Scientific Provenance · Profiles` no se mezclan entre sí — cada una reemplazable detrás de una interfaz de plugin.

### Reproducibilidad
Cada corrida (`Run`) registra `pipeline_version`, `git_commit`, hardware, versiones de software/modelo, parámetros, hashes de entrada/salida y timestamps. Los originales de video nunca se modifican — todo pasa por proxies.

### MVP inicial
```text
crear proyecto → importar video → SHA-256 → FFprobe → proxy normalizado
→ detectar escenas → reproducir frame-a-frame → definir regiones
→ detectar objetos → generar Track_ID → exportar CSV/Parquet
```
El gemelo digital queda **fuera** de esta primera meta.

### Disciplina
Una fase a la vez. Cada fase cierra con un `PHASE_RESULT.md` (`status`, `implemented`, `files_changed`, `tests`, `metrics`, `known_issues`, `next_phase_blockers`) y espera aprobación antes de continuar.

---

## 2. Orden de fases (15, en 5 etapas)

### I. Fundamentos
| Fase | Nombre | Objetivo |
|---|---|---|
| 0 | Repository Foundation | Monorepo, Tauri+React+TS, workspace Python, lint/tests, Run_ID mínimo. |
| 1 | Desktop Workspace | Crear/abrir proyecto, elegir raíz de almacenamiento, manifest, panel de status. |
| 2 | Video Ingestion | Drag&drop, SHA-256, FFprobe, generación de proxy, originales de solo lectura. |

### II. Percepción
| Fase | Nombre | Objetivo |
|---|---|---|
| 3 | Scene & Quality Engine | PySceneDetect, cortes, blur/freeze score, muestreo de frames útiles. |
| 4 | Geometry & Calibration | Regiones, referencia de escala, homografía, espacios de coordenadas explícitos. |
| 5 | Detection & Segmentation | DetectorPlugin, segmentación, overlay en UI, inferencia por lotes. |
| 6 | Tracking | TrackerPlugin (ByteTrack/BoT-SORT), estado por frame, oclusión, ID switches. |

### III. Ciencia
| Fase | Nombre | Objetivo |
|---|---|---|
| 7 | Physics Metrics | Velocidad, aceleración, movimiento angular, candidatos de colisión, eventos. |
| 8 | Identity / OCR / Re-ID | Identidades candidatas con probabilidad, re-identificación, corrección humana. |
| 9 | Dataset Explorer | DuckDB + Parquet, registro de experimentos, explorador de datos. |

### IV. Simulación
| Fase | Nombre | Objetivo |
|---|---|---|
| 10 | 3D Reconstruction | COLMAP/Open3D, poses de cámara, visor 3D, escalado por objeto conocido. |
| 11 | Digital Twin | Evaluación de motor, representación de cámara/bolas/brazos, corridas de simulación. |
| 12 | Calibration & Comparison | Métricas real-vs-sim, búsqueda de parámetros, Monte Carlo, reporte de incertidumbre. |

### V. Automatización
| Fase | Nombre | Objetivo |
|---|---|---|
| 13 | Scientific Assistant | Consultas con citas a runs/frames, gráficos y tablas, sin inventar evidencia faltante. |
| 14 | Automation / Source Watcher | SourcePlugin, watcher programado, QC automático, reportes, sin duplicados. |

---

## 3. Interfaces conceptuales

El starter pack **no incluye wireframes**, solo criterios de aceptación por fase. Estos esquemas se derivan de esos criterios para dar forma a las cinco pantallas centrales del MVP.

### `workspace.projects` — Fase 1
Lista de proyectos (`MACHINE-A — sesión 04`, `calibración — banco`, …), selector de raíz de almacenamiento (`/Volumes/LAB_SSD/vpl`), estado del `project_manifest.json` (portable), perfil activo, y una franja de status: originales en solo lectura, proxies generados, run activo.

### `ingest.import` — Fase 2
Zona de drag&drop o import por ruta. Panel de metadata en cuanto se suelta el archivo:
```text
sha256:      3f9a…c02e
codec:       h264 / mp4
fps nominal: 29.970
fps medido:  29.964
proxy:       generando…
```

### `viewer.calibration` — Fases 3–4
Frame de video con una región dibujada a mano (polígono, p. ej. `region: selector`), una referencia de escala (`escala: 0.15 m`), y debajo un timeline segmentado por color: escena usable / corte / baja calidad.

### `viewer.tracking` — Fases 5–6
Mismo frame con cajas/círculos de detección, `Track_ID` persistente y confianza (`track_017 · 0.94`), un track marcado en oclusión (`track_022 · oclusión`), y chips para activar/desactivar tracks individuales.

### `explorer.dataset` — Fases 9 / 13
Barra de consulta (`velocity WHERE video_id = 'sesión_04' AND frame BETWEEN 1200:1400`) sobre una tabla de mediciones:

| medición | valor | estado | run |
|---|---|---|---|
| velocity_track_017 | 2.31 m/s | MEASURED | run_0412 |
| impact_energy | 0.08 J | CALCULATED | run_0412 |
| arm_rpm | — | UNKNOWN | — |

Cada fila debe poder abrir su procedencia: algoritmo, versión, parámetros y `run_id` detrás del dato.

---

## 4. Arquitectura y stack tecnológico

```text
Desktop UI  (Tauri · React · TypeScript)
   |
Application Services
   |
Domain / Core  (Project · Video · Track · Measurement · Run)
   |
-------------------------------------------------
| Video | Vision | Tracking | Geometry | Physics |
-------------------------------------------------
   |
Scientific Data Layer  (provenance · epistemic status · run lineage)
   |
Storage  (SQLite · DuckDB · Parquet · filesystem)
```

Lo marcado **a evaluar** es intencional: el propio `TECH_STACK.md` dice *"no elegir motor final hasta Fase 11"*.

| Categoría | Tecnología | Estado |
|---|---|---|
| Desktop | Tauri | confirmado |
| Desktop | React + TypeScript | confirmado |
| Desktop | Vite | confirmado |
| Backend científico | Python 3.12+ | confirmado |
| Backend científico | FastAPI / IPC | a evaluar |
| Backend científico | uv / Poetry | confirmado |
| Video | FFmpeg / FFprobe | confirmado |
| Video | OpenCV | confirmado |
| Video | PySceneDetect | confirmado |
| Datos | SQLite (estado app) | confirmado |
| Datos | DuckDB (análisis) | confirmado |
| Datos | Parquet + PyArrow | confirmado |
| Visión / ML | PyTorch + torchvision | confirmado |
| Visión / ML | YOLO (Ultralytics) | a evaluar (licencia/uso) |
| Visión / ML | SAM-family | a evaluar |
| Tracking | ByteTrack | baseline |
| Tracking | BoT-SORT | baseline |
| Tracking | OC-SORT | baseline |
| 3D | COLMAP | confirmado |
| 3D | Open3D | confirmado |
| 3D | Blender (inspección) | opcional |
| Simulación | PyBullet | a evaluar |
| Simulación | MuJoCo | a evaluar |
| Simulación | Project Chrono | a evaluar |

---

**Nada de esto está implementado.** Los archivos en `vpl/` son sólo el plan maestro y las especificaciones por fase; el flujo de trabajo del paquete pide leer `CLAUDE.md` y ejecutar únicamente la Fase 0 tras aprobación explícita. Este documento resume esa lectura y propone cómo se vería el resultado — no reemplaza la revisión ni la aprobación fase por fase.
