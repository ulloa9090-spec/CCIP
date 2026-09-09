import type { AbstentionReason } from '@shared/types/diagnostics'

/**
 * Two audiences, one source of truth (spec: a non-technical "¿Por qué?" on
 * the Tutor answer itself, plus a separate, more technical explanation for
 * developers). `technical` names the exact real signal each code is derived
 * from (see abstentionClassifier.ts / tutorService.ts) — never a vague
 * restatement of the user-facing copy.
 */
export const ABSTENTION_REASON_LABELS: Record<
  AbstentionReason,
  { user: string; technical: string }
> = {
  NO_INDEXED_DOCUMENTS: {
    user: 'Tu biblioteca todavía no tiene documentos importados.',
    technical:
      'NO_INDEXED_DOCUMENTS — DocumentRepository.list() devolvió 0 documentos antes de intentar la recuperación.'
  },
  DOCUMENT_PROCESSING_INCOMPLETE: {
    user: 'Tus documentos todavía se están procesando. Intenta de nuevo en un momento.',
    technical:
      'DOCUMENT_PROCESSING_INCOMPLETE — no hay fragmentos indexados y al menos un trabajo de procesamiento sigue activo (ProcessingJobRepository.countActive() > 0).'
  },
  NO_EMBEDDINGS: {
    user: 'Tus documentos existen pero aún no se indexaron. Prueba "Reindexar" en Biblioteca.',
    technical:
      'NO_EMBEDDINGS — hay documentos pero document_chunks está vacío y no hay trabajos activos: la indexación no se completó o falló.'
  },
  NO_RETRIEVAL_RESULTS: {
    user: 'No encontré nada relacionado en tu biblioteca.',
    technical:
      'NO_RETRIEVAL_RESULTS — la búsqueda por similitud no devolvió candidatos para esta consulta.'
  },
  INSUFFICIENT_RETRIEVAL_SCORE: {
    user: 'Encontré información relacionada, pero no suficiente para responder con confianza.',
    technical:
      'INSUFFICIENT_RETRIEVAL_SCORE — el modelo devolvió el mensaje fijo de evidencia insuficiente. Closed Library Mode no aplica hoy un umbral numérico de similitud (ver ADR-024); esta es su decisión textual, no un corte por puntaje.'
  },
  AI_PROVIDER_NOT_CONFIGURED: {
    user: 'Falta configurar tu clave de OpenAI en Configuración > AI Provider.',
    technical: 'AI_PROVIDER_NOT_CONFIGURED — el proveedor de IA lanzó AI_KEY_NOT_CONFIGURED.'
  },
  AI_PROVIDER_ERROR: {
    user: 'No se pudo conectar con el proveedor de IA.',
    technical:
      'AI_PROVIDER_ERROR — la llamada al proveedor falló antes de producir ningún contenido.'
  },
  AI_STREAM_ERROR: {
    user: 'La respuesta se interrumpió a mitad de camino.',
    technical:
      'AI_STREAM_ERROR — ya se había entregado contenido cuando la conexión con el proveedor falló.'
  },
  STRUCTURED_OUTPUT_VALIDATION_FAILED: {
    user: 'La respuesta generada no tenía el formato esperado.',
    technical:
      'STRUCTURED_OUTPUT_VALIDATION_FAILED — reservado; el Tutor no genera salida estructurada hoy.'
  },
  CITATION_RECONSTRUCTION_FAILED: {
    user: 'No se pudieron reconstruir las fuentes de la respuesta.',
    technical:
      'CITATION_RECONSTRUCTION_FAILED — reservado; el Tutor construye citas directamente desde los resultados de recuperación.'
  },
  UNKNOWN_ERROR: {
    user: 'Ocurrió un error inesperado.',
    technical: 'UNKNOWN_ERROR — el error recibido no era un AppError reconocido.'
  }
}
