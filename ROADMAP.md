# StudyOS — ROADMAP.md

Checklist vivo de fases. La definición completa de cada fase está en
`docs/ROADMAP_IMPLEMENTATION.md`; este archivo solo trackea estado.

Regla: no se avanza a la fase siguiente hasta que la actual esté aprobada.

- [x] **Fase 0 — Preparación**: repo, tooling, Electron+React shell, routing, error
      boundary, fundación de design system. _(completada — ver reporte de Phase 0)_
- [x] **Fase 1 — Shell + Persistencia**: SQLite (`better-sqlite3`), migrations
      versionadas, `UserRepository`/`SettingsRepository`, `safeStorage` para la
      API key, IPC tipado, pantalla de Configuración real. _(completada)_
- [x] **Fase 2 — Biblioteca**: import PDF (diálogo nativo, dedup por hash), copia
      local, extracción de texto/outline (pdf.js), cola de procesamiento con
      progreso, viewer en el renderer, delete/reindex. _(completada)_
- [x] **Fase 3 — Retrieval**: chunking, `LocalEmbeddingProvider` (embeddings
      locales, WASM), índice local (coseno por fuerza bruta), búsqueda semántica
      en la topbar, citas clicables a página. Indexación best-effort — no
      bloquea la lectura si no hay red. _(completada; descarga real del modelo
      pendiente de verificar en el Mac de destino, ver DECISIONS.md ADR-012)_
- [x] **Fase 4 — Tutor Q&A**: `OpenAIProvider`, ask flow con streaming, citas
      por construcción (no generadas por el modelo), evidencia insuficiente sin
      llamar a la IA cuando la biblioteca está vacía, conversación persistida.
      _(completada; respuesta real de OpenAI pendiente de verificar en el Mac
      de destino con una clave real, ver DECISIONS.md ADR-015)_
- [x] **Fase 5 — Course Engine**: wizard de 5 pasos, generación estructurada
      (Zod + JSON Schema, re-validada tras la respuesta de la IA), módulos,
      lecciones, persistencia anidada. _(completada; generación real con
      OpenAI pendiente de verificar en el Mac de destino, ver DECISIONS.md
      ADR-016)_
- [x] **Fase 6 — Study Mode**: generación de sesión (sin IA, determinista a
      partir de las lecciones de Fase 5), lesson cards, quick checks
      (Entendido/Necesito repasar), notas ligadas a un curso, resume real
      probado cerrando y reabriendo la app. _(completada — ver DECISIONS.md
      ADR-017; sin limitaciones de red, todo verificado de punta a punta)_
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
