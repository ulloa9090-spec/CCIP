import { Card } from '../design-system'

interface PlaceholderPageProps {
  title: string
}

/**
 * Temporary content for every route until its feature phase is built.
 * Proves the router/shell without building feature screens ahead of the
 * phase that owns them (ROADMAP_IMPLEMENTATION.md).
 */
export function PlaceholderPage({ title }: PlaceholderPageProps): React.JSX.Element {
  return (
    <Card className="flex h-full min-h-64 flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
      <p className="max-w-sm text-sm text-text-secondary">
        Esta sección se implementará en una fase posterior del roadmap. La navegación ya está
        activa; el contenido llega en su fase correspondiente.
      </p>
    </Card>
  )
}
