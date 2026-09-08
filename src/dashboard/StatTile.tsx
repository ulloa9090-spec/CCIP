export interface StatTileProps {
  label: string;
  value: string;
  /** Signed delta vs. a named period, e.g. "+6.3h esta semana". Omit if there's no comparison period. */
  delta?: string;
  /** Whether an "up" direction is the desirable one for this metric (false for e.g. "error rate"). */
  upIsGood?: boolean;
}

function directionOf(delta: string): "up" | "down" {
  return delta.trim().startsWith("-") ? "down" : "up";
}

export function StatTile({ label, value, delta, upIsGood = true }: StatTileProps) {
  return (
    <div className="stat-tile">
      <span className="stat-tile__label">{label}</span>
      <span className="stat-tile__value">{value}</span>
      {delta && (
        <span
          className="stat-tile__delta"
          data-direction={directionOf(delta)}
          data-good={upIsGood}
        >
          {directionOf(delta) === "up" ? "▲" : "▼"} {delta}
        </span>
      )}
    </div>
  );
}
