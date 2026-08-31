export { Button } from './Button'
export type { ButtonVariant, ButtonSize } from './Button'
export { Card } from './Card'
export { StatusBadge } from './StatusBadge'
export type { StatusTone } from './StatusBadge'

/**
 * Design system scaffold — built incrementally as each feature needs a new
 * component, starting with Button/Card (Phase 0) and StatusBadge (Phase 1,
 * Settings screen). Remaining catalog (IconButton, MetricCard, PanelHeader,
 * ProgressBar, Tooltip, Modal, EmptyState, ErrorState, LoadingState,
 * SourceCitation, ReadinessGauge, StreakBadge, ...) arrives with the
 * features that use them — see docs/DECISIONS.md (ADR-003) and
 * docs/ARCHITECTURE.md.
 */
