export type FlashcardRating = 'again' | 'hard' | 'good' | 'easy'

export interface FlashcardSourceRef {
  documentId: string
  documentTitle: string
  pageStart: number
  pageEnd: number
}

export interface Flashcard {
  id: string
  courseId: string
  front: string
  back: string
  hint: string | null
  sourceRefs: FlashcardSourceRef[]
  dueToday: boolean
  createdAt: string
}

export interface DeckSummary {
  courseId: string
  courseTitle: string
  totalCards: number
  dueCards: number
}

export interface ReviewOutcome {
  flashcardId: string
  rating: FlashcardRating
  intervalDays: number
  nextReviewAt: string
}

export interface CreateFlashcardInput {
  courseId: string
  front: string
  back: string
  hint?: string | null
}
