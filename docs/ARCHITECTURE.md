# STUDYOS — ARCHITECTURE.md
## Arquitectura técnica
### Versión 1.0

## 1. Objetivos

Arquitectura:
- local-first
- modular
- mantenible
- testeable
- portable
- preparada para nube futura
- preparada para múltiples proveedores IA

## 2. Stack

Desktop:
- Electron

Renderer:
- React
- TypeScript
- Vite
- Tailwind CSS

State:
- Zustand

Persistence:
- SQLite

PDF:
- PDF.js

AI:
- AIProvider abstraction
- OpenAIProvider inicial

Security:
- Keychain macOS para secretos

Testing:
- Vitest
- React Testing Library
- Playwright para flujos críticos

## 3. Procesos Electron

### Main Process
Responsable de:
- filesystem
- SQLite
- secure storage
- native dialogs
- PDF processing orchestration
- IPC

### Renderer
Responsable de:
- UI
- state visual
- user interactions

### Preload
Expose API mínima y tipada.

No habilitar nodeIntegration en renderer.

## 4. Capas

UI
↓
Feature Services
↓
Domain Services
↓
Repositories
↓
SQLite / Filesystem / AI / Vector Index

## 5. Módulos

src/
  main/
    ipc/
    database/
    filesystem/
    security/
    pdf/
    ai/
  preload/
  renderer/
    app/
    components/
    features/
      dashboard/
      library/
      courses/
      study/
      tutor/
      exams/
      flashcards/
      progress/
      plan/
      settings/
    stores/
  shared/
    types/
    schemas/
    constants/
    utils/

## 6. Domain Services

DocumentService
CourseService
StudyPlanService
TutorService
AssessmentService
FlashcardService
MasteryService
ProgressService
RetrievalService
AIService
BackupService

## 7. Repository interfaces

DocumentRepository
CourseRepository
ConceptRepository
SessionRepository
AssessmentRepository
FlashcardRepository
SettingsRepository

Evitar SQL directo desde componentes React.

## 8. IPC

Todas las llamadas deben:
- tener nombre explícito
- validar argumentos
- devolver tipos claros
- manejar errores
- no exponer filesystem arbitrario

Ejemplo conceptual:

window.studyos.documents.import()
window.studyos.documents.list()
window.studyos.tutor.ask()
window.studyos.courses.create()

## 9. Filesystem

Ubicación recomendada:
Electron app.getPath("userData")

Estructura:

StudyOS/
  database/
    studyos.sqlite
  documents/
    {documentId}/
      original.pdf
      metadata.json
      extracted.json
  indexes/
  exports/
  backups/
  logs/

## 10. Document processing pipeline

Import
→ Validate
→ Copy local
→ Extract text
→ Detect pages
→ Detect sections
→ Normalize
→ Chunk
→ Generate metadata
→ Embeddings
→ Index
→ Ready

Cada etapa debe guardar estado para poder reanudar.

## 11. Background jobs

No infraestructura externa.

Utilizar cola local simple para:
- procesamiento de PDFs
- embeddings
- generación de cursos
- backups

Debe reportar progreso al renderer.

## 12. AI Provider abstraction

interface AIProvider {
  testConnection()
  generateText()
  generateStructured()
  createEmbeddings()
  streamText()
}

Primera implementación:
OpenAIProvider

Futuro:
LocalOpenAICompatibleProvider
AnthropicProvider
otros

## 13. Structured output

Para:
- cursos
- módulos
- quizzes
- flashcards
- conceptos

usar schemas validados.

Preferir JSON Schema/Zod.

Nunca confiar en JSON sin validar.

## 14. Logging

Log levels:
- debug
- info
- warn
- error

No registrar:
- API keys
- contenido completo sensible
- prompts completos si no es necesario

## 15. Error model

AppError:
- code
- message
- userMessage
- cause
- recoverable
- metadata

## 16. Performance

No cargar documentos completos en memoria si no es necesario.

Procesar por páginas/chunks.

Virtualizar listas largas.

Debounce búsqueda.

Cachear consultas frecuentes.

## 17. Migrations

SQLite debe usar migrations versionadas.

Nunca alterar schema manualmente sin migration.

## 18. Backups

Backup versionado:
- DB
- settings
- optional documents

Debe existir manifest.json.

## 19. Security

- contextIsolation = true
- nodeIntegration = false
- CSP
- validated IPC
- safe file paths
- no eval
- no remote code execution
- secrets en Keychain

## 20. Packaging

Electron Builder o equivalente.

Targets:
- .app
- .dmg

Futuro:
- signing
- notarization
- auto-update

No requerido en primer prototipo personal.

---

## 21. Adenda viva — Estado de implementación

> Este documento es la única fuente de verdad de arquitectura del repositorio
> (ver `docs/DECISIONS.md`, ADR-001). El contenido de las secciones 1–20 es
> la especificación original; esta sección se actualiza a medida que el
> código evoluciona y registra dónde la implementación real difiere o
> concreta algo que la especificación dejaba abierto. Cada entrada enlaza al
> ADR correspondiente en `docs/DECISIONS.md`.

### Fase 0 (completada)

- Scaffolding: `electron-vite` (template `react-ts`), no configuración manual de Vite/Electron por separado. Ver ADR-001.
- Gestor de paquetes: `pnpm`.
- `sandbox: true` en `webPreferences` del `BrowserWindow` (más estricto que el mínimo pedido de `contextIsolation`/`nodeIntegration`). Ver ADR-006.
- Enrutado renderer: `react-router-dom` con `HashRouter` (evita problemas de resolución de rutas al cargar `file://` en producción).
- Design tokens: `src/renderer/src/design-system/tokens.css`, consumidos vía Tailwind v4 (`@theme`) y variables CSS nativas para valores no cubiertos por utilidades (spacing de sidebar/topbar, duraciones). Ver ADR-003.
- Dos abstracciones de IA independientes en `src/shared/types/ai.ts`: `AIProvider` (generación) y `EmbeddingProvider` (embeddings). Ver ADR-004, ADR-005.

### Fase 1 (completada)

- SQLite: `better-sqlite3` (WAL + `foreign_keys = ON`), migrations versionadas con
  `PRAGMA user_version` (sin tabla de tracking adicional). Migración 0001 crea
  solo `users` y `settings` — el resto de `DATA_MODEL.md` llega con la fase que
  primero lo necesita. Ver ADR-007.
- Repositorios reales y probados: `UserRepository`, `SettingsRepository`. Las
  otras 5 interfaces de `ARCHITECTURE.md` §7 se implementan cuando su feature
  llega (Fase 2+), no antes.
- Secretos: `safeStorage` de Electron (Keychain en macOS) para la API key de
  OpenAI, nunca en texto plano, nunca devuelta completa por IPC (solo
  `{ configured, lastFour }`).
- Modelo de error `AppError` (código, mensaje, userMessage, recoverable,
  metadata) cruzando el límite de IPC como JSON dentro de un `Error` estándar
  — `ipcMain.handle`/`ipcRenderer.invoke` solo preserva `.message`, y Electron
  antepone `"Error invoking remote method '<canal>': Error: "` a ese mensaje;
  `parseSerializedAppError` extrae el JSON desde el primer `{`. Ver ADR-006.
- `sandbox: true` en el renderer se mantiene, pero el preload quedó sin
  dependencias de terceros (solo `electron` built-in) porque el cargador de
  preload sandboxeado no resuelve paquetes de `node_modules`. Ver ADR-006.
- IPC tipado: `window.studyos.settings.{getProfile,updateDisplayName,
  getAIKeyStatus,setAIKey,clearAIKey}`, validado en el main process, nunca
  SQL directo desde React.
- Pantalla de Configuración real (General + AI Provider) reemplaza el
  placeholder de esa ruta.

### Fase 2 (completada)

- SQLite: migración `0002_documents` agrega `documents`, `document_pages`,
  `processing_jobs` (DATA_MODEL.md §3, §4, §27). `document_chunks` sigue
  diferido a Fase 3. Ver ADR-007, ADR-008.
- Repositorio real y probado: `DocumentRepository` (create con dedup por
  `file_hash`, list, updateStatus, replacePages/getPages, getOutline),
  `ProcessingJobRepository`.
- IDs: todas las factories de ULID usan `monotonicFactory()` compartida
  (`src/main/database/ulid.ts`), no `ulid()` plano. Ver ADR-011.
- Filesystem: `documents/{id}/{original.pdf,metadata.json}` per
  ARCHITECTURE.md §9; `extracted.json` de ese layout queda diferido (Fase 2
  solo persiste en SQLite + el PDF original). Ver ADR-008 (implícito en el
  scoping de artefactos).
- PDF: extracción de texto y outline con `pdfjs-dist` build *legacy* en el
  Main process, vía `require(esm)` (Node 22+) sobre el `.mjs` nativo del
  paquete — verificado contra el bundle real de Electron, no solo
  typecheck. Detección de outline únicamente por bookmarks embebidos del
  PDF (`pdf.getOutline()`), sin heurística de layout. Ver ADR-008, ADR-010.
- Cola de background jobs: `DocumentProcessingQueue`, un solo job concurrente,
  respaldada por `processing_jobs`; reconcilia jobs huérfanos (`queued`/
  `processing` al reiniciar tras un crash) marcándolos `failed`. Ver ADR-001.
- IPC: `window.studyos.documents.{import,list,get,delete,reindex,
  getFileBuffer,onProgress}`. `import` usa el diálogo nativo de Electron
  (`dialog.showOpenDialog`), no un modal de drag-and-drop propio — deferido a
  Fase 12 (Polish).
- Visor de PDF en el renderer: `pdfjs-dist` build estándar + worker cargado
  como asset de Vite (`?url`). Requiere un polyfill de
  `Map.prototype.getOrInsertComputed` (propuesta TC39 "Upsert", no
  implementada aún en el Chromium de Electron 39) — sin él, `page.render()`
  falla en tiempo de ejecución. Ver ADR-009.
- Design system: `ProgressBar`, `EmptyState`, `LoadingState` añadidos con
  consumidores reales en Biblioteca.

### Fase 3 (completada)

- SQLite: migración `0003_document_chunks` agrega `document_chunks`
  (DATA_MODEL.md §5). `embedding_ref` guarda el `Float32Array` como BLOB
  directo (ADR-001, decisión #4), no un puntero externo.
- Chunking: `chunkPages.ts`, ventana deslizante ~800 tokens (aprox. 4
  caracteres/token) con solape ~100 tokens, respetando límites de página
  (cada chunk guarda `pageStart`/`pageEnd`/`heading`). Sin heurística de
  splitting semántico más allá de eso.
- Embeddings locales: `LocalEmbeddingProvider` (`@huggingface/transformers`,
  modelo `Xenova/all-MiniLM-L6-v2`, backend forzado a `device: 'wasm'` — el
  default de la librería bajo Node es el backend nativo `onnxruntime-node`,
  exactamente lo que ADR-005 quería evitar). Ver ADR-012.
- Índice vectorial: similitud coseno por fuerza bruta en proceso
  (`similaritySearch.ts`), sin extensión nativa tipo `sqlite-vec`, tal como
  decidía ADR-001.
- `RetrievalService`: embebe la query, recupera candidatos (todo o un scope
  de `documentIds`), rankea, devuelve `RetrievalResult[]` con cita
  (documento, páginas, heading, score).
- Pipeline de `DocumentProcessingQueue` extendido: extract → **ready** →
  chunk → embed. La indexación es *best-effort* y nunca revierte un
  documento ya extraído a `failed` — ver ADR-013, cambio importante respecto
  al diseño inicial de esta fase (que sí lo hacía, y rompía el principio de
  "funciona sin conexión" de `MASTER_SPEC.md` §16).
- IPC: `window.studyos.retrieval.search(query, documentIds?)`.
- UI: el input de búsqueda de la topbar (deshabilitado desde Fase 0) ahora
  hace búsqueda semántica real sobre la biblioteca; cada resultado es una
  cita clicable que abre el PDF en la página correcta
  (`PdfViewer`/`DocumentDetailPage` ganan `initialPage`).

### Fase 4 (completada)

- SQLite: migración `0004_ai_conversations` agrega `ai_conversations` +
  `ai_messages` (DATA_MODEL.md §25, §26). `course_id`/`document_scope_json`
  quedan NULL hasta Fase 5.
- `OpenAIProvider`: primera implementación real de `AIProvider`
  (`generateText`, `generateStructured`, `streamText`, `testConnection`),
  SDK oficial `openai`, modelo por defecto `gpt-4o-mini` (constante única,
  swappable). Ver ADR-014.
- `TutorService`: orquesta pregunta → `RetrievalService.search()` → si cero
  chunks, responde con el mensaje fijo de evidencia insuficiente sin llamar
  a la IA (Closed Library Mode, `AI_RAG.md` §2, §9) → si hay chunks, arma un
  prompt de sistema estricto (grounding + defensa contra prompt injection,
  `AI_RAG.md` §19) y transmite la respuesta vía `streamText`. Las citas se
  adjuntan por construcción desde los chunks recuperados, nunca generadas
  por el modelo — ver ADR-014.
- `ConversationRepository`: persiste conversación + mensajes, título
  derivado del primer mensaje del usuario.
- IPC: `window.studyos.tutor.{getLatestConversation,newConversation,ask,
  onEvent}` — `ask` dispara la generación de forma asíncrona y transmite
  progreso vía eventos (mismo patrón que `documents:progress` de Fase 2/3).
- UI: pantalla de Tutor (`/tutor`) reemplaza el placeholder — un solo modo
  conversacional (sin selector Profesor/Tutor/Asesor/Entrenador todavía, ver
  ADR-014), streaming en vivo, fuentes citables que abren el PDF en la
  página correcta.

### Fase 5 (completada)

- SQLite: migración `0005_courses` agrega `courses`, `course_documents`,
  `modules`, `lessons` (DATA_MODEL.md §8-11). `concepts`/`lesson_concepts`/
  `concept_sources` no se crean todavía — sin repositorio/IPC/UI real hasta
  Mastery (Fase 8) / Mapa de Conocimiento (Fase 11), mismo criterio que
  ADR-007. `lessons` añade una columna `summary` fuera del esquema original
  para persistir el resumen generado por la IA — ver ADR-016.
- `courseGenerationSchema.ts`: contrato Zod (`courseStructureSchema`) para
  la generación estructurada, convertido a JSON Schema plano vía
  `z.toJSONSchema()` para pasarlo a `AIProvider.generateStructured` sin que
  este conozca Zod.
- `sourceMaterial.ts`: construye el material fuente para el prompt
  combinando el índice de cada documento con un muestreo uniforme de hasta
  20 páginas, acotado a un presupuesto total de ~30.000 caracteres — nunca
  el texto completo del documento. Ver ADR-016.
- `CourseService`: orquesta selección de documentos → construcción de
  material fuente → `AIProvider.generateStructured` → re-validación con
  `courseStructureSchema.safeParse()` (nunca confía en el JSON de la IA sin
  validar, `AI_RAG.md`) → persistencia vía `CourseRepository`.
- `CourseRepository`: persiste curso + módulos + lecciones anidados en una
  transacción; `getById` reconstruye el árbol completo.
- IPC: `window.studyos.courses.{create,list,get}`.
- UI: wizard de 5 pasos (`/courses/new`, Objetivo → Material → Tiempo →
  Estilo → Confirmación, la confirmación usa estimaciones locales, no una
  segunda llamada a IA — ver ADR-016), listado (`/courses`, reemplaza el
  placeholder "Mis Cursos") y detalle de solo lectura (`/courses/:id`,
  módulos/lecciones con estado, sin tomar lecciones todavía — eso es Study
  Mode, Fase 6). El botón "Crear curso" de `DocumentDetailPage` (pendiente
  desde Fase 2) queda conectado, preseleccionando el documento de origen.

### Fase 6 (completada)

- SQLite: migración `0006_study` agrega `study_sessions`,
  `session_activities` (DATA_MODEL.md §15-16) y `notes` (§23, sin
  `concept_id` todavía — llega como columna aditiva en Fase 8, mismo
  patrón que ADR-007/016). `SessionStatus` se tipa como
  `'in_progress' | 'completed'` — `'planned'` queda para el Plan adaptativo
  (Fase 9), que sí programa sesiones por adelantado.
- `CourseRepository` gana `listPendingLessons`, `markLessonCompleted`
  (recalcula estado de módulo y progreso/estado del curso en la misma
  transacción) y `markLessonInProgress` — la consistencia del agregado
  curso vive en su propio repositorio, no en el servicio de sesión.
- `StudySessionRepository`: persiste sesión + actividades (`activity_type`
  fijo en `'lesson'` — el resto del enum depende de motores que no existen
  aún, Fase 7/10), reconstruye el detalle con título/resumen de cada
  lección.
- `StudySessionService`: sin llamadas a IA — construye deterministamente
  una sesión a partir de las lecciones pendientes del curso agrupadas por
  el presupuesto de `dailyMinutes` (mínimo una lección garantizada),
  reanuda una sesión `in_progress` existente en vez de crear otra, y
  recalcula progreso/estado al completar cada actividad. Ver ADR-017.
- `NoteRepository`: notas simples ligadas a un curso (crear/listar/borrar).
- IPC: `window.studyos.study.{startOrResume,completeActivity}`,
  `window.studyos.notes.{create,listByCourse,delete}`.
- UI: `/study` (landing de cursos activos con "Continuar"), `/study/:id`
  (tarjeta de lección enfocada — título, resumen, quick check
  Entendido/Necesito repasar, Continuar →; sin timer visible ni botones de
  regeneración de IA — ver ADR-017), `NotesPanel` reutilizado en la sesión
  de estudio y en el detalle del curso, botón "Continuar" en
  `CourseDetailPage` cuando el curso está activo.

### Fase 7 (completada)

- SQLite: migración `0007_assessment` agrega `questions`,
  `assessment_attempts`, `assessment_answers` (DATA_MODEL.md §17-19).
  `assessment_answers.answer_json`/`is_correct` son nullable — la tabla
  hace de manifiesto del intento (una fila sin responder por pregunta
  desde que se crea), no hay tabla `attempt_questions` separada. Ver
  ADR-018.
- `quizGenerationSchema.ts`: contrato Zod (`quizSchema`, 5-15 preguntas de
  opción múltiple con 4 opciones) igual patrón que Fase 5 — JSON Schema
  para el transporte, re-validación Zod al recibir la respuesta.
- `QuizService`: selecciona documentos del curso → reutiliza
  `buildSourceMaterial` (Fase 5) → `generateStructured` → valida →
  persiste preguntas → adjunta una cita real por pregunta vía
  `RetrievalService` (nunca generada por la IA, mismo principio que el
  Tutor) → crea el intento. `submitAnswer`/`finish` califican contra el
  índice correcto real, nunca contra lo que la IA "cree" que contestaste.
- `QuestionRepository`, `AssessmentRepository`: persistencia de preguntas
  e intentos; `AssessmentRepository.getPreviousAverageScore` da la
  comparación histórica de la pantalla de resultados.
- IPC: `window.studyos.exams.{generate,getAttempt,submitAnswer,finish,
  getResult,listHistory}`.
- UI: `/exams` (reemplaza el placeholder "Exámenes" — cursos con "Nuevo
  examen" + historial), `/exams/:attemptId` (reproductor secuencial,
  opción múltiple, Anterior/Siguiente/Finalizar, sin cronómetro ni
  "Marcar" — ver ADR-018), `/exams/results/:attemptId` (score, duración,
  comparación con el promedio histórico, explicación y cita real por
  pregunta).
- Deliberadamente fuera de alcance (ADR-018): el Exam Center completo
  (Quick/Practice/Module/Final/Custom Exam) y su Custom Exam Builder, más
  de un tipo de pregunta, banco de preguntas reutilizable,
  fortalezas/debilidades por tema, confianza estimada, botón "Crear
  sesión de recuperación", cronómetro visible.

### Fase 8 (completada)

- SQLite: migración `0008_mastery` agrega `concepts` (global, deduplicado
  por `canonical_key`), `lesson_concepts`, `concept_sources`,
  `mastery_scores` (DATA_MODEL.md §12-14, §22), y añade `concept_id` como
  columna aditiva a `questions` y `notes` (prometido en ADR-017/018).
- `courseGenerationSchema.ts`/`quizGenerationSchema.ts` ganan campos
  opcionales `concepts`/`concept` — el mismo Course Engine y Assessment ya
  construidos generan y linkean conceptos sin una llamada de IA aparte;
  un curso/examen que no los incluye simplemente no linkea nada
  (compatible con lo generado en Fase 5-7).
- `ConceptRepository`: dedup global por clave canónica
  (`canonicalKey`/`upsertConcept`), consultas por curso/lección, y
  `concept_sources` con citas reales adjuntadas vía `RetrievalService`
  (nunca generadas por la IA, mismo principio que Tutor/Assessment).
- `MasteryRepository`: promedio acumulado simple + estado derivado por
  umbrales (`new`/`learning`/`familiar`/`competent`/`mastered`). Ver
  ADR-019 para por qué no hay decaimiento por recencia.
- `MasteryService`: dos fuentes de evidencia ya reales —
  `StudySessionService.completeActivity` (autorreporte 75/25) y
  `QuizService.finish` (objetiva 100/0, solo preguntas respondidas) —,
  cálculo de dominio por curso, y detección de áreas débiles
  (`learning` antes que `new`).
- `StudySessionService.startRemediation`: arma una sesión de estudio
  normal (`session_activities.activity_type = 'review'`) con las
  lecciones de los conceptos más débiles, ignorando si ya están
  completadas — reutiliza el reproductor de Study Mode sin ningún cambio.
- IPC: `window.studyos.mastery.getCourseMastery`,
  `window.studyos.study.startRemediation`.
- UI: `MasteryPanel` (tarjeta "Dominio" dentro de `CourseDetailPage`, sin
  pantalla ni entrada de navegación propia — oculta por completo si el
  curso no tiene conceptos).

### Pendiente de concretar (fases siguientes)

- Verificación de descarga real del modelo de embeddings y calidad de
  búsqueda semántica con red disponible — no verificable en el contenedor de
  desarrollo (ver ADR-012). Pendiente en el Mac de destino.
- Verificación de una respuesta real generada por OpenAI (streaming real,
  generación estructurada real, con clave de API real) — tampoco verificable
  aquí (`api.openai.com` bloqueado). Ver ADR-015, ADR-016, ADR-018.
  Pendiente en el Mac de destino.
- Selector de modo (Profesor/Asesor/Entrenador) — Profesor ya tiene un
  Course Engine real detrás desde esta fase; Asesor/Entrenador siguen
  dependiendo del Plan adaptativo (Fase 9).
- Acciones de regeneración de IA en la tarjeta de estudio y en el Tutor
  (Más simple/Ejemplo/Preguntar/Crear flashcard) — sin consumidor real
  todavía, ver ADR-014/017.
- Preguntas/ejercicios/flashcards como tipos reales de `session_activities`
  más allá de `lesson`/`review` — dependen de Flashcards (Fase 10).
- Navegador de notas independiente (`/notes`) — Fase 6 solo cubre notas
  ligadas a un curso, ver ADR-017.
- Exam Center completo, Custom Exam Builder, banco de preguntas
  reutilizable — quedan fuera de alcance por ahora, ver ADR-018.
- Presentación visual de `concept_sources` (citas por concepto) — ya se
  generan y persisten desde esta fase, pero la UI del Mapa de Conocimiento
  que las mostrará es Fase 11, ver ADR-019.
- Candado explícito para no crear una sesión de recuperación mientras otra
  sesión sigue activa — limitación conocida, ver ADR-019 punto 8.

### Fase 9 (completada)

- SQLite: migración `0009_plan` agrega `study_plans` (DATA_MODEL.md §24) —
  cada recálculo inserta una versión nueva, nunca sobreescribe la anterior.
- `PlanRepository`: persistencia versionada por curso (`getLatest`/
  `create`).
- `PlanService`: `distribute()` reparte las lecciones pendientes del curso
  (mismo orden que ya usa Study Mode) por presupuesto de `dailyMinutes`
  entre hoy y la fecha objetivo (bin-packing voraz); `getPlan` reutiliza
  el plan guardado si existe (recalculando el estado de cada día contra
  las lecciones *actuales*, nunca una copia guardada) y solo crea uno
  nuevo si no existía; `recalculate` opcionalmente actualiza
  `courses.target_date`/`daily_minutes` (vía `CourseRepository.
  updateSchedule`, nuevo) y siempre persiste una versión fresca. Sin
  ninguna llamada a IA — determinista, igual que Study Mode/Mastery.
  Deliberadamente desacoplado de `StudySessionService`: el plan es una
  proyección de calendario, no el mecanismo que decide qué contiene una
  sesión real. Ver ADR-020.
- Estados por día (`today`/`upcoming`/`missed`/`completed`) derivados en
  el momento de leer el plan, no persistidos — "manejo de sesiones
  perdidas" es automático sin necesitar invalidación explícita.
- IPC: `window.studyos.plan.{get,recalculate}`.
- UI: `/plan` (reemplaza el placeholder "Plan de Estudio" — cursos
  activos con "Ver plan"), `/plan/:courseId` (calendario como lista
  cronológica de días con estado/duración/lecciones, "Cambiar meta" y
  "Recalcular plan", enlace "Ir a estudiar" en el día de hoy). Botón
  "Ver plan" añadido a `CourseDetailPage` junto a "Continuar".
- Deliberadamente fuera de alcance (ADR-020): "reprogramar" una sesión
  puntual a otro día, recalculo automático ante cada evento (solo
  explícito desde la UI), grilla de calendario visual (se usa una lista
  cronológica en su lugar).

### Fase 10 (completada)

- SQLite: migración `0010_flashcards` agrega `flashcards` (course_id,
  concept_id, front, back, hint, source_refs_json) y `flashcard_reviews`
  (DATA_MODEL.md §20-21, append-only: rating, interval_days, ease_factor,
  next_review_at) — mismo patrón append-only que `assessment_answers`
  (Fase 7).
- `flashcardGenerationSchema.ts`: contrato Zod para generación estructurada
  (front/back/hint opcional/concepto opcional), mismo patrón que
  `courseGenerationSchema.ts`/`quizGenerationSchema.ts`.
- `spacedRepetition.ts`: `computeNextSchedule()`, SM-2 simplificado sin
  contador de repeticiones explícito (se infiere de la magnitud del
  intervalo anterior). Ver ADR-021 punto 3.
- `FlashcardRepository`: `createMany` (acumulativo — nunca reemplaza el
  deck existente, a diferencia de `QuestionRepository`), `create` (manual),
  vencimiento (`dueToday`) derivado de la fila más reciente en
  `flashcard_reviews` — nunca almacenado en la tarjeta misma.
- `FlashcardService`: `generate()` reutiliza `buildSourceMaterial()`
  (Fase 5) y adjunta citas reales vía `RetrievalService` (nunca generadas
  por la IA); `createManual()` para el flujo "Create" del wireframe;
  `listDecks()`/`getDeck()`/`getReviewQueue()`/`submitReview()`.
- IPC: `window.studyos.flashcards.{generate,createManual,listDecks,
  getDeck,getReviewQueue,submitReview}`.
- UI: `/flashcards` (reemplaza el placeholder — decks existentes con
  contador de vencidas, cursos sin deck con "Generar con IA"),
  `/flashcards/:courseId` (lista de tarjetas, formulario "+ Nueva
  tarjeta", "Generar más con IA", "Repasar ahora"), `/flashcards/
  :courseId/review` (reproductor secuencial: frente → "Mostrar
  respuesta" → dorso/pista → cuatro botones de calificación → "¡Repaso
  completo!"). Botón "Ver tarjetas" añadido a `CourseDetailPage`.
- Deliberadamente fuera de alcance (ADR-021): deduplicación de tarjetas
  entre regeneraciones, tabla `decks` separada (un deck es simplemente
  las tarjetas de un curso), integración con `MasteryService`.

### Fase 11 (completada)

- `ProgressService` (nuevo, `src/main/progress/`): agrega datos ya
  persistidos por fases anteriores — sin ninguna tabla nueva. Lee
  `courses.progress`/`status` (Fase 5), `study_sessions.actual_minutes`
  (Fase 6), `assessment_attempts` vía `AssessmentRepository.listHistory()`
  (Fase 7), `mastery_scores` vía `MasteryService.getCourseMastery()`
  (Fase 8) y `flashcard_reviews` (Fase 10). Primera fase que lee across
  todos los cursos a la vez, no por curso. `computeStreak()` (exportada,
  testeada con reloj simulado) cuenta días consecutivos con al menos una
  sesión de Study Mode completada, terminando hoy o ayer si hoy todavía
  no tiene sesión. Ver ADR-022.
- `StudySessionRepository` gana `getTotalActualMinutes`/
  `getActualMinutesSince`/`getCompletedDates`; `FlashcardRepository` gana
  `getReviewStats` — agregados nuevos sobre columnas que ya existían
  desde Fase 6/10 pero que nada leía en conjunto hasta ahora.
- IPC: `window.studyos.progress.getSummary()`.
- UI: `/progress` (reemplaza el placeholder "Progreso" — tarjetas de
  resumen/racha/tiempo/ritmo/precisión, dominio por tema, conceptos en
  riesgo, historial de exámenes; sin gráficas decorativas, solo números y
  barras de progreso ya existentes en el design system), `/knowledge-map`
  (reemplaza el placeholder "Mapa de Conocimiento" — árbol de conceptos
  por curso reutilizando `mastery.getCourseMastery` sin IPC nueva; tocar
  un concepto expande dominio/fuentes/"Estudiar ahora" inline,
  reutilizando `study.startRemediation` tal cual la usa `MasteryPanel`).
- Deliberadamente fuera de alcance (ADR-022): la pantalla "Inicio" (`/`)
  con gamificación (XP/nivel/racha visual) del wireframe del Dashboard —
  nunca asignada a una fase explícita del roadmap; modo "mapa visual" de
  grafo en el Mapa de Conocimiento (solo se construye el árbol/lista);
  "definición" y "errores" por concepto en el detalle del nodo (sin
  fuente de datos real que mostrar sin inventar contenido); cruzar
  "ritmo" con el Plan adaptativo de Fase 9.

### Pendiente de concretar (fases siguientes)

- Verificación de descarga real del modelo de embeddings y calidad de
  búsqueda semántica con red disponible — no verificable en el contenedor de
  desarrollo (ver ADR-012). Pendiente en el Mac de destino.
- Verificación de una respuesta real generada por OpenAI (streaming real,
  generación estructurada real, con clave de API real) — tampoco verificable
  aquí (`api.openai.com` bloqueado). Ver ADR-015, ADR-016, ADR-018, ADR-021.
  Pendiente en el Mac de destino.
- Pantalla "Inicio" (`/`) — dashboard de bienvenida con curso actual,
  sesión de hoy, y gamificación (XP/nivel/racha visual) — nunca asignada
  a una fase explícita; "racha" ya existe como número real en Progreso
  (Fase 11), pero XP/nivel/logros (`achievements`/`user_achievements`)
  siguen sin ningún consumidor. Ver ADR-002, ADR-022.
- Selector de modo (Profesor/Asesor/Entrenador) — Profesor ya tiene un
  Course Engine real detrás desde esta fase; Asesor todavía no tiene nada
  real detrás; Entrenador ya podría apoyarse en el Plan adaptativo
  (Fase 9), pendiente de construirse cuando exista el selector.
- Acciones de regeneración de IA en la tarjeta de estudio y en el Tutor
  (Más simple/Ejemplo/Preguntar/Crear flashcard) — sin consumidor real
  todavía, ver ADR-014/017.
- Preguntas/ejercicios/flashcards como tipos reales de `session_activities`
  más allá de `lesson`/`review` — Flashcards (Fase 10) ya existe como
  feature independiente, pero todavía no se integra como un tipo de
  actividad dentro de una sesión de Study Mode.
- Navegador de notas independiente (`/notes`) — Fase 6 solo cubre notas
  ligadas a un curso, ver ADR-017.
- Exam Center completo, Custom Exam Builder, banco de preguntas
  reutilizable — quedan fuera de alcance por ahora, ver ADR-018.
- Candado explícito para no crear una sesión de recuperación mientras otra
  sesión sigue activa — limitación conocida, ver ADR-019 punto 8.
- "Reprogramar" una sesión puntual, recálculo automático ante fallos
  repetidos/dominio rápido, grilla visual de calendario — ver ADR-020.
- Deduplicación de tarjetas entre regeneraciones e integración de repasos
  de Flashcards con `MasteryService` — ver ADR-021 puntos 5 y 7.
- Modo "mapa visual" de grafo en el Mapa de Conocimiento, "definición"/
  "errores" por concepto, XP/nivel/logros — ver ADR-022 puntos 7 y 8.

