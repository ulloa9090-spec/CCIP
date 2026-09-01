/** `new` means no evidence recorded yet; the rest are score-ordered thresholds. */
export type MasteryState = 'new' | 'learning' | 'familiar' | 'competent' | 'mastered'

export interface ConceptSource {
  documentId: string
  documentTitle: string
  pageStart: number
  pageEnd: number
}

export interface ConceptMastery {
  conceptId: string
  title: string
  score: number
  state: MasteryState
  evidenceCount: number
  sources: ConceptSource[]
}

export interface CourseMastery {
  courseId: string
  concepts: ConceptMastery[]
  weakConcepts: ConceptMastery[]
}
