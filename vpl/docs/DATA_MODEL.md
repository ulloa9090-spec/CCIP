# Scientific Data Model

## Video

```yaml
video:
  id:
  project_id:
  source_id:
  original_path:
  sha256:
  width:
  height:
  nominal_fps:
  measured_fps:
  duration_seconds:
  codec:
  container:
  timebase:
  created_at:
```

## Detection

```yaml
detection:
  id:
  video_id:
  frame_index:
  timestamp_ms:
  class_name:
  bbox:
  mask_ref:
  confidence:
  detector_id:
  run_id:
```

## Track

```yaml
track:
  id:
  video_id:
  start_frame:
  end_frame:
  status:
  confidence:
```

## Track State

```yaml
track_state:
  track_id:
  frame_index:
  timestamp_ms:
  x_px:
  y_px:
  z_estimate:
  vx:
  vy:
  vz:
  ax:
  ay:
  az:
  visibility:
  occlusion_probability:
  confidence:
```

## Identity Hypothesis

```yaml
identity:
  track_id:
  candidate_id:
  probability:
  evidence_type:
  frame_index:
  confidence:
```

## Measurement

```yaml
measurement:
  id:
  entity_type:
  entity_id:
  name:
  value:
  unit:
  epistemic_status:
  confidence:
  source_ref:
  run_id:
```

`epistemic_status` enum:

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

## Run

```yaml
run:
  id:
  pipeline_version:
  git_commit:
  hardware:
  software_versions:
  model_versions:
  parameters:
  input_hashes:
  output_hashes:
  started_at:
  finished_at:
```
