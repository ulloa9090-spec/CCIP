# Testing Strategy

## Unit tests

- hash calculation;
- ffprobe parsing;
- timestamps;
- schema validation;
- coordinate transforms;
- confidence math;
- unit conversion;
- run metadata.

## Integration tests

- ingest video end-to-end;
- create proxy;
- scene detection;
- detector plugin;
- tracker plugin;
- export Parquet.

## Golden files

Mantener pequeños videos de prueba con resultados conocidos.

## Regression tests

Cada cambio de modelo debe compararse contra métricas previas.

## Scientific tests

Ejemplos:

- velocity from synthetic motion;
- angular velocity from generated rotating arm;
- collision detection using synthetic trajectories;
- camera calibration from known geometry.

## Performance

Medir:

```text
ingest time
decode fps
detection fps
tracking fps
memory
disk usage
```

## Acceptance

Una fase sólo se aprueba si:

- tests pasan;
- no hay regresiones críticas;
- output es trazable;
- errores están documentados.
