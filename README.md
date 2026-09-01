# StudyOS

StudyOS es una aplicación **local-first** para macOS que convierte los documentos
del usuario (PDFs por ahora) en una biblioteca inteligente, cursos, lecciones,
quizzes, flashcards y un tutor de IA fundamentado en esos documentos.

La documentación completa del producto vive en [`docs/`](./docs):

| Documento | Contenido |
|---|---|
| [`docs/MASTER_SPEC.md`](./docs/MASTER_SPEC.md) | Visión, principios, flujo del MVP |
| [`docs/UX_UI.md`](./docs/UX_UI.md) | Navegación, wireframes, reglas de UX |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Arquitectura técnica (documento vivo) |
| [`docs/AI_RAG.md`](./docs/AI_RAG.md) | Comportamiento de IA, retrieval, grounding |
| [`docs/DATA_MODEL.md`](./docs/DATA_MODEL.md) | Modelo de datos SQLite |
| [`docs/ROADMAP_IMPLEMENTATION.md`](./docs/ROADMAP_IMPLEMENTATION.md) | Plan de construcción por fases |
| [`docs/DECISIONS.md`](./docs/DECISIONS.md) | Registro de decisiones de arquitectura (ADRs) |
| [`ROADMAP.md`](./ROADMAP.md) | Checklist vivo de progreso por fase |

## Stack

Electron · React · TypeScript · Vite (`electron-vite`) · Tailwind CSS v4 ·
Zustand · SQLite (`better-sqlite3`, desde Fase 1) · PDF.js (`pdfjs-dist`, desde
Fase 2 — extracción en Main, viewer en el renderer).

Dos abstracciones de IA independientes (`src/shared/types/ai.ts`):

- **`EmbeddingProvider`** — indexación 100% local. Implementada desde Fase 3
  como `LocalEmbeddingProvider` (`@huggingface/transformers`, backend WASM,
  modelo `Xenova/all-MiniLM-L6-v2`). Ningún chunk de documento se envía a un
  servicio externo solo para generar su embedding.
- **`AIProvider`** — generación de texto. Implementada desde Fase 4 como
  `OpenAIProvider` (SDK oficial `openai`, modelo `gpt-4o-mini` por defecto).

Ver `docs/DECISIONS.md` (ADR-005) para el razonamiento completo.

## Estado

Fases 0 a 11 completadas (ver `ROADMAP.md`). Además de persistencia,
Configuración (Fase 1), la Biblioteca con viewer de PDF (Fase 2) y la
indexación local de documentos (Fase 3), el Tutor (`/tutor`) responde
preguntas basándose únicamente en la biblioteca del usuario: si no hay
evidencia suficiente lo dice explícitamente en vez de inventar una
respuesta, y cada respuesta fundamentada muestra sus fuentes como citas
clicables que abren el PDF en la página exacta. Las conversaciones se
persisten y siguen disponibles al reabrir la app. Si no hay conexión para
descargar el modelo de embeddings la primera vez, el documento sigue siendo
100% legible — solo queda sin indexar hasta reintentarlo.

Desde Fase 5, `/courses` permite crear un curso a partir de uno o varios
documentos de la biblioteca: un wizard de 5 pasos (objetivo, material,
tiempo, estilo, confirmación) genera una estructura de módulos y lecciones
con IA, validada con un esquema estricto antes de guardarse, y el curso
resultante se puede consultar en `/courses/:id`. Desde Fase 6, `/study`
permite tomar esas lecciones de verdad: cada sesión agrupa las lecciones
pendientes según los minutos diarios del curso, se puede marcar cada una
como entendida o pendiente de repasar, tomar notas rápidas ligadas al
curso, y cerrar/reabrir la app retoma exactamente donde quedaste. Desde
Fase 7, `/exams` genera un examen de práctica de opción múltiple a partir
de un curso: cada pregunta se califica contra la respuesta real, muestra
una explicación y, cuando es posible, una cita real a la página del
documento que la respalda, y el historial compara cada intento con el
promedio de los anteriores. Desde Fase 8, cada curso rastrea los conceptos
que enseña (generados junto con sus lecciones y preguntas) y calcula tu
dominio de cada uno a partir de tus quick checks en Study Mode y tus
respuestas en los exámenes; el detalle del curso muestra ese dominio y,
cuando detecta conceptos débiles, permite crear una sesión de recuperación
enfocada en ellos. Desde Fase 9, `/plan` muestra el calendario de cada
curso: qué lecciones tocan cada día según tus minutos diarios, marca en
rojo los días atrasados, y te deja cambiar la fecha objetivo o recalcular
el plan cuando quieras — sin perder de vista que estudiar de verdad sigue
pasando en `/study`. Desde Fase 10, `/flashcards` genera decks de tarjetas
de memoria por curso (front/back/pista, con cita real a la página que las
respalda cuando es posible) o te deja crearlas a mano; el deck es
acumulativo — generar más nunca borra tus tarjetas ni tu historial de
repasos — y `/flashcards/:courseId/review` te hace repasar las que ya
vencen hoy con un scheduling estilo SM-2 (Otra vez/Difícil/Bien/Fácil
ajustan cuándo vuelve a tocar cada una). Desde Fase 11, `/progress`
reúne en un solo lugar tu racha de días estudiados, tiempo total y
reciente, precisión en exámenes y flashcards, dominio por curso e
historial de exámenes — todo calculado a partir de lo que ya hiciste en
Study Mode, Exámenes, Mastery y Flashcards, sin ninguna llamada a IA; y
`/knowledge-map` muestra, por curso, el árbol de conceptos con tu dominio
de cada uno — tocar uno revela sus fuentes citadas y te deja saltar
directo a una sesión de recuperación. El resto de pantallas se
implementan en su fase correspondiente.

## Desarrollo

### Requisitos

- Node.js 22+
- pnpm

### Instalar

```bash
pnpm install
```

### Ejecutar en modo desarrollo

```bash
pnpm dev
```

### Calidad

```bash
pnpm typecheck   # TypeScript strict, main + renderer
pnpm lint        # ESLint
pnpm test        # Vitest (unit + component)
pnpm test:e2e    # Playwright (requiere `pnpm build` previo)
pnpm build       # typecheck + build de producción
```

### Empaquetar (macOS)

```bash
pnpm build:mac
```

Este MVP prioriza la arquitectura del Mac de desarrollo. Distribución universal
Intel + Apple Silicon, firma y notarización no son requisitos de esta fase.

## Usar el Tutor, crear cursos y generar exámenes

Necesitas configurar tu clave de OpenAI en **Configuración > AI Provider**
para que el Tutor genere respuestas, para crear un curso o para generar un
examen de práctica. Sin clave configurada, o sin conexión, la app lo indica
con un mensaje claro en vez de fallar de forma confusa.

## Privacidad

Los documentos del usuario permanecen en disco local
(`app.getPath('userData')`). El modo por defecto del tutor es **Closed Library
Mode**: solo responde con lo que puede recuperar y citar de la biblioteca del
usuario. Ver `docs/AI_RAG.md`.
