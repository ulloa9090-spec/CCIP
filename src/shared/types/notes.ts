export interface Note {
  id: string
  title: string | null
  body: string
  documentId: string | null
  pageNumber: number | null
  courseId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateNoteInput {
  title?: string | null
  body: string
  documentId?: string | null
  pageNumber?: number | null
  courseId?: string | null
}
