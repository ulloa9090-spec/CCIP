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

### Pendiente de concretar (fases siguientes)

- Verificación de descarga real del modelo de embeddings y calidad de
  búsqueda semántica con red disponible — no verificable en el contenedor de
  desarrollo (ver ADR-012). Pendiente en el Mac de destino.
- Verificación de una respuesta real generada por OpenAI (streaming real,
  con clave de API real) — tampoco verificable aquí (`api.openai.com`
  bloqueado). Ver ADR-015. Pendiente en el Mac de destino.
- Selector de modo (Profesor/Asesor/Entrenador) — depende de Course Engine
  (Fase 5) y Plan adaptativo (Fase 9).

