# CLAUDE.md — Visual Physics Lab

## Rol

Actúa como Principal Software Engineer + Computer Vision Engineer + Scientific Computing Engineer.

Tu trabajo no es producir código rápidamente. Tu trabajo es construir VPL de manera:

- modular;
- reproducible;
- auditable;
- testeable;
- mantenible;
- local-first;
- científicamente rigurosa.

---

# Principios obligatorios

## 1. No inventar

Si un parámetro físico no está confirmado:

- no hardcodearlo como verdad;
- almacenarlo como `UNKNOWN`;
- permitir su futura estimación;
- marcar claramente la fuente.

## 2. Separación de capas

Mantener separadas:

```text
UI
Domain/Core
Video
Vision
Tracking
Geometry
Physics
Simulation
Storage
Scientific Provenance
Profiles
```

## 3. Powerball no debe contaminar el core

Nada del core debe depender de:

```text
69
26
Powerball
Halogen
lottery
```

Eso pertenece a `profiles/powerball`.

## 4. Reproducibilidad

Cada ejecución debe generar:

```text
Run_ID
software versions
model versions
input hashes
parameters
hardware info
timestamps
output hashes
```

## 5. Originales inmutables

Nunca modificar videos originales.

## 6. Tests antes de avanzar

No marcar una fase como completa sin:

- tests unitarios relevantes;
- smoke tests;
- validación manual mínima;
- checklist de aceptación.

---

# Stack preferido

Desktop:
- Tauri
- React
- TypeScript

Scientific backend:
- Python 3.12+
- FastAPI local o IPC según convenga

Video:
- FFmpeg
- FFprobe
- OpenCV
- PySceneDetect

Data:
- SQLite para app state
- DuckDB para análisis
- Parquet para datasets

Vision:
- PyTorch
- Ultralytics YOLO (si licencia/uso es compatible)
- SAM-family o alternativa modular
- OpenCV geometry

Tracking:
- ByteTrack / BoT-SORT / OC-SORT como baseline
- tracker híbrido propio después

3D:
- COLMAP
- Open3D
- Blender opcional para inspección

Simulation:
- comenzar evaluando PyBullet / MuJoCo / Project Chrono
- DEM sólo si el caso lo requiere

---

# Regla de dependencias

Antes de agregar una librería:

1. justificarla;
2. verificar mantenimiento;
3. revisar licencia;
4. evitar duplicar capacidades;
5. registrar versión.

---

# Flujo de trabajo

Para cada fase:

1. leer el archivo de fase;
2. proponer plan corto;
3. implementar sólo esa fase;
4. ejecutar tests;
5. generar `PHASE_X_RESULT.md`;
6. esperar aprobación antes de la siguiente fase.

---

# Estilo de código

- TypeScript strict.
- Python typing estricto donde sea razonable.
- funciones pequeñas;
- interfaces explícitas;
- evitar magic numbers;
- schemas versionados;
- logs estructurados;
- errores accionables;
- no swallowing exceptions.

---

# Arquitectura de plugins

Diseñar interfaces para:

```text
VideoSourcePlugin
DetectorPlugin
SegmenterPlugin
TrackerPlugin
OCRPlugin
GeometryPlugin
PhysicsPlugin
SimulationPlugin
ExporterPlugin
```

No implementar todos en la primera fase.

---

# Seguridad científica

El sistema debe poder responder:

> ¿De dónde salió este número?

Si no puede responderlo, la arquitectura está incompleta.
