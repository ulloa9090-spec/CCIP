# STUDYOS — UX_UI.md
## Diseño de experiencia, navegación y pantallas
### Versión 1.0

## 1. Dirección visual

StudyOS debe sentirse:
- moderno
- premium
- calmado
- técnico
- productivo
- limpio
- no infantil

Inspiración conceptual:
- Apple: claridad
- Linear: precisión
- Notion: organización
- Duolingo: progreso y feedback
- plataformas educativas modernas: estructura

No copiar interfaces existentes.

## 2. Estructura base

Aplicación desktop con tres zonas:

┌────────────────────────────────────────────────────────────┐
│ Top Bar                                                    │
├──────────────┬──────────────────────────────┬──────────────┤
│ Sidebar      │ Main Content                 │ Context Pane  │
│              │                              │ opcional      │
│              │                              │               │
└──────────────┴──────────────────────────────┴──────────────┘

### Sidebar
Ancho aproximado: 220–260 px.
Colapsable.

### Top Bar
- búsqueda global
- contexto actual
- estado IA
- perfil/configuración

### Context Pane
Panel derecho opcional para:
- tutor
- fuentes
- notas
- outline
- progreso de sesión

## 3. Navegación

Sidebar:

Inicio
Biblioteca
Mis Cursos
Estudiar
Tutor
Exámenes
Flashcards
Mapa de Conocimiento
Progreso
Plan

Separador

Configuración

## 4. Pantalla: Onboarding

Wireframe:

┌──────────────────────────────────────────────┐
│                STUDYOS                       │
│      Convierte información en dominio        │
│                                              │
│  [ Crear mi perfil ]                         │
│  [ Ver demostración ]                        │
└──────────────────────────────────────────────┘

Flujo:
1. Nombre
2. Meta principal
3. Nivel
4. Tiempo diario
5. Preferencias
6. Configuración IA opcional

Debe poder saltarse y editarse luego.

## 5. Dashboard

Wireframe:

┌──────────────────────────────────────────────────────────┐
│ Buenos días, [Nombre]                  Buscar...          │
│ ¿Qué quieres aprender hoy?                              │
├─────────────────────────┬────────────────────────────────┤
│ CURSO ACTUAL            │ SESIÓN DE HOY                  │
│ Michigan Builder        │ 42 min                         │
│ 68%                     │ Contracts                      │
│ Día 18 / 30             │ Change Orders                  │
│ [Continuar]             │ Quiz                           │
│                         │ [Comenzar sesión]              │
├─────────────────────────┼────────────────────────────────┤
│ DOMINIO                 │ PROGRESO                       │
│ General 74%             │ 🔥 8 días                      │
│ Fuerte: Concrete        │ XP 3,450                       │
│ Débil: Law              │ Nivel 7                        │
├─────────────────────────┴────────────────────────────────┤
│ + Documento   + Curso   + Quiz   + Preguntar al tutor    │
└──────────────────────────────────────────────────────────┘

Acciones prioritarias:
- continuar estudio
- añadir material
- preguntar
- ver debilidad

## 6. Biblioteca

Wireframe:

┌──────────────────────────────────────────────────────────┐
│ Mi Biblioteca                          [+ Agregar]        │
│ [Buscar..............................................]    │
│ Todos | PDFs | Manuales | Notas | Procesados | Pendientes│
├──────────────────────────────────────────────────────────┤
│ Michigan Builder Manual       214 pág   Listo            │
│ Fire Safety Guide              48 pág   Listo            │
│ Notes - Contracts              Nota     Listo            │
└──────────────────────────────────────────────────────────┘

Vista:
- lista / grid
- filtros
- etiquetas
- colección
- estado de procesamiento

## 7. Modal: Importar documento

┌──────────────────────────────────────────────┐
│ Agregar documento                            │
│                                              │
│  Arrastra archivos aquí                      │
│  o                                           │
│  [Seleccionar archivos]                      │
│                                              │
│  PDFs compatibles                            │
└──────────────────────────────────────────────┘

Después:

✓ Archivo cargado
✓ Extracción
✓ Estructura
✓ Conceptos
✓ Índice
✓ Listo

Mostrar errores comprensibles.

## 8. Documento individual

┌──────────────────────────────────────────────────────────┐
│ Michigan Builder Manual                                 │
│ 214 páginas • Procesado                                 │
├──────────────────────────────────────────────────────────┤
│ [Crear curso] [Preguntar] [Resumen] [Quiz] [Flashcards] │
├───────────────────────┬──────────────────────────────────┤
│ Outline               │ Resumen                          │
│ 01 Business           │ Documento técnico...            │
│ 02 Contracts          │                                  │
│ 03 Law                │ Temas detectados                 │
│ 04 Concrete           │ ...                              │
└───────────────────────┴──────────────────────────────────┘

Panel derecho opcional:
- fuentes
- notas
- metadata

## 9. Crear Curso

Wizard de 5 pasos.

### Paso 1 — Objetivo
“¿Qué quieres lograr?”

Campo libre + sugerencias.

### Paso 2 — Material
Seleccionar documentos.

### Paso 3 — Tiempo
- duración
- fecha objetivo
- minutos por día
- días disponibles

### Paso 4 — Estilo
- equilibrado
- visual
- práctico
- conversacional
- examen

### Paso 5 — Confirmación
Mostrar:
- módulos estimados
- carga diaria
- número de evaluaciones
- fecha final

[Crear curso]

## 10. Curso

Wireframe:

┌──────────────────────────────────────────────────────────┐
│ Michigan Residential Builder                            │
│ Objetivo: aprobar examen      68%                       │
│ 30 días                       [Continuar]                │
├──────────────────────────────────────────────────────────┤
│ Module 1 — Business & Law                    ✓           │
│   ✓ Licensing                                            │
│   ✓ Contracts                                            │
│   ✓ Permits                                              │
│ Module 2 — Concrete                         72%          │
│   ✓ Basics                                               │
│   ▶ Reinforcement                                        │
│   ○ Foundations                                          │
│ Module 3 — Framing                          35%          │
└──────────────────────────────────────────────────────────┘

## 11. Study Mode

Pantalla deliberadamente minimalista.

┌──────────────────────────────────────────────────────────┐
│ Session 18                    3 / 7      28:41            │
├──────────────────────────────────────────────────────────┤
│ Change Orders                                            │
│                                                          │
│ Explicación...                                           │
│                                                          │
│ Fuente: Builder Manual p. 82                             │
│                                                          │
│ [Entendido] [Más simple] [Ejemplo] [Preguntar]           │
│                                                          │
│                [Continuar →]                             │
└──────────────────────────────────────────────────────────┘

No mostrar demasiadas métricas mientras estudia.

## 12. Interacciones de Study Mode

Tipos de cards:
- Concept Card
- Example Card
- Quick Check
- Multiple Choice
- True/False
- Calculation
- Scenario
- Reflection
- Flashcard
- Mini Chat
- Summary

Cada actividad debe ocupar foco principal.

## 13. Tutor

┌──────────────────────────────────────────────────────────┐
│ Tutor                           Context: Builder Course   │
├──────────────────────────────────────────────────────────┤
│ Tú: Explícame headers                                   │
│                                                          │
│ Tutor: ...                                               │
│ Sources:                                                 │
│ • Builder Manual p. 145                                  │
│ • Framing Notes p. 12                                    │
│                                                          │
│ [Más simple] [Ejemplo] [Pregúntame] [Crear flashcard]    │
├──────────────────────────────────────────────────────────┤
│ Escribe una pregunta...                         [Enviar] │
└──────────────────────────────────────────────────────────┘

Selector superior:
- Profesor
- Tutor
- Asesor
- Entrenador

## 14. Exam Center

┌──────────────────────────────────────────────────────────┐
│ Exam Center                                              │
├──────────────────┬───────────────────────────────────────┤
│ Quick Quiz       │ 10 preguntas                          │
│ Practice Test    │ 25 preguntas                          │
│ Module Exam      │ por módulo                            │
│ Final Exam       │ simulación completa                   │
│ Custom Exam      │ configuración libre                   │
└──────────────────┴───────────────────────────────────────┘

## 15. Custom Exam Builder

Campos:
- contenido
- número preguntas
- dificultad
- tipos
- tiempo
- mostrar feedback inmediato sí/no
- permitir tutor no en Exam Mode

## 16. Exam Mode

┌──────────────────────────────────────────────────────────┐
│ Practice Exam           18 / 50           42:19          │
├──────────────────────────────────────────────────────────┤
│ Pregunta...                                               │
│                                                          │
│ ○ A                                                      │
│ ○ B                                                      │
│ ○ C                                                      │
│ ○ D                                                      │
│                                                          │
│ [Marcar]                          [Anterior] [Siguiente]  │
└──────────────────────────────────────────────────────────┘

Sin tutor.
Sin fuentes visibles hasta terminar.

## 17. Resultado de examen

Mostrar:
- score
- tiempo
- comparación histórica
- fortalezas
- debilidades
- preguntas falladas
- confianza estimada
- botón "Crear sesión de recuperación"

## 18. Flashcards

Tres vistas:
- Review
- Decks
- Create

Review:

┌──────────────────────────────────────────────┐
│ What is a Change Order?                      │
│                                              │
│              [Mostrar respuesta]             │
└──────────────────────────────────────────────┘

Después:
[Otra vez] [Difícil] [Bien] [Fácil]

## 19. Mapa de Conocimiento

Dos modos:
- árbol
- mapa visual

Árbol:

Michigan Builder
├─ Business 82%
│  ├─ Contracts 84%
│  └─ Licensing 92%
├─ Concrete 91%
├─ Framing 73%
└─ Electrical 52%

Click en nodo:
- definición
- dominio
- fuentes
- errores
- estudiar ahora

## 20. Progreso

Secciones:
- resumen
- dominio por tema
- tiempo
- precisión
- ritmo
- racha
- historial de exámenes
- conceptos en riesgo

Evitar gráficas decorativas sin utilidad.

## 21. Plan

Calendario semanal/mensual.

Cada sesión muestra:
- tema
- duración
- estado
- prioridad

Botones:
- reprogramar
- cambiar meta
- recalcular plan

## 22. Configuración

Secciones:
- General
- Appearance
- AI Provider
- Privacy
- Storage
- Backups
- Learning Preferences
- Shortcuts
- Advanced

## 23. Command Palette

Cmd + K

Acciones:
- buscar documento
- ir a curso
- preguntar
- crear quiz
- iniciar estudio
- abrir configuración
- cambiar tutor

## 24. Estados globales

### Loading
Skeletons; no spinners excesivos.

### Empty
Explicar siguiente acción.

### Error
Mensaje humano + acción.

### Offline
Banner discreto.

### AI unavailable
No bloquear funciones locales.

## 25. Diseño responsive futuro

No optimizar ahora para móvil, pero:
- evitar medidas rígidas
- componentes reutilizables
- layout tokens
- breakpoints lógicos

## 26. Reglas UX no negociables

1. Nunca esconder la fuente de una respuesta.
2. Nunca confundir IA externa con biblioteca local.
3. Nunca requerir más pasos de los necesarios.
4. Siempre ofrecer una acción siguiente clara.
5. Evitar dashboards saturados.
6. Study Mode debe reducir distracciones.
7. El usuario debe poder abandonar y continuar después.
8. Toda evaluación debe producir una acción útil.
