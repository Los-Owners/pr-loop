# pr-loop

Ownership Gate: un examen de comprensión que corre antes de mergear un PR escrito por IA.

Reconstruye los specs desde el código, te pregunta por el producto antes de mostrarte nada, y te
dice dónde tu modelo mental no coincide con lo que el código hace.

- **Empieza acá si acabas de clonar:** [`HANDOFF.md`](./HANDOFF.md) — setup, estado y qué falta
- Contexto y reglas: [`CLAUDE.md`](./CLAUDE.md)
- Specs: [`docs/spec/`](./docs/spec)
- PR de ejemplo: [`fixtures/pr-418/`](./fixtures/pr-418)

## Cómo corre

```
URL de un PR público  ->  lib/github.ts     endpoints anónimos de GitHub, sin token ni OAuth
                      ->  lib/analyzer      una llamada a claude-opus-5 -> el JSON del contrato
                      ->  lib/questions.ts  las cinco preguntas, con código normal
                      ->  lib/mermaid.ts    los diagramas, con código normal
                      ->  lib/session.ts    la salida: preguntas + respuestas + mermaid
```

Solo la primera flecha llama al modelo. Todo lo que sigue se deriva de ese JSON con código
normal: instantáneo, gratis y reproducible — en un demo en vivo eso vale más que ser listo.

### Las skills

Viven en [`.agents/skills/`](./.agents/skills) y participan del producto, no lo decoran:

- **`repo-to-spec`** — su doctrina de ingeniería inversa se lee de su `SKILL.md` y se inyecta
  en el prompt del analizador. Editar la skill cambia el analizador.
- **`architecture-map`** — sus reglas de sintaxis Mermaid están implementadas en
  `lib/mermaid.ts`, y su propio `validate.mjs` es el que corre `npm run check:mermaid`.

### La salida

`POST /api/session` con `{ analysis, answers }` —o el botón «Descargar salida» del reporte—
devuelve las preguntas, las respuestas con su veredicto y el Mermaid: la secuencia del
código, la misma pintada por corrección × confianza, y el diagrama que construyó el dev.

### Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | La app. Necesita `ANTHROPIC_API_KEY` para analizar un PR real. |
| `npm run check:mermaid` | Valida los diagramas contra el parser oficial, vía la skill. |
| `npm run check:fixture` | Corre el analizador contra `fixtures/pr-418` (gasta un análisis). |
