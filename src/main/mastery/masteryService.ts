import type { ConceptRepository } from '../database/repositories/conceptRepository'
import type { MasteryRepository } from '../database/repositories/masteryRepository'
import type { ConceptMastery, CourseMastery } from '../../shared/types/mastery'

/** Self-reported quick-check evidence (Study Mode) is weaker than a scored quiz answer. */
const UNDERSTOOD_EVIDENCE = 75
const NEEDS_REVIEW_EVIDENCE = 25
const CORRECT_EVIDENCE = 100
const INCORRECT_EVIDENCE = 0

/**
 * Concept tracking, mastery scoring, and weak-area detection
 * (ROADMAP_IMPLEMENTATION.md Fase 8). Evidence comes from two already-real
 * surfaces — Study Mode's quick check (Fase 6) and Assessment's scored
 * answers (Fase 7) — recorded through this service instead of each caller
 * reimplementing the scoring rule. See docs/DECISIONS.md (Fase 8 ADR).
 */
export class MasteryService {
  constructor(
    private readonly concepts: ConceptRepository,
    private readonly mastery: MasteryRepository
  ) {}

  recordLessonEvidence(courseId: string, lessonId: string, understood: boolean): void {
    const evidenceValue = understood ? UNDERSTOOD_EVIDENCE : NEEDS_REVIEW_EVIDENCE
    for (const conceptId of this.concepts.listConceptIdsForLesson(lessonId)) {
      this.mastery.recordEvidence(conceptId, courseId, evidenceValue)
    }
  }

  recordQuestionEvidence(courseId: string, conceptId: string | null, isCorrect: boolean): void {
    if (!conceptId) return
    this.mastery.recordEvidence(
      conceptId,
      courseId,
      isCorrect ? CORRECT_EVIDENCE : INCORRECT_EVIDENCE
    )
  }

  getCourseMastery(courseId: string): CourseMastery {
    const scoresByConcept = new Map(
      this.mastery.listForCourse(courseId).map((score) => [score.conceptId, score])
    )

    const concepts: ConceptMastery[] = this.concepts.listForCourse(courseId).map((concept) => {
      const score = scoresByConcept.get(concept.id)
      return {
        conceptId: concept.id,
        title: concept.title,
        score: score?.score ?? 0,
        state: score?.state ?? 'new',
        evidenceCount: score?.evidenceCount ?? 0,
        sources: this.concepts.getSources(concept.id)
      }
    })

    // "learning" (attempted and struggling) is more actionable than "new"
    // (no evidence yet), so it's surfaced first.
    const weakConcepts = concepts
      .filter((concept) => concept.state === 'learning' || concept.state === 'new')
      .sort((a, b) => {
        if (a.state !== b.state) return a.state === 'learning' ? -1 : 1
        return a.score - b.score
      })

    return { courseId, concepts, weakConcepts }
  }
}
