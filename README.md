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
- **`AIProvider`** — generación de texto (`OpenAIProvider`, desde Fase 4).

Ver `docs/DECISIONS.md` (ADR-005) para el razonamiento completo.

## Estado

Fases 0 a 3 completadas (ver `ROADMAP.md`). Además de persistencia,
Configuración (Fase 1) y la Biblioteca con viewer de PDF (Fase 2), los
documentos ahora se dividen en chunks y se indexan localmente (embeddings
en el dispositivo, sin enviar contenido a servicios externos); el buscador
de la barra superior hace búsqueda semántica real sobre la biblioteca y
cada resultado abre el PDF en la página correcta. Si no hay conexión para
descargar el modelo de embeddings la primera vez, el documento sigue siendo
100% legible — solo queda sin indexar hasta reintentarlo. El resto de
pantallas se implementan en su fase correspondiente.

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

## Privacidad

Los documentos del usuario permanecen en disco local
(`app.getPath('userData')`). El modo por defecto del tutor es **Closed Library
Mode**: solo responde con lo que puede recuperar y citar de la biblioteca del
usuario. Ver `docs/AI_RAG.md`.
