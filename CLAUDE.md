# pr-loop — Ownership Gate

Examen de comprensión que corre **antes de mergear** un PR escrito por IA.

## La tesis

La suite de tests que escribió la IA es un mapa de lo que la IA creyó que importaba. La cabeza de
quien aprueba tiene otro mapa. La evaluación es superponerlos y mirar dónde no coinciden.

No evaluamos si el dev entiende el diff. Evaluamos si **el modelo mental con el que aprobó ese
código coincide con lo que el código hace**.

Un test verde no prueba que alguien entendió el código. Ni la IA, ni el dev.

## Reglas que no se rompen

1. **El código es la única fuente de verdad.** No pedimos specs ni documentos. Los specs se
   reconstruyen desde el código por ingeniería inversa. Como consecuencia, nunca afirmamos que la
   IA alucinó: solo detectamos divergencia entre el dev y el código, y **ofrecemos hipótesis**.
2. **No corregimos el código ni damos el fix.** Si damos la respuesta, matamos el aprendizaje y nos
   salimos del track educativo.
3. **Durante la sesión no se muestra código.** Ni diff, ni operadores, ni sintaxis. Se muestran
   diagramas de secuencia y aserciones traducidas a lenguaje de negocio. El código aparece solo en
   el reporte, detrás de «ver evidencia».
4. **Cada pregunta debe poder citar líneas concretas.** Si un camino o una prueba no puede señalar
   dónde vive en el código, se descarta. Una pregunta genérica no mide nada.
5. **La unidad de la pregunta es un camino del flujo**, no una línea de código. `>` contra `>=` es
   sintaxis; «dónde está la frontera entre calificar y no calificar» es producto.

## Vocabulario

Los cuatro colores son corrección × confianza y significan siempre lo mismo:

| Color | Combinación | Significado |
|---|---|---|
| Verde `#1F7A4C` | Correcto + confirmado | Ownership real |
| Azul `#2563B0` | Correcto + sin confirmar | Acertó pero no lo posee |
| Rojo `#C0392F` | Incorrecto + confirmado | Punto ciego — el peligro |
| Amarillo `#A87515` | Incorrecto + sin confirmar, o «No sé» | Sabe que no sabe |
| Gris `#A6A6B0` | Ninguna pregunta lo tocó | No evaluado |

El acento de la UI (`#2F5FD0`) nunca es uno de estos cinco.

## Specs

- `docs/spec/00-producto.md` — objetivos, casos de uso, fuera de alcance
- `docs/spec/01-sesion.md` — las cinco preguntas, confianza, qué muestra cada pantalla
- `docs/spec/02-reporte.md` — las tres secciones del reporte
- `docs/spec/03-analizador.md` — el contrato JSON entre el analizador y todo lo demás
- `fixtures/pr-418/` — el PR de ejemplo y su análisis esperado

## Contexto

Hackathon The Next Craft, track 3 «Learning by Shipping». 12 horas, demo en vivo de 3 minutos,
code freeze 20:00. Regla del evento: tiene que haberlo usado alguien real antes de la campana.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
