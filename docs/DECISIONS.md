# STUDYOS — DECISIONS.md

## Architecture Decision Records

Registro de decisiones técnicas no explícitas (o dejadas abiertas) en los documentos
maestros (`MASTER_SPEC.md`, `UX_UI.md`, `ARCHITECTURE.md`, `AI_RAG.md`, `DATA_MODEL.md`,
`ROADMAP_IMPLEMENTATION.md`), tomadas siguiendo la regla del roadmap: *"si encuentras
una contradicción, documenta, toma la decisión más simple y mantenible, continúa."*

Formato: contexto → decisión → alternativas consideradas → consecuencias.

---

### ADR-001 — Decisiones de arquitectura de Fase 0/1 no especificadas

**Contexto.** `ARCHITECTURE.md` fija el stack (Electron, React, TS, Vite, Tailwind,
Zustand, SQLite, PDF.js) pero deja abiertas varias decisiones de implementación.

**Decisiones:**

1. **Scaffolding**: `electron-vite` (no configuración manual de Vite + Electron por
   separado). Es el tooling estándar actual para exactamente este stack, separa
   correctamente los builds de main/preload/renderer y reduce el riesgo de
   configuración incorrecta de HMR/empaquetado.
2. **Secretos (API key) en macOS**: `safeStorage` nativo de Electron (usa Keychain
   internamente en macOS), **no** `keytar`. `keytar` está sin mantenimiento activo;
   `safeStorage` no añade una dependencia nativa adicional que compilar/firmar.
3. **Driver SQLite**: `better-sqlite3`. Síncrono, encaja con el patrón Repository,
   requiere rebuild para el ABI de Electron vía `@electron/rebuild` (paso de build
   documentado, no automático mágicamente).
4. **Índice vectorial (embeddings)**: similitud coseno por fuerza bruta, en proceso,
   sobre embeddings guardados como BLOB/JSON en SQLite. **No** se usa una extensión
   nativa tipo `sqlite-vec` en el MVP. Para una biblioteca personal (cientos/pocos
   miles de chunks) es suficientemente rápido y elimina un riesgo de *packaging*
   nativo cross-arquitectura. Revisar si el corpus crece significativamente.
5. **Extracción de texto PDF**: `pdfjs-dist` build *legacy* (sin DOM) en el **Main**
   process para extracción; el build normal de PDF.js se usa en el renderer solo
   para visualización. Evita bloquear el renderer y mantiene el filesystem en Main.
6. **Cola de background jobs**: cola propia in-process, respaldada por la tabla
   `processing_jobs` (ya en `DATA_MODEL.md`) para permitir resumibilidad. Nada de
   infraestructura externa (Redis/BullMQ), cumple el requisito explícito de "no
   infraestructura externa".
7. **Gestor de paquetes**: `pnpm`.

**Consecuencias.** Ninguna de estas decisiones añade infraestructura cloud ni
contradice los principios de `MASTER_SPEC.md`. Quedan sujetas a revisión si algún
supuesto de escala cambia (ver punto 4).

---

### ADR-002 — Navegación del sidebar: reconciliación con el modelo de datos

**Contexto.** `MASTER_SPEC.md` §10 lista la navegación principal sin incluir "Notas"
ni "Logros", pero `DATA_MODEL.md` ya modela `notes` (#23) y `achievements`/
`user_achievements` (#28–29), y la imagen de referencia del Dashboard muestra ambos
en el sidebar.

**Decisión.** El sidebar incluye "Notas" y "Logros" además de los ítems listados en
`MASTER_SPEC.md` §10. No es una desviación real: el modelo de datos ya los
contemplaba, la lista de navegación del spec estaba simplemente incompleta.

**Consecuencias.** `src/renderer/src/app/nav.ts` es la fuente única de verdad para
el orden y las etiquetas del sidebar.

---

### ADR-003 — Interpretación visual: imagen de referencia vs. wireframe de UX_UI.md

**Contexto.** El wireframe del Dashboard en `UX_UI.md` §5 es de baja densidad (4
bloques). La imagen de referencia oficial tiene densidad alta (4 metric cards +
8 paneles + footer de estado). Esto entra en tensión aparente con la regla no
negociable #5 de `UX_UI.md`: "Evitar dashboards saturados".

**Decisión.** La imagen es la referencia visual oficial y prevalece sobre el
wireframe simplificado. La regla de "evitar saturación" se aplica con todo su
peso en **Study Mode** (foco único, sin métricas), que es donde `UX_UI.md` §11 y
la instrucción explícita del usuario la exigen con más fuerza. El Dashboard es
denso por diseño (command center); Study Mode es el contraste calmado.

**Decisiones de tema e idioma relacionadas:**

- **Tema**: el modo oscuro (navy/grafito) es la identidad visual base de StudyOS,
  no una opción secundaria. El toggle claro/oscuro visible en la imagen se
  implementa en Fase 12 (Polish), tal como ubica `ROADMAP_IMPLEMENTATION.md` §14;
  los tokens se definen ya como *themable* (variables CSS + `@theme` de Tailwind)
  para que ese toggle sea trivial cuando llegue.
- **Idioma**: español como locale por defecto (coincide con los 6 documentos y la
  imagen). Strings centralizados en componentes/constantes para permitir
  localización futura, sin introducir un framework de i18n pesado en el MVP
  (instrucción explícita del usuario — evitar complejidad innecesaria).

**Tokens derivados de la imagen** — ver `src/renderer/src/design-system/tokens.css`
para los valores concretos (background, surface, surface-elevated, border, primary,
secondary, success, warning, danger, text-primary/secondary/muted, spacing, radii,
shadows, duraciones).

---

### ADR-004 — Documentación: fuente única de verdad para arquitectura

**Contexto.** Enmienda del usuario (Amendment 2): no mantener dos `ARCHITECTURE.md`
independientes.

**Decisión.** `docs/ARCHITECTURE.md` es el documento canónico y vivo. Contiene la
especificación original (secciones 1–20) más una sección viva "§21 Adenda —
Estado de implementación" que se actualiza por fase y enlaza a los ADRs de este
archivo. `docs/DECISIONS.md` registra el razonamiento y las alternativas; nunca se
duplica contenido descriptivo de arquitectura fuera de esos dos archivos.

**Estructura de `docs/`:**

```
docs/
  MASTER_SPEC.md
  UX_UI.md
  ARCHITECTURE.md        (canónico, vivo)
  AI_RAG.md
  DATA_MODEL.md
  ROADMAP_IMPLEMENTATION.md
  DECISIONS.md           (este archivo)
ROADMAP.md               (raíz — checklist de fases, vivo)
README.md                (raíz)
```

---

### ADR-005 — Embeddings locales: `EmbeddingProvider` / `LocalEmbeddingProvider`

**Contexto.** Enmienda del usuario (Amendment 1): la indexación inicial de
documentos no debe requerir enviar cada chunk a una API externa de embeddings.
Se pide evaluar opciones priorizando: 1) privacidad, 2) fiabilidad de
*packaging*, 3) rendimiento aceptable, 4) simplicidad, 5) tamaño del modelo — y
documentar si hubiera una razón técnica seria para no cumplir el requisito.

**Opciones evaluadas:**

| Opción | Privacidad | Packaging | Rendimiento | Simplicidad | Veredicto |
|---|---|---|---|---|---|
| `@huggingface/transformers` (ex `@xenova/transformers`), backend WASM, modelo `Xenova/all-MiniLM-L6-v2` | 100% local, sin llamadas de red en tiempo de embedding | Puro JS + WASM, **sin compilación nativa** — no añade un segundo módulo nativo junto a `better-sqlite3` | Aceptable para una biblioteca personal (miles de chunks, no millones) | Un solo paquete npm, patrón RAG local muy usado | **Elegido** |
| `node-llama-cpp` / modelos GGUF | Local | Requiere compilación nativa + binarios grandes por modelo | Mejor rendimiento/calidad potencial | Más piezas móviles, mayor superficie de fallo | Rechazado: "no introducir un stack de IA local complejo solo para embeddings" |
| Ollama como servidor local externo | Local | Requiere que el usuario instale y mantenga un proceso externo | Bueno | Rompe el objetivo de app autocontenida (`doble clic y funciona`) | Rechazado para v1 |
| `onnxruntime-node` (bindings nativos) en vez de WASM | Local | Módulo nativo adicional a rebuildear por Electron ABI, igual que `better-sqlite3` | Mejor que WASM | Más riesgo de *packaging* que el WASM | Rechazado para v1; candidato futuro si el rendimiento WASM resulta insuficiente |

**Decisión.** `EmbeddingProvider` como abstracción (`src/shared/types/ai.ts`), con
`LocalEmbeddingProvider` como implementación inicial: `@huggingface/transformers`
con backend WASM ejecutando `Xenova/all-MiniLM-L6-v2` (384 dimensiones) **en el
Main process**. El modelo se cachea en `userData` tras la primera ejecución.

**Concesión documentada.** La primera vez que se usa, el runtime descarga los
pesos del modelo (una sola vez, sin datos del usuario involucrados) desde el CDN
de Hugging Face; a partir de ahí funciona sin red. Esto es coherente con el
principio "debe seguir funcionando parcialmente sin conexión" — el propio motor
de embeddings, no el contenido del usuario, es lo único que toca la red, y una
sola vez. Mejora futura: empaquetar el modelo dentro del `.app` para eliminar
también esa descarga inicial (coste: ~90MB adicionales en el instalador).

**`AIProvider` (generación) permanece separado**, con `OpenAIProvider` como
implementación inicial (Fase 4), sin cambios respecto a la especificación
original. Ambas abstracciones viven una junto a la otra en
`src/shared/types/ai.ts` desde Fase 0 (solo como contratos de tipos; sin
implementación hasta sus fases correspondientes), lo que además facilita
soportar LLMs locales en el futuro sin tocar la capa de embeddings.

**Implementación**: diferida a Fase 3 (Retrieval), tal como pide el roadmap.
Fase 0 únicamente fija el contrato de tipos.

---

### ADR-006 — `sandbox: true` en el renderer, preload sin dependencias de terceros

**Contexto.** El template de `electron-vite` genera `sandbox: false` en
`webPreferences` por defecto (para simplificar el preload de ejemplo).
`ARCHITECTURE.md` §19 exige `contextIsolation = true` y `nodeIntegration = false`
pero no menciona `sandbox` explícitamente.

**Decisión.** Se activa `sandbox: true`, siguiendo la recomendación de seguridad
oficial de Electron ("mantener el sandbox activado salvo razón de peso").

**Hallazgo real durante Fase 1 (corregido en el mismo commit).** La primera
implementación mantenía `@electron-toolkit/preload` (`electronAPI`) en el
preload junto con nuestro propio bridge `studyos`. Con `sandbox: true`,
Electron ejecuta el preload en un cargador restringido
(`sandbox_bundle`) que **solo** resuelve un conjunto fijo de módulos
incorporados (`electron`, `events`, `timers`, `url`, ...) — no resuelve
paquetes de `node_modules` de terceros. El build fallaba en tiempo de
ejecución con `Error: module not found: @electron-toolkit/preload`, dejando
`window.studyos` como `undefined` y disparando el `ErrorBoundary` en cuanto
la UI intentaba una llamada IPC. Esto se detectó empíricamente lanzando la
app real (no solo con typecheck/build) — ver checklist de verificación en el
reporte de Fase 1.

**Corrección.** Como `window.electron`/`electronAPI` no tenía ningún consumidor
real en la app, se eliminó por completo del preload en vez de desactivar el
sandbox. El preload final (`src/preload/index.ts`) importa únicamente
`{ contextBridge, ipcRenderer }` de `'electron'` (built-in, permitido bajo
sandbox) y expone `window.studyos`. `@electron-toolkit/preload` se removió de
`package.json`. Resultado: `sandbox: true` se mantiene (endurecimiento real,
verificado en ejecución), y el preload queda más simple al no depender de
un paquete que no se usaba.

**Segundo hallazgo, mismo proceso de verificación.** El error real de
`ipcMain.handle`/`ipcRenderer.invoke` no llega al renderer como el string JSON
puro que `AppError.toJSON()` produce: Electron lo envuelve como
`Error invoking remote method '<channel>': Error: <json>`. La primera versión
de `parseSerializedAppError` (`shared/types/errors.ts`) hacía `JSON.parse` del
mensaje completo, fallaba silenciosamente contra ese prefijo, y todo error caía
al mensaje genérico "Ocurrió un error inesperado." — se detectó exactamente así
(mensaje genérico donde debía aparecer uno específico) al probar el flujo de
guardar la API key en la app real. Corregido extrayendo el JSON desde el
primer `{` del mensaje. Ver test de regresión en
`tests/unit/shared/errors.test.ts` ("extracts the payload from the real
Electron ipcRenderer.invoke wrapper").

**Limitación de entorno observada (no del código).** En este contenedor Linux
sandboxeado, `safeStorage.isEncryptionAvailable()` devuelve `false` — no hay
un Secret Service (`libsecret`/`gnome-keyring`/`kwallet`) corriendo. La app
responde exactamente como debe: rechaza con `SECURE_STORAGE_UNAVAILABLE` y
**no** cae a texto plano (`MASTER_SPEC.md` §15, "las API keys nunca deben
almacenarse en plaintext"). En macOS, `safeStorage` usa Keychain y
`isEncryptionAvailable()` es `true`; este camino se verificó con
`safeStorage` simulado en `tests/unit/security/secretStore.test.ts` (cifrado,
estado, borrado) — lo que no se pudo probar aquí es el backend real de
Keychain, que requiere el Mac de destino.

---

### ADR-007 — Migrations incrementales por fase, no un único migration con las 29 tablas

**Contexto.** `DATA_MODEL.md` ya especifica 29 tablas de forma completa y
aprobada (v1.0). Al construir Fase 1 (Shell + Persistencia) surgió la
pregunta: ¿la migración inicial crea las 29 tablas de una vez (ya que el
modelo de datos está decidido), o solo las que Fase 1 usa de verdad?

**Decisión.** Migración `0001_initial` crea únicamente `users` y `settings`
— las dos que Fase 1 implementa con repositorio real, IPC real y UI real. El
resto de tablas (`documents`, `courses`, `questions`, `flashcards`, ...)
llega en la migración de la fase que las usa por primera vez (p. ej.
`0002_documents` en Fase 2). Las migraciones son aditivas por convención
(nunca se edita `0001_initial`; una migración futura se agrega para
modificar), así que no hay riesgo de reescritura si `DATA_MODEL.md`
evoluciona antes de llegar a esa fase.

**Razonamiento.** Aplica el mismo principio que ya usamos con
`AIProvider`/`EmbeddingProvider` (Fase 0) y con las 5 interfaces de
repositorio no implementadas todavía: una tabla sin ningún repositorio,
IPC o UI que la ejerza es exactamente el tipo de "implementación a medias"
que el proyecto evita. El modelo de datos completo sigue siendo la referencia
(`docs/DATA_MODEL.md`), pero su traducción a SQL ocurre por fase, no de una
vez.

---

### ADR-008 — Detección de outline por bookmarks del PDF, no heurística de layout; subconjunto de `status` en Fase 2

**Contexto.** `ARCHITECTURE.md` §10 pide "Detectar secciones" en el pipeline de
procesamiento. `DATA_MODEL.md` §3 define el enum de `documents.status` como
`imported, extracting, chunking, embedding, ready, failed` — chunking/embedding
son de Fase 3 (Retrieval).

**Decisiones:**

1. **Outline**: se usa exclusivamente `pdf.getOutline()` de pdf.js (los
   marcadores/bookmarks ya embebidos en el PDF), resolviendo cada entrada a un
   número de página vía `getPageIndex`. **No** se implementa una heurística de
   detección de secciones por tamaño de fuente/layout — es un proyecto no
   trivial por sí solo, y muchos manuales técnicos (como el de referencia,
   Michigan Residential Builder) ya traen bookmarks reales. Un PDF sin
   bookmarks simplemente tiene `outline: []`; no es un error.
2. **Subconjunto de `status`**: Fase 2 solo escribe `imported`, `extracting`,
   `ready`, `failed`. `chunking`/`embedding` quedan reservados para cuando
   Fase 3 exista de verdad — escribir esos valores ahora, sin que signifiquen
   nada todavía, sería peor que no usarlos.

**Consecuencias.** `src/shared/types/documents.ts` tipa `DocumentStatus` como
el subconjunto de 4 valores, no los 6 del enum completo de `DATA_MODEL.md`.

---

### ADR-009 — Polyfill de `Map.prototype.getOrInsertComputed` para el visor PDF

**Contexto.** Al verificar el visor de PDF en la app real (no solo build/typecheck),
`page.render()` fallaba en tiempo de ejecución:
`this[#methodPromises].getOrInsertComputed is not a function`, dentro del código
interno de pdf.js (`WorkerTransport.getOptionalContentConfig`). El canvas quedaba
con tamaño correcto pero contenido corrupto (818,055 píxeles no-blancos de ruido
en una página que debería tener unos pocos miles, verificado con inspección de
píxeles vía Playwright).

**Diagnóstico.** `Map.prototype.getOrInsertComputed` es un método de la propuesta
TC39 "Upsert", todavía no implementado en el Chromium empaquetado con Electron 39
(confirmado empíricamente: `typeof Map.prototype.getOrInsertComputed === 'undefined'`
dentro de la propia ventana de la app). Se reprodujo igual en `pdfjs-dist@6.3.289`
y `@5.7.284` — no es un problema de versión de pdf.js, sino de soporte del motor.

**Decisión.** Se agrega un polyfill mínimo y estándar de ese único método
(`src/renderer/src/features/library/PdfViewer.tsx`, antes de cualquier uso de
pdf.js), en vez de degradar a una versión más antigua de `pdfjs-dist` (que no
resolvía el problema) o deshabilitar el "optional content" de pdf.js. Verificado
con inspección de píxeles: sin el polyfill, ~818k píxeles de ruido; con el
polyfill, ~4.6k píxeles de texto real, coherente con el contenido del PDF de
prueba.

---

### ADR-010 — `extractPdf` lee bytes con `readFileSync` en vez de pasar `url` a pdf.js

**Contexto.** La primera implementación de `extractPdf` llamaba a
`getDocument({ url: pathToFileURL(filePath).href, ... })`, confiando en el
mecanismo de carga de archivos de pdf.js. Funcionaba al correr la app real
(Electron), pero los tests unitarios (Vitest, Node puro) fallaban con
`UnknownErrorException: getArrayBuffer - unexpected data`, con los bytes del
PDF visiblemente correctos pero mal interpretados por la capa de fetch interna
de pdf.js para `file://` bajo Node plano.

**Decisión.** `extractPdf` lee el archivo con `readFileSync` y pasa los bytes
directamente como `data: new Uint8Array(...)`, evitando por completo el
mecanismo de fetch interno de pdf.js. Es la misma vía verificada manualmente
desde el principio (antes de introducir `url` prematuramente) y ahora es
consistente entre Node puro (tests) y Electron (app real).

**Consecuencia.** Los tests de `extractPdf` corren contra el PDF real de
`tests/fixtures/sample.pdf` sin necesitar Electron.

---

### ADR-011 — ULIDs con `monotonicFactory()`, no `ulid()` plano

**Contexto.** Un test real (`DocumentRepository`, "list orders by created_at
descending") falló de forma no determinista: dos documentos creados en
sucesión rápida caían en el mismo milisegundo, y `ORDER BY created_at DESC`
no tenía un desempate confiable. Se intentó arreglar con `ORDER BY created_at
DESC, id DESC` asumiendo que los ULID son ordenables lexicográficamente por
creación — **falso** para IDs generados dentro del mismo milisegundo: la
porción aleatoria de un `ulid()` plano no es monótona, así que el desempate
seguía siendo incorrecto (confirmado: el test volvió a fallar con el mismo
síntoma tras el primer intento de fix).

**Decisión.** Todas las factories de ULID de la app (`documentRepository`,
`processingJobRepository`, `settingsRepository`, `userRepository`) usan una
única instancia compartida de `ulid.monotonicFactory()`
(`src/main/database/ulid.ts`), que incrementa la parte aleatoria en colisiones
de mismo milisegundo. Con eso, `ORDER BY id DESC` (como desempate de
`created_at`) es correcto siempre, no solo "la mayoría de las veces". Relevante
más allá de tests: una importación de varios PDFs a la vez desde el diálogo
nativo (`documents:import`, `multiSelections`) crea varios documentos en
sucesión muy rápida — exactamente el escenario que rompía el orden.

---

### ADR-012 — `LocalEmbeddingProvider`: forzar `device: 'wasm'`; verificación de red limitada en este entorno

**Contexto.** ADR-005 (Fase 0) eligió `@huggingface/transformers` con backend
WASM específicamente para no añadir un segundo módulo nativo (además de
`better-sqlite3`). Al instalar `@huggingface/transformers@4.2.0` para Fase 3,
el paquete trae como dependencias tanto `onnxruntime-web` (WASM) como
`onnxruntime-node` (nativo) y `sharp` (nativo).

**Hallazgo real (leyendo el código fuente del paquete, no solo su
documentación).** `DEFAULT_DEVICE = apis.IS_NODE_ENV ? "cpu" : "wasm"` —
bajo Node/Electron (`IS_NODE_ENV` es `true` en el Main process), la librería
usa por defecto el backend nativo `onnxruntime-node` ("cpu"), no WASM. Esto
habría reintroducido exactamente el riesgo que ADR-005 quería evitar.

**Decisión.** `pipeline('feature-extraction', MODEL_ID, { device: 'wasm' })`
con el device explícito, siempre. Verificado empíricamente en este contenedor
(sin acceso a `huggingface.co`, ver más abajo): con `device: 'wasm'` la
librería llega directo a la descarga del modelo (falla ahí, por la red) sin
tocar `onnxruntime-node` en ningún momento — confirma que la ruta nativa
queda evitada. No se aprobó el build script de `onnxruntime-node` ni `sharp`
en pnpm (`onlyBuiltDependencies`), a propósito: no se usan.

**Limitación de entorno (no del código).** `huggingface.co` está bloqueado
por la política de red de este contenedor (403), igual que `electronjs.org`
en Fase 1. No fue posible verificar aquí la descarga real del modelo
(~90MB) ni la calidad real de los embeddings/búsqueda semántica de punta a
punta. Lo que sí se verificó en este entorno:
- El módulo carga correctamente bajo el runtime de Electron (CJS nativo,
  `main: dist/transformers.node.cjs` — sin necesitar `require(esm)`).
- Con `device: 'wasm'` el fallo ocurre exactamente en el límite de red
  (`Forbidden access to file: ".../config.json"`), un error claro y
  capturable, no un crash ni un error de módulo nativo faltante.
- `LocalEmbeddingProvider` mapea ese fallo a un `AppError` claro
  (`EMBEDDING_MODEL_UNAVAILABLE`) y permite reintentar en la siguiente
  llamada (no cachea el rechazo para siempre) — probado con
  `@huggingface/transformers` simulado en
  `tests/unit/ai/localEmbeddingProvider.test.ts`.
- La lógica de chunking, similitud coseno y ranking (`chunkPages.ts`,
  `similaritySearch.ts`, `retrievalService.ts`) están completamente probadas
  con embeddings sintéticos deterministas — no dependen de la red y
  verifican la corrección real del algoritmo de retrieval.

La descarga real del modelo y una búsqueda semántica con embeddings reales
quedan pendientes de verificar en el Mac de destino, que sí tendrá acceso
normal a internet.

---

### ADR-013 — `ready` depende solo de extracción; indexación (chunk+embed) es best-effort

**Contexto.** La primera implementación de Fase 3 hacía que el pipeline
completo (extraer → chunkear → embeber) tuviera que terminar con éxito antes
de marcar un documento `ready`, escribiendo `chunking`/`embedding` como
valores reales de `documents.status`. Verificando esto en la app real
(contenedor sin acceso a `huggingface.co`), **todo documento importado
terminaba en `failed`** simplemente porque no había red para el modelo de
embeddings — aunque el PDF se hubiera extraído perfectamente y fuera
completamente legible. Esto contradice directamente
`MASTER_SPEC.md` §16: "debe seguir funcionando parcialmente sin conexión."

**Decisión.** `documents.status` vuelve a los 4 valores de Fase 2
(`imported`, `extracting`, `ready`, `failed`) — un documento es `ready` en
cuanto la extracción de texto tiene éxito, sin importar qué pase después con
la indexación. `chunking`/`embedding` pasan a ser valores transitorios de un
nuevo tipo `ProcessingStage` (solo para eventos de progreso vía IPC), nunca
persistidos en `documents.status`. Si chunking/embedding fallan (sin red, u
otro error), se registra el error y el documento **permanece `ready`**, solo
que sin resultados de búsqueda hasta un "Reindexar" exitoso. Se añadió
`DocumentDetail.indexed` (derivado de `document_chunks` count > 0) para que
la UI muestre un aviso no bloqueante ("Sin indexar") en vez de tratarlo como
un fallo del documento.

**Corrección relacionada.** Al revisar `reconcileOrphanedJobs` para este
cambio se encontró que ningún job se marcaba `processing`/`succeeded` — todo
job quedaba `queued` para siempre en la tabla, así que en cada reinicio
`findOrphaned()` habría tratado *todo* job histórico (incluidos los ya
completados con éxito) como interrumpido. Se corrigió llamando
`jobs.updateProgress(...)`/`jobs.markFailed(...)` en los puntos reales del
pipeline. `reconcileOrphanedJobs` además ahora solo revierte a `failed` si el
documento seguía en `extracting` (nunca si ya llegó a `ready`), consistente
con que la indexación interrumpida no es un fallo del documento.

---

### ADR-014 — Alcance del Tutor Q&A (Fase 4)

**Contexto.** `MASTER_SPEC.md` §5 define cuatro modos de IA (Profesor, Tutor,
Asesor, Entrenador) y `UX_UI.md` §13 muestra un selector entre ellos en la
pantalla de Tutor.

**Decisión.** Fase 4 implementa un único modo — el Tutor conversacional
grounded en la biblioteca —, sin selector de modo. Profesor depende del
Course Engine (Fase 5, no existe aún), Entrenador depende del Plan adaptativo
(Fase 9, no existe aún); construir el selector ahora significaría exponer
modos que no hacen nada distinto todavía. `ai_conversations.mode` se guarda
como `'tutor'` fijo; el selector se agrega cuando los otros modos tengan algo
real detrás.

**Citas por construcción, no citas generadas por el modelo.** `AI_RAG.md`
§23 pide validar que "toda citation debe referirse a chunk existente, página
válida, documento válido". En vez de pedirle al modelo que genere
metadatos de cita en texto libre y luego parsear/validar eso, la aplicación
nunca le pide al modelo que cite nada: las fuentes mostradas
(`MessageSource[]`) son exactamente los chunks que `RetrievalService` ya
recuperó, adjuntados de forma determinista por `TutorService`, no inventados
por el LLM. Esto vuelve la "validación de citas" trivial por diseño — no
hay nada que validar porque no hay nada que el modelo pueda inventar.

**Confianza binaria, no de tres niveles.** `AI_RAG.md` §22 sugiere
`Supported / Partially supported / Insufficient evidence`. Fase 4 solo
distingue dos casos: evidencia insuficiente (cero chunks recuperados, o el
propio modelo devuelve la frase fija) vs. respondida con fuentes adjuntas.
No existe todavía una señal real para distinguir "Partially supported" de
"Supported" (eso requeriría un paso de verificación/re-ranking que no se ha
construido) — inventar una distinción de tres niveles sin esa señal sería
peor que no tenerla.

**Modelo por defecto.** `gpt-4o-mini` como constante única en
`openAIProvider.ts`, fácilmente reemplazable cuando exista una UI de
selección de modelo (Fase 12+).

**Bug real encontrado y corregido.** `mapError()` en `openAIProvider.ts` no
dejaba pasar un `AppError` ya construido (p. ej. `AI_KEY_NOT_CONFIGURED` de
`getClient()`) — lo envolvía siempre como `AI_REQUEST_FAILED` genérico,
perdiendo el mensaje específico. Detectado por un test real
(`openAIProvider.test.ts`, "fails fast with a clear AppError when no API key
is configured") que esperaba el código específico y lo recibió incorrecto.
Corregido centralizando el passthrough (`if (error instanceof AppError)
return error`) al inicio de `mapError`, igual que ya se hacía en
`generateStructured` de forma aislada.

**Optimización de costo ya presente en Fase 3, relevante aquí.**
`RetrievalService.search()` corta antes de embeber la pregunta si la
biblioteca no tiene chunks (`candidates.length === 0`) — Fase 4 se apoya en
esto para el caso "biblioteca vacía": la app nunca llama a OpenAI ni intenta
cargar el modelo de embeddings solo para terminar diciendo "no encontré
información". Verificado en la app real.

---

### ADR-015 — Verificación de red limitada (tercera vez): `api.openai.com` también bloqueado

**Contexto.** Igual que `electronjs.org` (Fase 1) y `huggingface.co`
(Fase 3), `api.openai.com` está bloqueado por la política de red de este
contenedor (403 en el `CONNECT` del proxy). Tampoco hay una clave de OpenAI
real disponible en esta sesión.

**Qué se verificó de todos modos:**
- `OpenAIProvider` completo probado con el SDK de `openai` simulado
  (`tests/unit/ai/openAIProvider.test.ts`): forma de la petición a
  `chat.completions.create` (texto, streaming, `response_format:
  json_schema`), mapeo de `AuthenticationError`/`APIConnectionError` a
  `AppError`, y que sin clave configurada falla rápido sin llamar al SDK.
- `TutorService` completo probado con un `AIProvider` falso determinista
  (`tests/unit/tutor/tutorService.test.ts`): biblioteca vacía → mensaje fijo
  sin llamar a la IA; biblioteca con chunks → streaming, ensamblado del
  contenido, citas deduplicadas y correctas; el modelo decide por sí mismo
  que no hay evidencia suficiente → sin fuentes adjuntas; el stream falla a
  mitad → evento de error, sin persistir un mensaje de asistente a medias.
- En la app real: biblioteca vacía → respuesta de evidencia insuficiente sin
  tocar ningún proveedor de IA (confirmado, ver ADR-014). Con un chunk
  sembrado directamente en SQLite (bypaseando el pipeline de embeddings
  local, también bloqueado por red) → el error específico de
  `LocalEmbeddingProvider` se propaga correctamente de punta a punta hasta
  la UI, confirmando que la cadena de preservación de `AppError` a través
  del límite de IPC (establecida en Fase 1, ADR-006) sigue funcionando
  igual para el Tutor.

**Lo que queda pendiente de verificar en el Mac de destino**: una respuesta
real generada por OpenAI, con streaming real y latencia real, usando una
clave de API real del usuario.

---

### ADR-016 — Alcance y decisiones del Course Engine (Fase 5)

**Contexto.** `ROADMAP_IMPLEMENTATION.md` §7 pide wizard de creación,
generación estructurada, módulos, lecciones y persistencia. `DATA_MODEL.md`
§8-14 define `courses`, `course_documents`, `modules`, `lessons`,
`concepts`, `lesson_concepts`, `concept_sources`. `UX_UI.md` §9 define un
wizard de 5 pasos (Objetivo, Material, Tiempo, Estilo, Confirmación).

**Decisiones:**

1. **Migración solo de las 4 tablas con consumidor real.** `0005_courses.ts`
   crea `courses`, `course_documents`, `modules`, `lessons` — no
   `concepts`/`lesson_concepts`/`concept_sources`. Nada en Fase 5 tiene
   repositorio, IPC o UI para tracking por concepto individual; esa
   necesidad llega con Mastery (Fase 8) y el Mapa de Conocimiento (Fase 11).
   Mismo criterio que ADR-007.
2. **Columna `lessons.summary` añadida, fuera del esquema original de
   `DATA_MODEL.md`.** La generación estructurada produce un resumen breve
   por lección (útil para mostrarlo en la pantalla de Curso sin tener que
   re-generar nada); no había ninguna columna donde persistirlo. Es aditivo
   y no rompe el modelo de datos existente — se documenta aquí en vez de
   editar `DATA_MODEL.md` a mitad de fase.
3. **`AIProvider.generateStructured` sigue sin saber nada de Zod.** El
   contrato de `src/shared/types/ai.ts` ya declaraba `schema: unknown`
   desde Fase 0 precisamente para esto. `src/main/courses/
   courseGenerationSchema.ts` es el único lugar que conoce Zod: define
   `courseStructureSchema`, lo convierte a JSON Schema plano con
   `z.toJSONSchema()` (Zod v4, compatible con el modo estricto de
   `response_format: json_schema` de OpenAI — `additionalProperties: false`
   verificado antes de integrarlo) para pasarlo como `options.schema`, y
   `CourseService` vuelve a validar la respuesta cruda con
   `courseStructureSchema.safeParse()` antes de persistir nada. Cumple
   `AI_RAG.md`: "nunca confiar en JSON de IA sin validar" — la validación
   por JSON Schema en el transporte (constrained decoding de OpenAI) es una
   garantía de forma, no de las reglas de negocio (mínimo un módulo, mínimo
   una lección por módulo, etc.), así que ambas capas son necesarias.
4. **Material fuente acotado por presupuesto de caracteres, no el texto
   completo del PDF.** `src/main/courses/sourceMaterial.ts` combina el
   índice de cada documento (si tiene bookmarks) con un subconjunto de
   hasta 20 páginas muestreadas de forma uniforme (no solo las primeras —
   un manual de cientos de páginas debe representar también sus capítulos
   finales), recortado a un presupuesto total de ~30.000 caracteres
   repartido entre los documentos seleccionados. Alternativa descartada:
   enviar el texto extraído completo — coste y latencia no acotados para un
   PDF grande, muy por encima de un presupuesto de contexto razonable para
   un prompt de generación.
5. **Paso 5 (Confirmación) del wizard usa estimaciones locales, no una
   segunda llamada a IA.** `UX_UI.md` pide mostrar un resumen antes de
   confirmar. Generar una vista previa real requeriría una llamada a
   `generateStructured` que luego se descartaría o se tendría que reutilizar
   (con riesgo de inconsistencia si el usuario cambia algo después de
   verla). El wizard solo calcula localmente la fecha objetivo
   (`hoy + duración en días`) y repite los datos ya introducidos; la única
   llamada real a la IA ocurre al pulsar "Crear curso".
6. **Sin modal, wizard como ruta de página completa (`/courses/new`).** No
   existe todavía un componente `Modal` en el design system (catálogo
   incremental, ver ADR-003) y construirlo solo para este wizard habría sido
   adelantarse a una necesidad que no está confirmada en otra pantalla
   todavía.
7. **`lesson_type` cerrado a `'lesson' | 'practice' | 'assessment'`.** Es
   una categorización simple y visualizable, distinta de la extensión más
   fina que `DATA_MODEL.md` §16 (`session_activities.activity_type`) define
   para Study Mode — esa tabla y ese enum llegan en Fase 6, no aquí.
8. **Detalle de curso (`/courses/:id`) es de solo lectura en esta fase.**
   Muestra módulos y lecciones con su estado (`○`/`▶`/`✓` como en el
   wireframe de `UX_UI.md` §10), pero no permite "tomar" una lección — eso
   es Study Mode (Fase 6). El botón "Crear curso" ya existente en
   `DocumentDetailPage` (pendiente desde Fase 2, cuando el Course Engine no
   existía) queda finalmente conectado, navegando a
   `/courses/new?documentId=X` para preseleccionar ese documento en el paso
   de Material.
9. **Mensaje de "clave no configurada" generalizado.** `OpenAIProvider`
   lanzaba un `AppError` con el texto "...para usar el Tutor", escrito en
   Fase 4 cuando el Tutor era el único consumidor de `AIProvider`. Con el
   Course Engine como segundo consumidor, ese texto ya no era correcto en
   este contexto — se generalizó a "...para usar la IA." (único cambio de
   copy en un archivo de Fase 4, sin tocar su lógica).

**Verificación limitada de red (cuarta vez, mismo patrón que ADR-012/015).**
`api.openai.com` sigue bloqueado en este contenedor — la generación real de
un curso con una clave de OpenAI real no se pudo ejecutar de punta a punta
aquí. Lo que sí se verificó:
- `CourseService` completo con un `AIProvider` falso determinista
  (`tests/unit/courses/courseService.test.ts`): generación y persistencia
  exitosa, `documentIds` vacío → `INVALID_ARGUMENT`, documento inexistente →
  `NOT_FOUND`, respuesta de IA que no cumple el schema (Zod) →
  `AI_INVALID_STRUCTURE` sin persistir nada, y que un `AppError` lanzado por
  el proveedor de IA (p. ej. `AI_KEY_NOT_CONFIGURED`) se propaga sin
  envolver.
- `buildSourceMaterial` probado de forma aislada y determinista
  (`tests/unit/courses/sourceMaterial.test.ts`): índice incluido solo si
  existen bookmarks, presupuesto de caracteres respetado con miles de
  páginas sintéticas, presupuesto repartido entre varios documentos, y
  muestreo verificablemente uniforme (una página bien pasada la posición 20
  aparece en el material, algo que una estrategia de "primeras N páginas"
  nunca produciría).
- `CourseRepository` probado contra SQLite real en memoria
  (`tests/unit/database/courseRepository.test.ts`): persistencia anidada
  correcta de módulos/lecciones, `estimated_minutes` de un módulo calculado
  como suma de sus lecciones, orden de `list()`, y que borrar el documento
  fuente no borra el curso (solo su fila en `course_documents`, vía
  `ON DELETE CASCADE`).
- En la app real (Playwright/xvfb, sin red): flujo completo del wizard de 5
  pasos con un documento real importado, incluida la navegación con
  "Crear curso" preseleccionando el documento desde la Biblioteca, y que al
  confirmar sin clave de OpenAI configurada la app muestra el error
  específico (`AI_KEY_NOT_CONFIGURED` → mensaje claro) en vez de fallar de
  forma confusa — la misma cadena de preservación de `AppError` establecida
  en Fase 1 (ADR-006) y reutilizada en Fase 4 (ADR-015) sigue funcionando
  igual para este tercer flujo.

**Lo que queda pendiente de verificar en el Mac de destino**: un curso
generado realmente por OpenAI a partir de un PDF real, incluida la calidad
del contenido generado y de la estimación de tiempos.

---

### ADR-017 — Alcance y decisiones de Study Mode (Fase 6)

**Contexto.** `ROADMAP_IMPLEMENTATION.md` §8 pide "session generation,
lesson cards, quick checks, notes, resume", con criterio de aceptación
"estudiar, cerrar, abrir, continuar". `DATA_MODEL.md` §15-16 define
`study_sessions`/`session_activities`, §23 define `notes`. `UX_UI.md` §11
muestra un wireframe con una tarjeta de lección (título, explicación,
fuente) y una fila de acciones `[Entendido] [Más simple] [Ejemplo]
[Preguntar]` sobre `[Continuar →]`.

**Decisiones:**

1. **Sin llamadas a IA en todo el ciclo de estudio.** A diferencia del
   Course Engine (Fase 5) y el Tutor (Fase 4), generar y avanzar una sesión
   de estudio es determinista: se construye a partir de las lecciones ya
   persistidas por Fase 5 (título + `summary`). Esto hace que Fase 6
   funcione 100% offline y sea verificable de punta a punta en este
   contenedor sandboxeado sin ninguna de las limitaciones de red de
   ADR-012/015/016.
2. **`[Más simple] [Ejemplo] [Preguntar]` no se implementan en esta fase.**
   Mismo criterio que Fase 4 (ADR-014) con el selector de modo del Tutor:
   estos botones ya aparecen en el wireframe del propio Tutor (`UX_UI.md`
   §13, junto con "Crear flashcard") y Fase 4 tampoco los construyó — no
   hay overreach nuevo aquí, solo se mantiene la misma línea. Construirlos
   ahora significaría inventar un mecanismo de regeneración de contenido ad
   hoc antes de que exista una razón real (ninguna pantalla los necesita
   todavía) y, en el caso de "Preguntar", duplicaría al Tutor en vez de
   reutilizarlo. `[Entendido]` y `[Continuar →]` sí se implementan — son
   los únicos controles de navegación reales del wireframe.
3. **"Quick check" = auto-reporte de comprensión, no una pregunta generada
   ni calificada.** `session_activities.activity_type` incluye `question`,
   pero el motor de preguntas real (`questions`, generación, scoring) es
   Assessment (Fase 7), que no existe. Inventar una pregunta de opción
   múltiple ad hoc aquí duplicaría ese futuro sistema con una versión a
   medias. En su lugar, "Entendido" / "Necesito repasar" son el quick check
   completo de esta fase: el primero marca la lección completada
   (persistido), el segundo la deja en `in_progress` sin avanzar. Real y
   honesto con lo que existe, sin fabricar una calificación.
4. **Sin citación por lección todavía.** El wireframe muestra "Fuente:
   Builder Manual p. 82" bajo la explicación. El mecanismo correcto para
   eso es `concept_sources` (vincula un concepto/lección a los chunks que
   lo respaldan) — deliberadamente diferido a Fase 8/11 (ADR-016, punto 1).
   Calcular una cita ad hoc vía `RetrievalService` habría requerido el
   modelo de embeddings local (mismo bloqueo de red que ADR-012) solo para
   construir un mecanismo paralelo y desechable al que ya está planeado
   correctamente más adelante. La tarjeta de lección de Fase 6 muestra
   título + `summary` (ya generado en Fase 5), sin cita.
5. **Sin timer visible.** El wireframe muestra un cronómetro
   (`28:41`). `UX_UI.md` §11 exige explícitamente "no mostrar demasiadas
   métricas mientras estudia" — un timer en vivo no tiene ningún consumidor
   real (no hay límite de tiempo que hacer cumplir) y habría sido
   puramente decorativo. `actual_minutes` se calcula igualmente al cerrar
   la sesión, a partir de `started_at`/`completed_at` reales, sin necesitar
   una cuenta regresiva en pantalla.
6. **Selección de lecciones por presupuesto de `dailyMinutes`.** Al iniciar
   o reanudar, `StudySessionService` toma las lecciones pendientes del
   curso en orden (módulo → posición de lección) y las agrupa hasta agotar
   `course.dailyMinutes`, garantizando siempre al menos una lección aunque
   por sí sola supere el presupuesto (una sesión nunca queda vacía).
7. **Consistencia de agregado centralizada en `CourseRepository`.**
   `markLessonCompleted`/`markLessonInProgress` viven en el repositorio del
   curso, no en el servicio de sesión: recalculan el estado del módulo y el
   progreso/estado del curso en la misma transacción que actualiza la
   lección. Mantiene la regla "un repositorio por agregado" (el curso con
   sus módulos/lecciones es un solo agregado) en vez de esparcir lógica de
   recomputo entre dos repositorios.
8. **Notas: solo lo que Fase 6 usa de verdad.** `notes.concept_id`
   (DATA_MODEL.md §23) no se crea todavía — `concepts` no existe hasta Fase
   8, mismo patrón que las tablas ya diferidas en ADR-007/016. Se añadirá
   como columna aditiva cuando llegue, nunca editando esta migración. La
   UI de notas se limita a "tomar una nota mientras estudias" (ligada a
   `courseId`) y verla en el detalle del curso — no se construye un
   navegador de notas independiente (`/notes` sigue como placeholder); eso
   excede lo que Fase 6 pide y no tiene un dueño claro en el roadmap
   todavía.
9. **`/study` como landing de cursos activos + `/study/:courseId` como
   pantalla enfocada.** Refleja la estructura ya usada por
   Biblioteca/Cursos (lista → detalle) y evita necesitar un selector de
   curso embebido en la propia pantalla de estudio.

**Verificación.** A diferencia de Fase 4/5, esta fase no tiene ninguna
limitación de red que documentar — todo se verificó de punta a punta:
- Unit tests deterministas, sin mocks de IA (`tests/unit/study/
  studySessionService.test.ts`, `tests/unit/database/
  studySessionRepository.test.ts`, extensiones de `courseRepository.test.ts`
  para `markLessonCompleted`/`markLessonInProgress`/`listPendingLessons`,
  `tests/unit/database/noteRepository.test.ts`): agrupamiento por
  presupuesto diario, al menos una lección garantizada, reanudar una sesión
  activa en vez de crear una nueva, recomputo de progreso/estado de
  módulo/curso, transición a `COURSE_COMPLETE`, notas aisladas por curso.
- E2E real (`tests/e2e/study.spec.ts`), sembrando un curso directamente con
  las mismas clases de repositorio que usa la app (no SQL a mano) contra el
  archivo SQLite exacto que la app abre, para evitar depender de una
  generación real de OpenAI: el criterio de aceptación literal "estudiar,
  cerrar, abrir, continuar" probado cerrando y reabriendo la app de verdad
  entre sesiones; completar todas las lecciones de un curso hasta el 100%;
  una nota tomada durante el estudio visible en el detalle del curso.

---

### ADR-018 — Alcance y decisiones de Assessment (Fase 7)

**Contexto.** `ROADMAP_IMPLEMENTATION.md` §9 pide "quiz generator, question
player, scoring, explanations, source refs, history", con criterio de
aceptación "quiz completo con resultados". `DATA_MODEL.md` §17-19 define
`questions`, `assessment_attempts`, `assessment_answers`. `UX_UI.md` §14-17
muestran un "Exam Center" (Quick Quiz/Practice Test/Module Exam/Final
Exam/Custom Exam), un "Custom Exam Builder" (contenido, número de
preguntas, dificultad, tipos, tiempo, feedback inmediato) y una pantalla de
resultados con comparación histórica, fortalezas/debilidades y un botón
"Crear sesión de recuperación".

**Decisiones:**

1. **Un solo flujo de examen, no el Exam Center completo.** Se construye
   un único generador (curso completo, opción múltiple, ~10 preguntas por
   intento) en vez de las cinco variantes del wireframe (Quick/Practice/
   Module/Final/Custom). Ninguna de esas variantes tiene todavía una
   diferencia real de comportamiento que las justifique (mismo criterio que
   ADR-014 con el selector de modo del Tutor: "no exponer modos que no
   hacen nada distinto todavía"). El Custom Exam Builder (elegir dificultad,
   tipos, tiempo límite, feedback inmediato sí/no) queda diferido por la
   misma razón — construirlo ahora sería una UI sin ninguna lógica de
   negocio diferenciada detrás.
2. **`assessment_type` fijo en `'quiz'`.** Consecuencia directa de la
   decisión anterior — no hay todavía una categorización real que ese campo
   deba distinguir.
3. **Un único tipo de pregunta: `multiple_choice`, con exactamente 4
   opciones.** Es el único tipo que aparece en el wireframe real de Exam
   Mode (`UX_UI.md` §16). `questions.type` queda tipado como
   `'multiple_choice'` únicamente; el enum completo de `DATA_MODEL.md`
   admite más valores para cuando existan.
4. **Sin `attempt_questions`: `assessment_answers` hace de manifiesto del
   intento.** `DATA_MODEL.md` no define una tabla de unión entre un intento
   y sus preguntas — solo liga preguntas a intento a través de
   `assessment_answers`, que en el modelo original solo existiría una vez
   contestada la pregunta. Para saber qué preguntas pertenecen a un intento
   *antes* de responder (necesario para el reproductor y para poder navegar
   Anterior/Siguiente), se reinterpreta esa tabla: se inserta una fila por
   pregunta en el momento de crear el intento (`answer_json`/`is_correct`
   NULL, "sin responder") y se completa al contestar. Alternativa
   descartada: añadir una tabla `attempt_questions` nueva — habría sido una
   tabla más fiel a una relación N:M explícita, pero se prefiere no añadir
   una tabla que `DATA_MODEL.md` no contempla cuando la tabla existente ya
   puede modelar el mismo hecho con un cambio de nulabilidad, documentado
   aquí. El orden de las preguntas de un intento se conserva vía
   `ORDER BY id ASC` sobre esas filas (ids del factory ulid monotónico,
   igual que en toda la app).
5. **Citas por construcción, igual que el Tutor (ADR-014).** La IA nunca
   genera `source_refs_json` — genera solo prompt/opciones/respuesta
   correcta/explicación/dificultad (validado con Zod, mismo patrón que
   Fase 5). Una vez creadas las preguntas, `QuizService` busca por
   `RetrievalService.search(pregunta.prompt, course.documentIds, 1)` y
   adjunta el mejor chunk como cita real. Si la búsqueda falla (modelo de
   embeddings no disponible, ver ADR-012) o no encuentra nada, la pregunta
   simplemente queda sin cita — nunca bloquea la generación del examen
   (mismo principio *offline-first* que ADR-013).
6. **Cada "Nuevo examen" genera preguntas frescas — no hay banco de
   preguntas reutilizable.** Reutilizar/excluir preguntas ya vistas es
   parte del "Custom Exam Builder" diferido (decisión #1). Cada generación
   crea un conjunto de preguntas nuevo, exclusivo de ese intento.
7. **Comparación histórica sí; fortalezas/debilidades/confianza/sesión de
   recuperación no.** `previousAverageScore` (promedio de intentos previos
   completados del mismo curso) es calculable con lo que ya existe.
   Fortalezas/debilidades por tema y una "sesión de recuperación" real
   necesitan vincular preguntas falladas a conceptos/lecciones concretas —
   eso depende de `concept_sources`/`lesson_concepts` (Fase 8/11), igual
   que la cita por lección de Study Mode (ADR-017, punto 4). "Confianza
   estimada" (que el propio usuario reporte qué tan seguro estaba)
   corresponde a `assessment_answers.confidence_optional`, ya en el
   esquema pero sin ninguna pantalla que lo pida todavía — se deja NULL.
8. **Sin cronómetro ni "Marcar para revisar".** Mismo criterio que Study
   Mode (ADR-017, punto 5): sin consumidor real de un límite de tiempo
   todavía, y "Marcar" es una comodidad de navegación no pedida por el
   roadmap. `duration_seconds` se calcula igual de forma real a partir de
   `started_at`/`completed_at`, sin necesitar un reloj visible.
9. **Respuestas persistidas antes de finalizar; los resultados nunca
   exponen la respuesta correcta durante el intento.** `AttemptQuestion`
   (lo que ve el reproductor) no incluye `correctIndex`/`explanation`;
   `ResultQuestion` (lo que ve la pantalla de resultados) sí. Guardar cada
   respuesta al elegirla (no solo al finalizar) es una consecuencia natural
   del diseño del punto 4 y permite cambiar de opción libremente antes de
   finalizar.

**Verificación.** Igual que Fase 6, todo el ciclo de tomar/calificar un
examen es determinista y se verificó de punta a punta sin limitaciones de
red; solo la *generación* depende de OpenAI (bloqueado aquí, igual que
Fase 5):
- Unit tests deterministas: `QuestionRepository` (persistencia y orden),
  `AssessmentRepository` (manifiesto de intento, respuestas
  sobrescribibles, cálculo de score/duración, promedio histórico excluyendo
  el intento actual e intentos sin terminar), `QuizService` con un
  `AIProvider` falso (generación válida, `NOT_FOUND`, reinvalidación Zod de
  una respuesta mal formada sin persistir nada, passthrough de `AppError`,
  scoring real contra el índice correcto, cita real adjuntada vía
  `RetrievalService` con embeddings deterministas).
- E2E real (`tests/e2e/exams.spec.ts`): un curso y sus preguntas sembrados
  con las mismas clases de repositorio que usa la app (no SQL a mano),
  reproductor completo (responder, cambiar de pregunta, finalizar),
  resultados con score/explicaciones/citas correctos, e historial
  reflejándolo; por separado, generar un examen sin clave de OpenAI
  configurada muestra el error normal de la app en vez de fallar de forma
  confusa (mismo patrón que Fase 5).

**Lo que queda pendiente de verificar en el Mac de destino**: un examen
generado realmente por OpenAI a partir de un curso real, incluida la
calidad de las preguntas y la relevancia de las citas reales de
`RetrievalService` (que sí requiere el modelo de embeddings local
descargado, ver ADR-012).

---

### ADR-019 — Alcance y decisiones de Mastery (Fase 8)

**Contexto.** `ROADMAP_IMPLEMENTATION.md` §10 pide "concept tracking,
mastery score, weak-area detection, remediation". `DATA_MODEL.md` §12-14
define `concepts`/`lesson_concepts`/`concept_sources` (deliberadamente no
creadas en Fase 5/6, ver ADR-016 punto 1 y ADR-017 punto 4) y §22 define
`mastery_scores`. Esta es la primera fase que no añade una pantalla nueva:
conecta Course Engine (Fase 5), Study Mode (Fase 6) y Assessment (Fase 7)
entre sí.

**Decisiones:**

1. **`concepts` es global, deduplicado por `canonical_key`.** No está
   scopeado a un curso — la misma "Change Orders" mencionada en dos cursos
   distintos es una sola fila. `canonicalKey()` normaliza (minúsculas, sin
   acentos, separadores a guiones) antes de comparar. Es lo que permite que
   `mastery_scores` (concept_id + course_id) signifique algo real por curso
   y, más adelante, que el Mapa de Conocimiento (Fase 11) pueda agregar
   dominio entre cursos.
2. **Conceptos generados junto con el contenido que ya se genera, no con
   una llamada de IA aparte.** `courseGenerationSchema.ts`'s
   `lessonPlanSchema` gana un campo `concepts` (1-5 títulos, más importante
   primero) y `quizGenerationSchema.ts`'s `quizQuestionSchema` gana
   `concept` (uno). Ambos **opcionales**: un curso o examen generado antes
   de esta fase, o cualquier fixture de test que no le importe mastery,
   simplemente no linkea conceptos — evita duplicar el costo de una
   llamada a IA solo para extraer conceptos después de generar el
   contenido, y evita reescribir cada fixture de test existente de
   Fase 5/7 para añadir un campo que no necesitan.
3. **`concept_sources` sí se puebla en esta fase — no queda como tabla sin
   consumidor.** A diferencia de la citación por lección (ADR-017 punto 4,
   diferida por completo), aquí el propio roadmap pide "concept tracking"
   como bloque explícito, y `concept_sources` es literalmente el mecanismo
   de DATA_MODEL para eso. Se puebla igual que las citas del Tutor/
   Assessment (ADR-014/018): la IA nunca genera la cita, `CourseService`
   busca por `RetrievalService.search(concepto.title, ...)` tras crear el
   curso y adjunta los chunks reales encontrados — best-effort, nunca
   bloquea la creación del curso si el modelo de embeddings no está
   disponible (ADR-013). Se muestra en `MasteryPanel` de forma indirecta
   (a través de `ConceptMastery.sources`, aunque la UI de esta fase no
   los renderiza todavía — ver "Pendiente" más abajo).
4. **Score = promedio acumulado simple, no una media ponderada por
   recencia.** `MasteryRepository.recordEvidence` recalcula
   `(score_anterior × evidencias_anteriores + nueva_evidencia) /
   evidencias_totales`. Se consideró una fórmula con decaimiento (dar más
   peso a evidencia reciente) pero no hay ninguna señal real todavía de
   que la evidencia vieja deba pesar menos — añadir esa complejidad sin
   justificación sería exactamente el tipo de sobre-ingeniería que el
   roadmap pide evitar. `state` se deriva puramente de umbrales sobre el
   score (`new` solo si `evidence_count = 0`; luego `learning` <50,
   `familiar` <75, `competent` <90, `mastered` ≥90).
5. **Dos fuentes de evidencia, ambas ya reales de fases anteriores.**
   `StudySessionService.completeActivity` (Fase 6) registra evidencia
   "Entendido"/"Necesito repasar" (75/25 — autorreporte, más débil) para
   cada concepto de la lección. `QuizService.finish` (Fase 7) registra
   evidencia de cada pregunta respondida con concepto vinculado (100/0 —
   objetiva). Una pregunta **sin responder** nunca cuenta como evidencia
   (distinto de contarla como incorrecta) — se verifica explícitamente
   comparando contra las respuestas registradas, no contra un valor por
   defecto.
6. **Detección de área débil: `learning` antes que `new`.** `new` (sin
   evidencia) es menos accionable que `learning` (con evidencia, con
   dificultad real) — un concepto nunca estudiado no es necesariamente
   "débil", solo pendiente. `weakConcepts` prioriza `learning` (ordenado
   por score ascendente) y añade `new` al final.
7. **Remediación reutiliza `study_sessions`/`session_activities` tal
   cual, sin pantalla nueva.** `StudySessionService.startRemediation`
   agrupa por presupuesto de `dailyMinutes` (misma función que
   `startOrResume`) las lecciones de los conceptos más débiles,
   **ignorando si la lección ya está completada** — a diferencia de una
   sesión normal, que solo mira lecciones pendientes. Se etiqueta
   `activity_type = 'review'` (ya en el enum de DATA_MODEL, sin usar hasta
   ahora) para que quede distinguible. `StudySessionPage` no necesitó
   ningún cambio: una sesión de recuperación se ve y se juega exactamente
   igual que una normal.
8. **Sin candado si ya hay una sesión activa.** Si el usuario pulsa "Crear
   sesión de recuperación" mientras tiene otra sesión de estudio a medias,
   la nueva sesión de recuperación pasa a ser la "activa" (la reanudación
   siempre toma la más reciente) y la anterior queda huérfana — no
   recuperable desde la UI. Aceptado como limitación conocida en una app
   personal de un solo usuario; añadir un candado explícito no tiene
   todavía un caso de uso real que lo justifique.
9. **`MasteryPanel` vive dentro de `CourseDetailPage`, no en una pantalla
   propia.** `nav.ts` no reserva ninguna entrada para "Mastery" — el
   dominio por curso es información contextual del curso, no una sección
   de navegación independiente. Se oculta por completo (`return null`)
   cuando el curso no tiene ningún concepto vinculado (cursos generados
   antes de esta fase), en vez de mostrar una tarjeta vacía.

**Consecuencia en otros archivos.** `CourseService` gana `ConceptRepository`
y `RetrievalService` como dependencias nuevas; `QuizService` gana
`MasteryService`; `StudySessionService` gana `ConceptRepository` y
`MasteryService`. Todos los call sites (IPC, tests) se actualizaron para
inyectar las nuevas dependencias — sin cambios de comportamiento para el
código que no usa conceptos (todo sigue funcionando igual con cero
conceptos vinculados).

**Pendiente (fases siguientes).** La UI de esta fase no muestra las citas
de `concept_sources` (aunque ya se generan y persisten) ni "confianza
estimada" — eso encaja mejor en el Mapa de Conocimiento (Fase 11), que sí
necesita presentar esas fuentes visualmente.

**Verificación.** Como Study Mode (Fase 6), esta fase no depende de
ninguna llamada a IA en su propio ciclo (registrar evidencia, calcular
mastery, detectar áreas débiles, armar una sesión de recuperación son
deterministas) — solo la generación original de conceptos hereda la
limitación de red de Course Engine/Assessment (ADR-016/018). Se verificó
de punta a punta:
- Unit tests deterministas: `canonicalKey`/`upsertConcept` (dedup por
  clave canónica, acentos/mayúsculas), `ConceptRepository`
  (listForCourse/listConceptIdsForLesson/getLessonIdsForConcept/
  addSource+getSources ordenadas por relevancia), `MasteryRepository`
  (promedio acumulado, umbrales de estado, aislamiento por curso),
  `MasteryService` (evidencia de lección/pregunta, "new" con score 0 por
  defecto, orden de `weakConcepts`), extensiones de `CourseService` (link
  de conceptos + citas reales, compatible con estructuras sin conceptos),
  extensiones de `QuizService` (evidencia solo de preguntas respondidas),
  extensiones de `StudySessionService` (evidencia por actividad,
  `startRemediation` con `NO_WEAK_CONCEPTS` cuando no hay nada débil
  todavía, y cubriendo una lección ya completada).
- E2E real (`tests/e2e/mastery.spec.ts`), sembrando conceptos y evidencia
  directamente con las mismas clases de repositorio que usa la app: la
  tarjeta de Dominio del curso muestra los estados correctos, "Crear
  sesión de recuperación" arma una sesión con la lección del concepto más
  débil, y completarla actualiza el estado visible en la misma sesión.

---

### ADR-020 — Alcance y decisiones del Plan adaptativo (Fase 9)

**Contexto.** `ROADMAP_IMPLEMENTATION.md` §11 pide "schedule, target date,
daily minutes, missed session handling, recalculation" — sin un criterio
de aceptación explícito ("Done:"), a diferencia de fases anteriores.
`DATA_MODEL.md` §24 define `study_plans` (course_id, version, start_date,
target_date, daily_minutes, plan_json). `MASTER_SPEC.md` §7 pide
recalcular ante días perdidos, adelanto de contenido, dominio rápido,
fallos repetidos o cambio de meta. `UX_UI.md` §21 muestra un calendario
con tema/duración/estado/prioridad por sesión y tres botones:
reprogramar/cambiar meta/recalcular plan.

**Decisiones:**

1. **El plan es una proyección de calendario, desacoplada de Study
   Mode.** `PlanService` no decide qué contiene una sesión real —
   `StudySessionService` (Fase 6) sigue siendo el único mecanismo que
   arma sesiones, exactamente igual que antes de esta fase. El Plan solo
   dice "qué debería tocar cada día" a partir de las mismas lecciones
   pendientes (`CourseRepository.listPendingLessons`) y el mismo
   `dailyMinutes` del curso. Alternativa descartada: hacer que Study Mode
   consultara el plan para decidir qué servir — habría acoplado dos
   sistemas que hoy funcionan bien por separado, y "cambiar meta" ya
   logra el efecto deseado indirectamente (`updateSchedule` escribe
   `courses.daily_minutes`/`target_date`, que Study Mode ya lee).
2. **Distribución por bin-packing voraz, en el mismo orden que ya usa
   Study Mode.** `distribute()` llena cada día hasta `dailyMinutes` antes
   de pasar al siguiente, sin reordenar por prioridad/dominio — el propio
   roadmap no pide una señal de priorización todavía, y usar el mismo
   orden módulo→lección que Study Mode evita que Plan y Study Mode
   "cuenten historias distintas" sobre qué sigue. Si el trabajo pendiente
   no cabe antes de la fecha objetivo, el excedente se acumula en el
   último día (nunca se pierde) y el plan expone `feasible: false` para
   que la UI lo señale.
3. **"Manejo de sesiones perdidas" es puramente derivado, no un estado
   persistido.** Un día se marca `missed` en el momento de leer el plan
   si su fecha ya pasó y sus lecciones no están completas — comparando
   contra el estado *actual* de las lecciones, no contra una copia
   guardada en `plan_json`. Evita tener que invalidar/sincronizar el plan
   guardado cada vez que se completa una lección en Study Mode; el plan
   se recalcula solo cuando el usuario lo pide explícitamente (ver
   decisión #4), y mientras tanto sus estados por día siempre reflejan la
   realidad actual.
4. **Recalcular es una acción explícita, no automática en cada
   evento.** `MASTER_SPEC.md` sugiere recalcular ante varios disparadores
   (perder días, dominar rápido, fallar repetido...). Recalcular
   automáticamente en cada `completeActivity`/respuesta de examen
   generaría una versión nueva de `study_plans` por cada lección
   completada — ruido de historial sin beneficio real, dado que el plan
   ya refleja lecciones completadas de forma derivada (decisión #3) sin
   necesitar una nueva versión. `recalculate()` se dispara solo desde
   "Recalcular plan" o "Cambiar meta" en la UI.
5. **`study_plans.version` nunca se sobreescribe.** Cada recálculo
   inserta una fila nueva; `getLatest()` siempre lee la más reciente. Es
   la interpretación más simple de que `DATA_MODEL.md` incluya `version`
   como columna — sin necesitar una tabla de auditoría aparte.
6. **Sin "reprogramar" (mover una lección puntual a otro día).** De los
   tres botones del wireframe de `UX_UI.md` §21, solo "cambiar meta" y
   "recalcular plan" se construyen — "reprogramar" (arrastrar/mover el
   contenido de un día a otro manualmente) necesitaría un mecanismo de
   overrides manuales que sobrevivan al siguiente recálculo automático, y
   ninguno de los cinco puntos de `ROADMAP_IMPLEMENTATION.md` lo pide
   explícitamente (solo aparece en el wireframe). Mismo criterio que
   Fase 7 con el Custom Exam Builder (ADR-018) y Fase 8 con la
   "sesión de recuperación" antes de que existiera Mastery.
7. **Vista de calendario como lista cronológica, no una grilla visual.**
   `UX_UI.md` pide un "calendario semanal/mensual" pero también advierte
   "evitar gráficas decorativas sin utilidad" (§20, sección Progreso,
   aplicado aquí por el mismo espíritu). Una lista de tarjetas por día ya
   muestra tema/duración/estado exactamente como pide el wireframe, sin
   construir un componente de grilla de calendario que ninguna otra
   pantalla necesita todavía.
8. **`PlanLandingPage` solo lista cursos activos**, igual que
   `StudyLandingPage` — un curso completado ya no tiene nada que planear.
   Su plan sigue siendo accesible directamente por URL
   (`/plan/:courseId`), simplemente no aparece en el listado.

**Verificación.** Como Study Mode (Fase 6) y Mastery (Fase 8), calcular y
recalcular un plan es completamente determinista — sin ninguna llamada a
IA ni limitación de red que documentar. Se verificó de punta a punta:
- Unit tests deterministas con reloj simulado (`vi.useFakeTimers`):
  `PlanRepository` (versionado, aislamiento por curso), `PlanService`
  (distribución respetando `dailyMinutes`, estados `today`/`upcoming`/
  `missed`/`completed` — incluyendo que una lección completada *después*
  de guardar el plan se refleja sin recalcular—, recálculo tras cambiar
  meta, cálculo de `feasible` en ambos sentidos, y un plan vacío sin
  lanzar error cuando ya no quedan lecciones pendientes).
- E2E real (`tests/e2e/plan.spec.ts`), sembrando un curso con las mismas
  clases de repositorio que usa la app: el calendario muestra "Hoy"/
  "Próxima" correctamente, "Cambiar meta" con minutos diarios más altos
  redistribuye todo a un solo día en la recarga, y "Ir a estudiar" entra
  a Study Mode y confirma que el cambio de `dailyMinutes` hecho desde
  Plan también afecta cómo Study Mode arma su propia sesión (la
  desacoplación de la decisión #1 no significa que ignoren los mismos
  datos del curso). Un curso ya completado no aparece en el listado de
  Plan pero su plan (vacío) sigue siendo accesible directamente.
