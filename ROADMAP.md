# StudyOS — ROADMAP.md

Checklist vivo de fases. La definición completa de cada fase está en
`docs/ROADMAP_IMPLEMENTATION.md`; este archivo solo trackea estado.

Regla: no se avanza a la fase siguiente hasta que la actual esté aprobada.

- [x] **Fase 0 — Preparación**: repo, tooling, Electron+React shell, routing, error
      boundary, fundación de design system. _(completada — ver reporte de Phase 0)_
- [x] **Fase 1 — Shell + Persistencia**: SQLite (`better-sqlite3`), migrations
      versionadas, `UserRepository`/`SettingsRepository`, `safeStorage` para la
      API key, IPC tipado, pantalla de Configuración real. _(completada)_
- [ ] **Fase 2 — Biblioteca**: import PDF, copia local, metadata, viewer, extracción,
      estado de procesamiento, delete/reindex.
- [ ] **Fase 3 — Retrieval**: chunking, `LocalEmbeddingProvider`, índice local,
      búsqueda semántica, referencias de fuente.
- [ ] **Fase 4 — Tutor Q&A**: `OpenAIProvider`, ask flow, streaming, citas,
      comportamiento de evidencia insuficiente.
- [ ] **Fase 5 — Course Engine**: wizard de creación, generación estructurada,
      módulos, lecciones, persistencia.
- [ ] **Fase 6 — Study Mode**: generación de sesión, lesson cards, quick checks,
      notas, resume.
- [ ] **Fase 7 — Assessment**: generador de quizzes, question player, scoring,
      explicaciones, historial.
- [ ] **Fase 8 — Mastery**: tracking de conceptos, mastery score, detección de
      debilidades, remediación.
- [ ] **Fase 9 — Plan adaptativo**: schedule, fecha objetivo, minutos diarios,
      manejo de sesiones perdidas, recálculo.
- [ ] **Fase 10 — Flashcards**: decks, generación automática, scheduling SM-2-like,
      review.
- [ ] **Fase 11 — Progreso**: dashboard, tendencias, mapa de conocimiento, historial
      de exámenes.
- [ ] **Fase 12 — Polish**: shortcuts, command palette, empty states,
      accesibilidad, toggle claro/oscuro, backups, export, packaging.
