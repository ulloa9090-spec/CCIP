# Technology Stack

## Base

### Desktop
- Tauri
- React
- TypeScript
- Vite

### Python
- Python 3.12+
- uv o Poetry para environment management

### Video
- FFmpeg
- FFprobe
- OpenCV
- PySceneDetect

### Data
- SQLite
- DuckDB
- Parquet
- PyArrow

### Scientific
- NumPy
- SciPy
- Pandas
- Polars opcional

### ML / Vision
- PyTorch
- torchvision
- YOLO como detector inicial si conviene
- SAM-family como segmentador opcional
- OCR desacoplado por plugin

### Tracking
Baselines:
- ByteTrack
- BoT-SORT
- OC-SORT

### 3D
- COLMAP
- Open3D

### Simulation
Evaluar:
- PyBullet
- MuJoCo
- Project Chrono

No elegir motor final hasta Phase 11.

---

# Principio

Usar tecnología existente siempre que:

- tenga licencia compatible;
- esté mantenida;
- tenga comunidad;
- pueda aislarse detrás de una interfaz.

No reinventar detectores, codecs, motores 3D ni solvers sin necesidad.
