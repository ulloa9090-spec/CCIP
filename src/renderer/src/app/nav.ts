export interface NavItem {
  id: string
  label: string
  path: string
}

/**
 * Primary sidebar navigation. Reconciles MASTER_SPEC.md §10 (which omits
 * "Notas" and "Logros") with DATA_MODEL.md, which already models notes and
 * achievements, and with the reference Dashboard image, which shows both.
 * See docs/DECISIONS.md (ADR-002).
 */
export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Inicio', path: '/' },
  { id: 'library', label: 'Biblioteca', path: '/library' },
  { id: 'courses', label: 'Mis Cursos', path: '/courses' },
  { id: 'study', label: 'Estudiar', path: '/study' },
  { id: 'tutor', label: 'Tutor IA', path: '/tutor' },
  { id: 'exams', label: 'Exámenes', path: '/exams' },
  { id: 'flashcards', label: 'Flashcards', path: '/flashcards' },
  { id: 'knowledge-map', label: 'Mapa de Conocimiento', path: '/knowledge-map' },
  { id: 'progress', label: 'Progreso', path: '/progress' },
  { id: 'plan', label: 'Plan de Estudio', path: '/plan' },
  { id: 'notes', label: 'Notas', path: '/notes' },
  { id: 'achievements', label: 'Logros', path: '/achievements' }
]

export const SETTINGS_NAV_ITEM: NavItem = {
  id: 'settings',
  label: 'Configuración',
  path: '/settings'
}
