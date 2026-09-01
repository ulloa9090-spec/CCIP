import type { Database } from 'better-sqlite3'
import { ulid } from '../ulid'
import type {
  QuestionDifficulty,
  QuestionSourceRef,
  QuestionType
} from '../../../shared/types/assessment'
import type { QuizStructure } from '../../assessment/quizGenerationSchema'

interface QuestionRow {
  id: string
  course_id: string
  module_id: string | null
  type: QuestionType
  prompt: string
  choices_json: string
  correct_answer_json: string
  explanation: string
  difficulty: QuestionDifficulty
  source_refs_json: string | null
}

export interface Question {
  id: string
  courseId: string
  type: QuestionType
  prompt: string
  choices: string[]
  correctIndex: number
  explanation: string
  difficulty: QuestionDifficulty
  sourceRefs: QuestionSourceRef[]
}

function mapQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    courseId: row.course_id,
    type: row.type,
    prompt: row.prompt,
    choices: JSON.parse(row.choices_json) as string[],
    correctIndex: (JSON.parse(row.correct_answer_json) as { correctIndex: number }).correctIndex,
    explanation: row.explanation,
    difficulty: row.difficulty,
    sourceRefs: row.source_refs_json
      ? (JSON.parse(row.source_refs_json) as QuestionSourceRef[])
      : []
  }
}

export class QuestionRepository {
  constructor(private readonly db: Database) {}

  /** Persists a freshly generated quiz's questions and returns them in the same order. */
  createMany(courseId: string, structure: QuizStructure): Question[] {
    const insert = this.db.prepare(
      `INSERT INTO questions
         (id, course_id, module_id, type, prompt, choices_json, correct_answer_json, explanation, difficulty, source_refs_json)
       VALUES (?, ?, NULL, 'multiple_choice', ?, ?, ?, ?, ?, NULL)`
    )
    const ids: string[] = []
    const persist = this.db.transaction(() => {
      for (const question of structure.questions) {
        const id = ulid()
        ids.push(id)
        insert.run(
          id,
          courseId,
          question.prompt,
          JSON.stringify(question.choices),
          JSON.stringify({ correctIndex: question.correctIndex }),
          question.explanation,
          question.difficulty
        )
      }
    })
    persist()

    return this.getByIds(ids)
  }

  getByIds(ids: string[]): Question[] {
    if (ids.length === 0) return []
    const rows = this.db
      .prepare(`SELECT * FROM questions WHERE id IN (${ids.map(() => '?').join(',')})`)
      .all(...ids) as QuestionRow[]
    const byId = new Map(rows.map((row) => [row.id, mapQuestion(row)]))
    return ids.map((id) => byId.get(id)).filter((q): q is Question => q !== undefined)
  }

  setSourceRefs(questionId: string, sourceRefs: QuestionSourceRef[]): void {
    this.db
      .prepare('UPDATE questions SET source_refs_json = ? WHERE id = ?')
      .run(JSON.stringify(sourceRefs), questionId)
  }
}
