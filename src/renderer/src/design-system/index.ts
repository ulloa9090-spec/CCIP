export { Button } from './Button'
export type { ButtonVariant, ButtonSize } from './Button'
export { Card } from './Card'
export { StatusBadge } from './StatusBadge'
export type { StatusTone } from './StatusBadge'
export { ProgressBar } from './ProgressBar'
export type { ProgressTone } from './ProgressBar'
export { EmptyState } from './EmptyState'
export { LoadingState } from './LoadingState'

/**
 * Design system scaffold — built incrementally as each feature needs a new
 * component: Button/Card (Fase 0), StatusBadge (Fase 1, Settings), ProgressBar/
 * EmptyState/LoadingState (Fase 2, Biblioteca). Remaining catalog (IconButton,
 * MetricCard, PanelHeader, Tooltip, Modal, ErrorState, SourceCitation,
 * ReadinessGauge, StreakBadge, ...) arrives with the features that use them —
 * see docs/DECISIONS.md (ADR-003) and docs/ARCHITECTURE.md.
 */
