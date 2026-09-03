# Atlas OS — Product Understanding Report

Estado del repositorio al momento de este análisis: vacío (solo `README.md`). No hay código, no hay Fase 1 iniciada. Este documento es el análisis solicitado antes de tocar código, según la Regla Absoluta de Desarrollo (§51) y la Primera Instrucción (§61). **No se ha escrito código de aplicación.**

---

## 1. Interpretación del producto

Atlas OS es un **sistema operativo personal de ejecución**, no un gestor de tareas. Su función es sostener una sola cadena de trazabilidad de extremo a extremo:

```
Visión de vida → Áreas → Objetivos (Goals) → Ciclo de 90 días → Proyectos
→ Hitos → Prioridades semanales → Tareas → Calendario/Bloques → Hábitos
→ Trabajo realizado (focus sessions, logs) → Métricas → Revisión → Replanificación
```

Toda entidad de ejecución (tarea, bloque de tiempo, hábito) debe poder responder "¿por qué estoy haciendo esto?" subiendo la cadena hasta un objetivo. El producto existe para combatir dispersión, no para acumular funciones. Tres preguntas gobiernan cada decisión de alcance (§60):

1. ¿Qué importa más ahora mismo?
2. ¿Qué debo hacer después?
3. ¿Estoy progresando de verdad?

Dos mecanismos de disciplina son centrales y deben implementarse desde la Fase 1/3, no como añadidos:

- **Active Project**: un único proyecto "Active" a la vez; el resto vive en Secondary/Waiting/Someday. El Dashboard siempre destaca el activo.
- **Idea Parking Lot**: válvula de escape para ideas nuevas, para que el usuario no sienta que debe olvidarlas ni que debe empezarlas ya.

La IA (Fase 10) es una capa de interpretación sobre datos ya existentes, no un generador de contenido autónomo: siempre sugiere, nunca ejecuta cambios estructurales sin aprobación explícita (§30).

---

## 2. Contradicciones y ambigüedades detectadas

| # | Punto | Conflicto / vacío | Resolución propuesta |
|---|-------|--------------------|------------------------|
| 1 | Goal timeframe "90 Day" (§12) vs. módulo "90-Day Plan" (§13, `quarter_cycles`) | No queda claro si un Goal de 90 días *es* el ciclo o vive *dentro* de él | `quarter_cycles` es el contenedor temporal (fecha inicio/fin, resultado esperado). Los `goals` con `timeframe = '90_day'` llevan `quarter_cycle_id` opcional. Un ciclo agrupa N goals/projects, no es un goal en sí mismo. |
| 2 | Weekly Priorities (§10, §25) | No se define como entidad propia en el modelo de datos (§39) | No crear tabla nueva. Modelar como `tasks.is_weekly_priority boolean` + `week_start_date`, límite de 3 por semana validado en backend. Evita duplicar el concepto de "tarea". |
| 3 | AI Planning Assistant descompone Goal→Milestones→Projects→Tasks (§29) vs. guardrail "no crear grandes cantidades de tareas sin aprobación" (§30) | Tensión directa | Toda salida del Planning Assistant se escribe primero en `ai_insights` con `status='pending'` y se renderiza como propuesta editable; nada se inserta en `tasks`/`projects` reales hasta que el usuario confirme. |
| 4 | Taxonomías paralelas: `focus_type` de time blocks (§19), categorías de hábitos (§20), "context" de tareas (§15) | Riesgo de que Analytics no pueda cruzar datos (p. ej. "minutos de Deep Work" contado en dos sitios distintos) | Definir un único enum compartido `focus_context` (Deep Work, Study, Planning, Family, Exercise, Admin, Other) reutilizado por `time_blocks.focus_type`, `focus_sessions.context` y opcionalmente `habits.category`. |
| 5 | Recurrencia: `tasks.recurring` (§15) y `habits.frequency` (§20) mencionados, pero no hay tabla de reglas de recurrencia en §39 | Sin motor de recurrencia definido | Añadir `recurrence_rule` (jsonb simple: `{freq, interval, by_weekday, until}`) embebido en `tasks`/`habits` en vez de tabla aparte; las ocurrencias se materializan bajo demanda al consultar el rango de calendario (no se pre-generan filas infinitas). |
| 6 | Búsqueda global (§32) y notificaciones (§33) aparecen en el Header del Dashboard (Fase 3, §10) pero como funcionalidad se listan en Fases 8 y 11 | Dashboard temprano referenciaría features que no existen aún | En Fase 3 el ícono de búsqueda y notificaciones son placeholders visuales no funcionales (UI presente, sin lógica); se activan en sus fases correspondientes. Documentar esto para que QA no lo marque como bug. |
| 7 | Idea → "Promoted to Project" (§6) no tiene flujo descrito | Falta definir la transición | Al promover, se crea un `project` con `status` inicial sujeto a la Regla del Proyecto Activo (§5): si ya hay un Active Project, el sistema pregunta "¿Reemplaza al proyecto activo o va a Estacionamiento/Secondary?" (mismo guardrail de §29 "Anti-Distraction Guard", aplicado también fuera de la IA). |
| 8 | 21-Day Challenges (§21) vs. Habits (§20) | Alto solapamiento (streak, completion diario) | Se mantienen como entidades separadas por tener fases (1–7/8–14/15–21), score y reflexión final que un hábito normal no tiene. `challenge_days` espeja `habit_logs` en estructura pero no se fusiona, para no forzar un hábito a tener "fases". |
| 9 | PWA offline (§9, §37, Fase 12) vs. RLS + Supabase realtime | Offline-first con escritura y resolución de conflictos es un problema no trivial | Alcance explícito para Fase 12: **shell cacheable + lectura offline de datos ya sincronizados**. Escritura offline con cola de sincronización queda fuera del MVP salvo que se apruebe como fase 13+. |
| 10 | Ubicación de credenciales de IA (§8) | Doc pide "AI_PROVIDER / AI_API_KEY" a nivel app pero también implica Settings de usuario para "AI provider" (§43) | El usuario elige *proveedor* en Settings (valor no sensible), pero la API key vive solo en variables de entorno del servidor (una por proveedor soportado), nunca por usuario ni en el cliente. |

Ninguna de estas contradicciones bloquea el arranque; todas tienen una resolución de bajo riesgo propuesta arriba. Si alguna resolución no es la que el usuario prefiere, debe corregirse antes de la Fase 2 (donde se fija el schema).

---

## 3. Arquitectura final propuesta

**Frontend**
- Next.js 14+ (App Router), TypeScript estricto, Server Components por defecto; Client Components solo donde haya interactividad (Kanban DnD, Focus Timer, formularios).
- Tailwind CSS + una capa de primitivos propios sobre Radix UI (accesibilidad gratis: foco, aria, teclado) — no un design system externo pesado, para mantener identidad visual propia (§35).
- Estado de servidor: fetch directo en Server Components/Server Actions; TanStack Query solo en las vistas altamente interactivas (Kanban, Calendar) para cache optimista.
- Estado de UI efímero (timer corriendo, sidebar colapsada): Zustand, sin persistencia salvo localStorage puntual.
- Validación: Zod, con schemas compartidos entre formulario (cliente) y Server Action (servidor) — una sola fuente de verdad por entidad.

**Backend**
- Sin servidor propio: Next.js Route Handlers + Server Actions como capa de API sobre Supabase.
- Supabase Postgres + Auth + Storage. RLS obligatorio en cada tabla desde su creación (§41) — ninguna tabla se crea "temporalmente" sin política.
- Cliente Supabase tipado (`supabase gen types typescript`), regenerado tras cada migración.

**Capa de IA**
- `lib/ai/provider.ts` define una interfaz (`generateInsight`, `chatCompletion`, etc.) implementada por adaptadores (`lib/ai/providers/anthropic.ts`, `openai.ts`, ...). Selección por `AI_PROVIDER` env var, resuelta solo en servidor.
- Toda llamada de IA pasa por `app/api/ai/*` (Route Handlers); el cliente nunca ve la key ni llama al proveedor directo.
- Salidas estructuradas de IA con impacto en datos (crear tareas, redefinir objetivos) se escriben como propuestas (`ai_insights`, `status: pending`) — nunca mutación directa (§30).

**Infraestructura / entorno**
- Variables de entorno: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (solo servidor), `AI_PROVIDER`, `AI_API_KEY` (o `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` por proveedor).
- Testing: Vitest + Testing Library (unit/component), Playwright reservado para flujos críticos a partir de Fase 5–6 (crear tarea, mover en Kanban, completar hábito).
- Lint/format: ESLint + Prettier + `tsc --noEmit` como gate obligatorio antes de cerrar cualquier fase (§55).

---

## 4. Estructura de repositorio propuesta

```
/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # login, signup, forgot-password
│   ├── (app)/                  # rutas protegidas
│   │   ├── dashboard/
│   │   ├── today/
│   │   ├── goals/
│   │   ├── plan-90-days/
│   │   ├── projects/[id]/
│   │   ├── tasks/
│   │   ├── calendar/
│   │   ├── habits/
│   │   ├── focus/
│   │   ├── journal/
│   │   ├── ideas/
│   │   ├── reviews/
│   │   ├── analytics/
│   │   ├── ai-coach/
│   │   └── settings/
│   └── api/
│       └── ai/                 # route handlers server-only
├── modules/                    # lógica de dominio por feature
│   ├── goals/
│   ├── projects/
│   ├── tasks/
│   ├── habits/
│   ├── calendar/
│   ├── reviews/
│   ├── ideas/
│   └── ai/
│       └── providers/
├── components/
│   ├── ui/                     # primitivos (Button, Card, Modal…)
│   └── layout/                 # Sidebar, Header, QuickAdd
├── lib/
│   ├── supabase/                # clients (server, browser, middleware)
│   ├── ai/
│   ├── validation/               # zod schemas compartidos
│   └── utils/
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── types/
│   └── database.ts              # generado
├── docs/
│   ├── PRODUCT_UNDERSTANDING_REPORT.md   (este archivo)
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   └── decisions/                # un archivo por decisión relevante (§57)
├── tests/
├── ARCHITECTURE.md → (o dentro de /docs, a decidir en Fase 1)
├── CHANGELOG.md
└── README.md
```

---

## 5. Modelo de datos propuesto (nivel conceptual — DDL se define en Fase 2)

Entidades confirmadas de §39 más los ajustes de la sección 2 de este reporte:

**Identidad**
`users` (gestionado por Supabase Auth) → `profiles` (1:1)

**Jerarquía de planeación**
`life_areas` → `goals` (FK `area_id`, `quarter_cycle_id?`) → `goal_metrics` (progreso cuantitativo de un goal)
`quarter_cycles` (ciclo de 90 días: fechas, resultado esperado, indicador principal)
`goals` → `projects` (FK `goal_id`) → `milestones` (FK `project_id`) → `tasks` (FK `project_id?`, `goal_id?`, `milestone_id?`)

**Ejecución**
`tasks` (con `is_weekly_priority`, `week_start_date`, `recurrence_rule jsonb`)
`task_tags` (join tabla tags↔tasks)
`time_blocks` (FK `task_id?`, `project_id?`, `focus_context`)
`calendar_events` (independiente de tasks, para eventos puros)
`focus_sessions` (FK `task_id?`, `project_id?`, `context`, minutos reales)

**Hábitos**
`habits` (FK `goal_id?`, `project_id?`) → `habit_logs`
`challenges` → `challenge_days`

**Memoria / captura**
`ideas` (parking lot; FK `promoted_project_id?`)
`journal_entries`
`decisions`

**Medición**
`weekly_reviews`, `monthly_reviews`
(Weekly Execution Score se calcula, no se guarda como tabla propia salvo un histórico `weekly_scores` para no recalcular retroactivamente si cambia el algoritmo — a confirmar en Fase 9)

**IA**
`ai_conversations`, `ai_insights` (con `status`: pending/approved/rejected)

**Sistema**
`notifications`, `attachments` (Storage refs)

Convenciones: UUID v4 en todas las PK, `created_at`/`updated_at` en todas las tablas, `deleted_at` (soft delete) en entidades que el usuario puede "archivar" en vez de borrar (goals, projects, ideas). RLS: política `user_id = auth.uid()` en todas las tablas con datos de usuario, sin excepción.

Esto es una propuesta de nivel conceptual; el DDL completo, índices y políticas RLS exactas se documentan en `DATABASE.md` durante la Fase 2, no antes.

---

## 6. Riesgos técnicos

1. **RLS mal configurado** — máximo riesgo de seguridad del proyecto; requiere checklist de verificación por tabla antes de cerrar Fase 2.
2. **Alcance del documento vs. disciplina de fases** — el prompt maestro es extremadamente amplio; el riesgo real no es técnico sino de proceso: construir de más dentro de una fase. Mitigación: aplicar §54 (Control de Alcance) literalmente en cada fase.
3. **Algoritmo de Weekly Score subjetivo** — cambiar sus pesos silenciosamente rompe comparabilidad histórica. Mitigación: versionar el algoritmo (§57, decision log) y guardar qué versión se usó en cada score histórico.
4. **Drag-and-drop Kanban + persistencia inmediata** — riesgo de condiciones de carrera si dos vistas (Kanban y Today) editan la misma tarea casi simultáneamente. Mitigación: optimistic UI con reconciliación por `updated_at`.
5. **Offline/PWA** — ya cubierto en contradicción #9; riesgo si se intenta full-offline-write sin diseño de sync explícito.
6. **Zonas horarias en Calendar/Time Blocks** — todas las fechas se guardan en UTC; conversión a timezone de `profiles.timezone` en la capa de presentación únicamente.
7. **Costo/latencia de IA** — llamadas a proveedor externo pueden ser lentas o caras si no se limita contexto enviado; mitigar con un "context engine" que resuma en vez de enviar toda la base de datos del usuario.
8. **Integraciones externas (Google Calendar, etc., Fase 11)** — OAuth y almacenamiento de tokens de terceros es superficie de seguridad nueva; debe tratarse con el mismo rigor que Supabase Auth.

---

## 7. Qué queda fuera del MVP (Fases 1–9)

- Cualquier funcionalidad de IA real (toda la Fase 10 completa) — hasta entonces, `ai_conversations`/`ai_insights` pueden existir en schema pero sin lógica activa.
- Sincronización con Google/Apple/Outlook Calendar (Fase 11).
- Apps móviles nativas (excluido explícitamente por el documento, no solo diferido).
- Infraestructura de notificaciones push/email (Fase 11); antes de eso, recordatorios son solo indicadores visuales en el Dashboard.
- Escritura offline con cola de sincronización (ver riesgo #5); solo shell + lectura cacheada en Fase 12.
- Login social (Google/Apple) y magic link — email/password primero (§42), el resto es "posteriormente".
- Command palette completo (Cmd/Ctrl+K) — Quick Add modal simple en Fase 3; palette completa junto con Global Search en Fase 8.
- Exportación de datos (JSON/CSV/PDF) y backup completo — Fase 12.
- Cualquier forma de gamificación (badges, puntos decorativos, streak-shaming) — excluido por filosofía de producto (§34), no solo por fase.
- Configuración de métricas custom por el usuario (finance/performance) — Fase 1–9 usa campos fijos; UI de configuración de métricas es refinamiento posterior.

---

## 8. Confirmación del orden de las 12 fases

El orden propuesto en el documento es correcto y se confirma sin cambios; las dependencias son consistentes:

1. **Foundation** — no depende de nada, establece la base.
2. **Auth + DB** — necesario antes de que cualquier dato tenga dueño.
3. **Dashboard** — necesita Auth+DB para mostrar datos reales, aunque al inicio puede mostrar estados vacíos.
4. **Goals + Life Map + 90-Day Plan** — es la capa superior de la jerarquía; debe existir antes de que Proyectos tenga algo a qué enlazarse.
5. **Projects + Tasks + Kanban** — depende de Goals (FK `goal_id`).
6. **Today + Calendar + Time Blocking** — depende de Tasks (bloques enlazan a tareas).
7. **Habits + Challenges + Focus Timer** — puede depender opcionalmente de Goals/Projects pero es independiente de Calendar; correcto colocarlo después de tener el loop de ejecución diaria.
8. **Journal + Ideas + Decision Log** — bajo riesgo técnico, encaja bien como capa de memoria tras tener el loop de ejecución.
9. **Reviews + Analytics** — necesita datos de todas las fases anteriores para tener algo que medir.
10. **AI Layer** — necesita un modelo de datos estable y datos reales de usuario para tener contexto útil.
11. **Integrations + Automation** — expande hacia afuera solo cuando el core es sólido.
12. **Production Hardening** — cierre natural.

No se recomienda ningún reordenamiento.

---

## 9. Próximos pasos

El repositorio está vacío; no hay riesgo de romper nada existente. Con este reporte, Atlas OS está listo para iniciar **Fase 1 — Product Foundation** en cuanto se autorice, siguiendo el formato de fase definido en §53 (Phase Objective, Existing State, Files Affected, Architecture Decisions, Database Changes, Components to Build, Risks, Testing Plan → implementar → Completed/Files/Tests/Known Limitations/Next Recommended Phase → detenerse).

**Este documento no incluye código de aplicación. Se espera autorización explícita antes de iniciar la Fase 1.**
