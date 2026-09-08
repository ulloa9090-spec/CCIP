export interface RadialGaugeProps {
  label: string;
  /** 0-100 */
  value: number;
  caption?: string;
  /** Value at/above which the arc reads as "good". */
  goodAt?: number;
  /** Value at/above which the arc reads as "warning" (below goodAt, at/above this is warning). */
  warningAt?: number;
}

const SIZE = 96;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function severityColor(value: number, goodAt: number, warningAt: number): string {
  if (value >= goodAt) return "var(--good)";
  if (value >= warningAt) return "var(--warning)";
  return "var(--critical)";
}

export function RadialGauge({
  label,
  value,
  caption,
  goodAt = 75,
  warningAt = 50,
}: RadialGaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const filled = (clamped / 100) * CIRCUMFERENCE;
  const color = severityColor(clamped, goodAt, warningAt);

  return (
    <div className="radial-gauge">
      <span className="radial-gauge__label">{label}</span>
      <div className="radial-gauge__figure" title={`${label}: ${clamped}%`}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--border)"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </svg>
        <span className="radial-gauge__value">{clamped}%</span>
      </div>
      {caption && <span className="radial-gauge__caption">{caption}</span>}
    </div>
  );
}
