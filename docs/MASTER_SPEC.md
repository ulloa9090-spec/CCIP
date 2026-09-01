# STUDYOS — MASTER_SPEC.md
## Documento Maestro de Producto
### Versión 1.1 — Agosto 2026

## 1. Visión

StudyOS es una aplicación local-first para macOS que transforma documentos proporcionados por el usuario en experiencias de aprendizaje personalizadas, interactivas y progresivas.

No es un lector de PDFs ni un chatbot genérico. Debe funcionar como una combinación de:

- biblioteca inteligente
- profesor
- tutor
- asesor
- examinador
- entrenador de estudio
- planificador
- generador de cursos
- sistema de seguimiento de dominio
- sistema personal de conocimiento

Principio central:

> Convierte cualquier conocimiento que poseas en un curso personalizado, interactivo y progresivo.

## 2. Principios fundamentales

1. Local-first.
2. El usuario controla sus fuentes.
3. La IA debe distinguir claramente entre contenido del usuario y conocimiento externo.
4. Los documentos permanecen almacenados localmente.
5. Las APIs externas reciben solamente el contexto necesario.
6. La aplicación debe seguir funcionando parcialmente sin conexión.
7. El diseño debe permitir migración futura a nube, web, iPad, iPhone y Windows.
8. La primera versión debe privilegiar estabilidad sobre cantidad de funciones.

## 3. Objetivo funcional

El usuario debe poder:

1. Subir uno o varios PDFs.
2. Permitir que StudyOS analice los documentos.
3. Crear una biblioteca de conocimiento.
4. Definir una meta de aprendizaje.
5. Elegir cuánto tiempo quiere tardar.
6. Elegir cuánto tiempo puede estudiar al día.
7. Generar un curso.
8. Estudiar por lecciones.
9. Resolver ejercicios.
10. Usar flashcards.
11. Completar quizzes y exámenes.
12. Preguntar a un tutor.
13. Recibir respuestas basadas en fuentes.
14. Ver progreso.
15. Detectar fortalezas y debilidades.
16. Reajustar el plan de estudio.
17. Generar material de repaso.
18. Generar presentaciones o esquemas.
19. Crear tutores especializados.
20. Continuar exactamente donde quedó tras cerrar la app.

## 4. Tipos de conocimiento

Versiones iniciales:
- PDF
- texto pegado
- notas internas

Futuro:
- DOCX
- EPUB
- web pages
- audio transcrito
- video transcrito
- imágenes/documentos escaneados
- conectores externos

## 5. Modos de IA

### Profesor
Enseña progresivamente.

### Tutor
Trabaja sobre dificultades específicas.

### Asesor
Responde libremente usando contexto del usuario.

### Examinador
Evalúa sin enseñar durante la prueba.

### Entrenador
Optimiza constancia, ritmo y prioridades.

## 6. Control de ritmo

El usuario define:
- fecha objetivo o duración
- tiempo diario disponible
- días de estudio
- intensidad
- nivel

Duraciones rápidas:
- 1 día
- 3 días
- 1 semana
- 2 semanas
- 1 mes
- 2 meses
- 3 meses
- 6 meses
- personalizado

Tiempo diario:
- 15 min
- 30 min
- 45 min
- 60 min
- 90 min
- 120 min
- personalizado

## 7. Replanificación adaptativa

Si el usuario:
- pierde días
- adelanta contenido
- domina conceptos rápidamente
- falla repetidamente
- cambia fecha objetivo

StudyOS debe recalcular:
- sesiones
- prioridades
- repasos
- carga diaria
- exámenes

## 8. Motor de dominio

Cada concepto debe mantener una puntuación aproximada de dominio basada en:
- precisión
- dificultad
- recencia
- repetición
- consistencia
- resultados en exámenes

Estados sugeridos:
- Nuevo
- En aprendizaje
- Familiar
- Competente
- Dominado

## 9. Flujo central del MVP

Launch App
→ Configurar API
→ Importar PDF
→ Procesar PDF
→ Crear índice local
→ Hacer pregunta
→ Recuperar contexto
→ Generar respuesta fundamentada
→ Mostrar citas
→ Crear curso
→ Estudiar lección
→ Completar quiz
→ Guardar progreso
→ Cerrar
→ Abrir nuevamente
→ Continuar

## 10. Navegación principal

- Inicio
- Biblioteca
- Mis Cursos
- Estudiar
- Tutor
- Exámenes
- Flashcards
- Mapa de Conocimiento
- Progreso
- Plan
- Configuración

## 11. Funciones núcleo

### Biblioteca
- importar
- organizar
- buscar
- etiquetar
- abrir
- procesar
- reindexar
- eliminar

### Cursos
- crear desde documentos
- crear desde colección
- definir objetivo
- definir duración
- definir intensidad
- generar módulos/lecciones

### Estudio
- sesiones
- explicaciones
- ejemplos
- ejercicios
- preguntas rápidas
- notas

### Evaluación
- quizzes
- module exams
- final exams
- custom exams
- mistake review

### Tutor
- conversación
- recuperación de fuentes
- citas
- estilos de explicación
- creación de acciones desde chat

### Flashcards
- creación manual
- creación automática
- repetición espaciada

### Progreso
- tiempo
- dominio
- rachas
- resultados
- debilidades

## 12. Closed Library Mode

Modo predeterminado.

La IA solo debe presentar como conocimiento fundamentado aquello recuperado de la biblioteca del usuario.

Si no hay evidencia suficiente:

> No encontré suficiente información en tu biblioteca para responder con confianza.

## 13. External Research Mode

Desactivado por defecto.

Si se activa:
- diferenciar fuentes externas
- nunca mezclarlas silenciosamente
- mostrar etiquetas claras
- registrar de dónde provino la información

## 14. Arquitectura técnica

Primera versión:
- Electron
- React
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- SQLite
- PDF.js
- OpenAI API
- arquitectura AIProvider
- almacenamiento seguro con macOS Keychain

## 15. Reglas de seguridad

- nunca hardcodear API keys
- nunca subir documentos completos sin necesidad
- nunca enviar datos en segundo plano sin consentimiento
- guardar datos localmente
- registrar errores sin guardar contenido sensible innecesario

## 16. Offline

Debe funcionar sin internet para:
- biblioteca
- abrir PDFs
- notas
- flashcards existentes
- quizzes ya generados
- progreso
- plan
- contenido previamente generado

Las funciones que requieran IA deben mostrar un estado claro.

## 17. Futuro

- modelos locales
- múltiples proveedores
- nube opcional
- sincronización
- mobile
- web
- cuentas
- suscripciones
- equipos

## 18. Criterios de éxito del MVP

El MVP es exitoso si:
- instala en macOS
- abre como app normal
- importa PDFs
- persiste datos
- pregunta sobre documentos
- cita fuentes
- crea cursos
- permite estudiar
- genera quizzes
- guarda progreso
- reabre sin perder estado
- protege API key

## 19. Filosofía de producto

Documento
→ conocimiento
→ currículo
→ práctica
→ evaluación
→ retroalimentación
→ dominio

Toda nueva función debe mejorar al menos una de estas áreas:
- aprender
- comprender
- recordar
- practicar
- evaluar
- organizar
