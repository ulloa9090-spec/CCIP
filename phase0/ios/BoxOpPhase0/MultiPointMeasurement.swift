import simd

/// Where the current live point's 3D position came from. Per
/// `docs/21_AR_MEASUREMENT_SYSTEM.md` ("Raycast / hit test": "Store the
/// source type").
enum RaycastSource: String {
    case existingPlaneGeometry
    case estimatedPlane
}

/// Screen-level state machine for the AR measurement flow. `idle` shows
/// only a reticle and a Start button; `measuring` runs the continuous
/// raycast and exposes the full point/segment toolbar; `finished` freezes
/// the geometry in place.
enum ARMeasureState: Equatable {
    case idle
    case measuring
    case finished
}

/// An ordered polyline of confirmed 3D points: `P0 -> P1 -> P2 -> ...`,
/// with no fixed count and no `pointA`/`pointB`/`pointC` fields — see
/// `docs/21_AR_MEASUREMENT_SYSTEM.md` "Core modes" > Polyline. This is the
/// entire scope for now: segment + total distance. Close Shape, perimeter,
/// polygon area, rectangle detection and volume are deliberately not
/// implemented — see `phase0/README.md`.
struct MultiPointMeasurement {
    private(set) var confirmedPoints: [SIMD3<Float>] = []

    var pointCount: Int { confirmedPoints.count }
    var isEmpty: Bool { confirmedPoints.isEmpty }
    var lastPoint: SIMD3<Float>? { confirmedPoints.last }

    mutating func addPoint(_ point: SIMD3<Float>) {
        confirmedPoints.append(point)
    }

    mutating func undoLast() {
        guard !confirmedPoints.isEmpty else { return }
        confirmedPoints.removeLast()
    }

    mutating func clear() {
        confirmedPoints.removeAll()
    }

    /// Distance of each confirmed segment, `P[i] -> P[i+1]`, in order.
    var segmentDistances: [Float] {
        guard confirmedPoints.count > 1 else { return [] }
        return (0 ..< confirmedPoints.count - 1).map {
            simd_distance(confirmedPoints[$0], confirmedPoints[$0 + 1])
        }
    }

    var totalDistance: Float {
        segmentDistances.reduce(0, +)
    }

    func liveSegmentDistance(to livePoint: SIMD3<Float>) -> Float? {
        guard let last = lastPoint else { return nil }
        return simd_distance(last, livePoint)
    }

    /// Total distance including the not-yet-confirmed live segment, for a
    /// running "if I confirmed right now" readout.
    func liveTotalDistance(includingLivePoint livePoint: SIMD3<Float>?) -> Float {
        guard let livePoint, let liveSegment = liveSegmentDistance(to: livePoint) else {
            return totalDistance
        }
        return totalDistance + liveSegment
    }
}
