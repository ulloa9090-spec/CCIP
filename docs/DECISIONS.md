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
