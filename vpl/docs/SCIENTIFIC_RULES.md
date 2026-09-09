# Scientific Rules

## 1. Evidence before conclusion

Toda conclusión debe ser trazable.

## 2. No retrospective leakage

Nunca utilizar frames posteriores a un evento para predecir ese mismo evento.

## 3. Separar train / validation / test

Los modelos no deben evaluarse sobre los mismos datos usados para ajustarlos.

## 4. Reportar incertidumbre

No devolver simplemente:

```text
Ball 17
```

si la evidencia real es:

```text
Ball 17: 0.61
Ball 47: 0.24
Unknown: 0.15
```

## 5. Preservar orden temporal

No ordenar resultados si eso destruye el orden real de extracción.

## 6. Registrar fallos

Los frames difíciles también son datos.

## 7. No optimizar para “encontrar una señal”

El sistema debe poder concluir:

```text
No evidence above baseline.
```

## 8. Baselines obligatorios

Toda capacidad predictiva futura debe compararse contra:

- azar;
- modelos simples;
- holdout temporal;
- validación fuera de muestra.

## 9. Multiple testing

Registrar número de hipótesis probadas.

## 10. Reproducibilidad

Todo experimento debe poder repetirse.
