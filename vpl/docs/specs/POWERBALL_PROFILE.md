# Powerball Research Profile

## Estado

Primer perfil científico de Visual Physics Lab.

## El core no debe depender de estos valores.

```yaml
profile_id: powerball
display_name: Powerball Physical Draw System
objects:
  white_ball_count: 69
  red_ball_count: 26
```

## Entidades específicas

```text
Draw
WhiteBallSet
RedBallSet
MachineInstance
MachineModel
ExtractionEvent
MixingEvent
```

## Regiones

```text
mixing_chamber
selector_region
draw_shaft
display_region
arm_a
arm_b
```

## Variables de interés

```text
mix_start
mix_duration
arm_rpm
arm_phase
ball_position
ball_velocity
ball_acceleration
regional_occupancy
selector_distance
collision_count
extraction_timestamp
```

## Regla

Cualquier parámetro técnico no confirmado debe ser `UNKNOWN`.
