# Analizador

Es el foso. Una sola llamada a Claude que convierte un diff en specs estructurados. Todo lo demás
—preguntas, diagrama, reporte— se renderiza desde este JSON.

## Llamada

- Modelo `claude-opus-5`, thinking adaptativo, `output_config.effort: "high"`.
- **Salida estructurada** con `output_config.format` y esquema. Nunca parsear prosa.
- Streaming si el diff es grande, para no chocar con el timeout.
- No usar `budget_tokens`: no existe en los modelos actuales y devuelve error.

Costo aproximado: 15k tokens de entrada y 3k de salida ≈ **$0.15 por análisis**. No hay nada que
ahorrar bajando de modelo, y este es el peor lugar para perder calidad.

## Contrato

```jsonc
{
  "feature": { "title": "...", "summary": "..." },
  "participants": [ { "id": "price", "name": "Servicio de Precios", "evidence": "archivo:línea" } ],
  "paths": [
    {
      "id": "feliz",
      "name": "Camino feliz",
      "kind": "happy" | "alternative" | "missing",
      "messages": [
        { "from": "api", "to": "price", "label": "calcular total",
          "isReturn": false, "evidence": "pricing.service.ts:44" }
      ]
    }
  ],
  "decisions": [
    { "id": "umbral", "question": "¿Desde cuántos items califica?",
      "actual": "11", "evidence": "pricing.service.ts:44" }
  ],
  "tests": [
    { "id": "t3", "file": "pricing.service.spec.ts:22",
      "asserts": "Comprueba que la respuesta del checkout no es nula.",
      "covers": [], "substantive": false }
  ],
  "snippets": {
    "pricing.service.ts:44": "if (items.length > 10) {\n  total = total * 0.9\n}"
  }
}
```

## Reglas

- **Todo elemento cita líneas.** Si un camino, una decisión o una prueba no puede señalar dónde vive
  en el código, se descarta. Sin esto el producto se cae.
- `asserts` describe **lo que la aserción comprueba**, parafraseado mecánicamente. Nunca el nombre
  del test.
- `substantive: false` cuando la prueba pasa aunque se rompa el comportamiento que dice cubrir. No
  intentar análisis estático: clasificación con evidencia citada, y aceptar falsos negativos.
- `snippets` mapea cada `evidence` a su fragmento. Es lo único que alimenta «ver evidencia» en el
  reporte, y el único lugar del producto donde el dev ve código.
- Los caminos con `kind: "missing"` son los que el código no maneja (sin timeout, sin fallback). Son
  los más valiosos y los que menos gente ve.

## Generación de preguntas

**No la hace un modelo.** Las cinco preguntas salen de este JSON con código normal: baraja
distractores y siembra el participante inexistente. Instantáneo, gratis y reproducible — y en un
demo en vivo, reproducible vale más que inteligente.

## Generación del diagrama

**Tampoco la hace un modelo.** El Mermaid sale de este JSON con código normal (`lib/mermaid.ts`),
igual que las preguntas: un `sequenceDiagram` por camino, más la versión pintada por corrección ×
confianza, donde los mensajes contiguos del mismo color se agrupan en un bloque `rect`.

Las reglas de sintaxis son las de la skill `architecture-map`, y su propio `validate.mjs` las
verifica contra el parser oficial en `npm run check:mermaid`. Una excepción encontrada por ese
validador: para el `#` va la entidad numérica `#35;` y no la nominal `&num;` que documenta la
skill — `&num;` parsea dentro de un mensaje pero rompe dentro de un alias de `participant`.

## Salida de la sesión

`lib/session.ts` junta las tres cosas que se entregan al final —las preguntas, las respuestas con
su veredicto, y el Mermaid— en un solo objeto. Es lo que descarga el reporte y lo que devuelve
`POST /api/session`. Función pura: la misma sesión da siempre la misma salida.
