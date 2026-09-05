# 09 — Camera, Sensors & Hardware

## Tier 0: phone
- RGB camera
- IMU
- AR/spatial tracking
- device depth/LiDAR/ToF when available

## Tier 1: passive calibration
- printed fiducials
- calibrated mat/board
- L-square
- known rigid reference

## Tier 2: optional smart references
- BLE microcontroller
- ToF distance sensors
- IMU/level
- Bluetooth scale
- calibrated rigid/telescoping geometry

## Tier 3: portable station
Possible:
- folding/roll-up reference floor;
- telescoping mast;
- phone mount;
- known fiducial positions;
- optional ToF/IMU;
- lighting;
- BLE hub.

## Principle
External hardware improves calibration/repeatability; it does not replace the phone.

## Capability detection
At runtime determine available sensors and select best strategy/fallback.

## NFC/UWB
NFC may identify/pair assets but is not precision positioning.
UWB is optional future ranging only where device support and validation justify it.

## Laser
No custom exposed laser projection dependency in MVP. Future laser hardware must use appropriate certified eye-safe components.
