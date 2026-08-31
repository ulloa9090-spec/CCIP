# STUDYOS — DATA_MODEL.md
## Modelo de datos
### Versión 1.0

## 1. users
Para MVP puede existir un solo perfil.

Campos:
- id
- display_name
- created_at
- updated_at

## 2. settings
- id
- key
- value_json
- updated_at

No guardar API keys aquí.

## 3. documents
- id
- title
- original_filename
- local_path
- mime_type
- page_count
- status
- file_hash
- created_at
- updated_at

status:
- imported
- extracting
- chunking
- embedding
- ready
- failed

## 4. document_pages
- id
- document_id
- page_number
- text
- heading
- metadata_json

## 5. document_chunks
- id
- document_id
- page_start
- page_end
- heading
- text
- token_count
- embedding_ref
- metadata_json

## 6. collections
- id
- name
- description
- created_at

## 7. collection_documents
- collection_id
- document_id

## 8. courses
- id
- title
- objective
- level
- target_date
- daily_minutes
- status
- progress
- created_at
- updated_at

## 9. course_documents
- course_id
- document_id

## 10. modules
- id
- course_id
- title
- position
- estimated_minutes
- status

## 11. lessons
- id
- module_id
- title
- position
- lesson_type
- estimated_minutes
- status

## 12. concepts
- id
- title
- description
- canonical_key
- created_at

## 13. lesson_concepts
- lesson_id
- concept_id
- importance

## 14. concept_sources
- concept_id
- document_chunk_id
- relevance

## 15. study_sessions
- id
- course_id
- planned_date
- started_at
- completed_at
- estimated_minutes
- actual_minutes
- status

## 16. session_activities
- id
- study_session_id
- activity_type
- payload_json
- position
- completed_at

Tipos:
- lesson
- question
- flashcard
- exercise
- review
- chat

## 17. questions
- id
- course_id
- module_id
- concept_id
- type
- prompt
- choices_json
- correct_answer_json
- explanation
- difficulty
- source_refs_json

## 18. assessment_attempts
- id
- assessment_type
- course_id
- started_at
- completed_at
- score
- total_questions
- correct_count
- duration_seconds

## 19. assessment_answers
- id
- attempt_id
- question_id
- answer_json
- is_correct
- response_time_ms
- confidence_optional

## 20. flashcards
- id
- course_id
- concept_id
- front
- back
- hint
- source_refs_json
- created_at

## 21. flashcard_reviews
- id
- flashcard_id
- reviewed_at
- rating
- interval_days
- ease_factor
- next_review_at

## 22. mastery_scores
- id
- concept_id
- course_id
- score
- state
- evidence_count
- last_updated

state:
- new
- learning
- familiar
- competent
- mastered

## 23. notes
- id
- title
- body
- document_id nullable
- page_number nullable
- course_id nullable
- concept_id nullable
- created_at
- updated_at

## 24. study_plans
- id
- course_id
- version
- start_date
- target_date
- daily_minutes
- plan_json
- created_at

## 25. ai_conversations
- id
- course_id nullable
- document_scope_json
- mode
- title
- created_at
- updated_at

## 26. ai_messages
- id
- conversation_id
- role
- content
- source_refs_json
- created_at

## 27. processing_jobs
- id
- job_type
- document_id nullable
- status
- progress
- error_code
- error_message
- created_at
- updated_at

## 28. achievements
- id
- key
- title
- description

## 29. user_achievements
- achievement_id
- unlocked_at

## 30. Índices

Crear índices para:
- document_chunks.document_id
- document_pages.document_id
- lessons.module_id
- modules.course_id
- questions.course_id
- mastery_scores.course_id
- flashcard_reviews.next_review_at
- study_sessions.planned_date

## 31. Reglas

- IDs: UUID/ULID.
- Timestamps ISO o SQLite datetime consistente.
- FK activadas.
- Soft delete solo donde tenga sentido.
- Migrations obligatorias.
- JSON solo para estructuras flexibles; datos consultados frecuentemente deben ser columnas.
