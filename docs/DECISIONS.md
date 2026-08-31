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
