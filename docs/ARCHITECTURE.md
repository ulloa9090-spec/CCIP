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

### Pendiente de concretar (fases siguientes)

- SQLite: `better-sqlite3` + `@electron/rebuild` para ABI de Electron (Fase 1). Ver ADR-001.
- Secretos: `safeStorage` nativo de Electron en lugar de `keytar` (Fase 1). Ver ADR-001.
- Embeddings locales: `EmbeddingProvider` implementado con `@huggingface/transformers` (WASM) + modelo `Xenova/all-MiniLM-L6-v2` (Fase 3). Ver ADR-005.
- Índice vectorial: similitud coseno por fuerza bruta en proceso, sin extensión nativa tipo `sqlite-vec` en el MVP (Fase 3). Ver ADR-001.
- Cola de background jobs: cola propia in-process respaldada por la tabla `processing_jobs` (Fase 1+). Ver ADR-001.

