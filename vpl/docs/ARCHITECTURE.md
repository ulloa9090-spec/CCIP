# Architecture — Visual Physics Lab

## Capas

```text
Desktop UI
   |
Application Services
   |
Domain/Core
   |
-------------------------------------------------
| Video | Vision | Tracking | Geometry | Physics |
-------------------------------------------------
   |
Scientific Data Layer
   |
SQLite / DuckDB / Parquet / Filesystem
```

---

# Componentes

## 1. Desktop App

Responsabilidades:

- projects;
- imports;
- video viewer;
- timelines;
- overlays;
- experiment browser;
- scientific explorer.

## 2. Core Domain

Entidades:

```text
Project
Source
Video
Frame
Scene
Region
Detection
Track
ObjectIdentity
Measurement
Event
Collision
Machine
Experiment
Run
Simulation
Hypothesis
```

## 3. Video Service

Responsabilidades:

- ingest;
- hashing;
- ffprobe;
- normalization;
- proxy generation;
- frame access;
- scene detection.

## 4. Vision Service

Responsabilidades:

- object detection;
- segmentation;
- masks;
- OCR;
- feature extraction.

## 5. Tracking Service

Responsabilidades:

- track assignment;
- motion state;
- occlusion;
- re-identification;
- confidence.

## 6. Geometry Service

Responsabilidades:

- calibration;
- scale;
- homography;
- camera parameters;
- 3D reconstruction.

## 7. Physics Service

Responsabilidades:

- velocity;
- acceleration;
- angular motion;
- collision candidates;
- event timing;
- physical constraints.

## 8. Simulation Service

Responsabilidades:

- digital twin;
- parameter sweeps;
- calibration;
- Monte Carlo;
- real-vs-simulated comparison.

---

# Repositorio sugerido

```text
visual-physics-lab/
├── apps/
│   └── desktop/
├── services/
│   ├── video/
│   ├── vision/
│   ├── tracking/
│   ├── geometry/
│   ├── physics/
│   └── simulation/
├── packages/
│   ├── core/
│   ├── schemas/
│   ├── provenance/
│   └── plugin-api/
├── python/
│   ├── vpl_video/
│   ├── vpl_vision/
│   ├── vpl_tracking/
│   ├── vpl_geometry/
│   ├── vpl_physics/
│   └── vpl_simulation/
├── profiles/
│   └── powerball/
├── docs/
├── tests/
└── experiments/
```
