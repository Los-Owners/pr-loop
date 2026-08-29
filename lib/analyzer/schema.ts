/**
 * Esquema de salida estructurada del analizador. Ver docs/spec/03-analizador.md
 *
 * Es el mismo contrato que `Analysis` en lib/types.ts con una diferencia: `snippets`
 * viaja como arreglo y no como objeto. La salida estructurada exige
 * `additionalProperties: false`, y un mapa de claves dinámicas no puede declararlo.
 * `normalize()` en validate.ts lo convierte de vuelta al Record que usa la UI.
 */

const EVIDENCE = {
  type: "string",
  description:
    "Dónde vive esto en el código, como 'ruta/al/archivo.ts:linea'. Una sola línea, " +
    "la más representativa. Obligatorio: lo que no puede citarse se descarta.",
} as const;

export const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["feature", "participants", "paths", "decisions", "tests", "snippets"],
  properties: {
    feature: {
      type: "object",
      additionalProperties: false,
      required: ["title", "summary"],
      properties: {
        title: {
          type: "string",
          description: "El cambio en lenguaje de producto. Sin nombres de función ni de archivo.",
        },
        summary: {
          type: "string",
          description: "Una o dos frases sobre qué hace el flujo, en lenguaje de negocio.",
        },
      },
    },

    participants: {
      type: "array",
      minItems: 2,
      description:
        "Los actores del flujo. Usa 'app' para el cliente y 'api' para el punto de entrada; " +
        "el resto son servicios colaboradores. Incluye los que el código llama aunque nadie los haya pedido.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "evidence"],
        properties: {
          id: { type: "string", description: "Identificador corto en minúsculas, sin espacios." },
          name: { type: "string", description: "Nombre de negocio, p. ej. «Servicio de Precios»." },
          evidence: EVIDENCE,
        },
      },
    },

    paths: {
      type: "array",
      minItems: 1,
      description:
        "Los caminos del flujo, cada uno como una secuencia de mensajes. La unidad es un camino " +
        "del flujo, no una línea de código.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "kind", "messages"],
        properties: {
          id: { type: "string" },
          name: { type: "string", description: "Nombre en lenguaje de negocio, p. ej. «Justo en el umbral»." },
          kind: {
            type: "string",
            enum: ["happy", "alternative", "missing"],
            description:
              "'happy' el camino principal; 'alternative' una variante que el código sí maneja; " +
              "'missing' un camino que el código NO maneja (sin timeout, sin reintento, sin fallback). " +
              "Los 'missing' son los más valiosos: búscalos activamente.",
          },
          messages: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["from", "to", "label", "isReturn", "evidence"],
              properties: {
                from: { type: "string", description: "id de un participante declarado arriba." },
                to: { type: "string", description: "id de un participante declarado arriba." },
                label: {
                  type: "string",
                  description:
                    "Qué se pide o qué se devuelve, en lenguaje de negocio. Nunca sintaxis, " +
                    "nunca nombres de función.",
                },
                isReturn: { type: "boolean", description: "true si es una respuesta de vuelta." },
                evidence: EVIDENCE,
              },
            },
          },
        },
      },
    },

    decisions: {
      type: "array",
      description:
        "Fronteras del comportamiento: umbrales, condiciones, cortes. Una decisión es algo sobre " +
        "lo que dos personas razonables podrían discrepar al leer el producto, no una línea de sintaxis.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "question", "actual", "alternatives", "evidence"],
        properties: {
          id: { type: "string" },
          question: {
            type: "string",
            description: "La pregunta en lenguaje de producto, p. ej. «¿desde cuántos items califica?».",
          },
          actual: { type: "string", description: "Lo que el código hace de verdad. Corto." },
          alternatives: {
            type: "array",
            minItems: 2,
            description:
              "Respuestas plausibles incluyendo la real. Los distractores deben ser creíbles " +
              "para alguien que leyó el PR por encima.",
            items: { type: "string" },
          },
          evidence: EVIDENCE,
        },
      },
    },

    tests: {
      type: "array",
      description: "Las pruebas que trae el PR, una por aserción significativa.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "file", "asserts", "covers", "substantive"],
        properties: {
          id: { type: "string" },
          file: EVIDENCE,
          asserts: {
            type: "string",
            description:
              "Qué comprueba la aserción, parafraseado mecánicamente y en lenguaje de negocio. " +
              "NUNCA el nombre del test: si el test se llama 'aplica descuento' pero solo revisa " +
              "que la respuesta no sea nula, escribe lo segundo.",
          },
          covers: {
            type: "array",
            description: "ids de los caminos que la prueba cubre de verdad. Vacío si no cubre ninguno.",
            items: { type: "string" },
          },
          substantive: {
            type: "boolean",
            description:
              "false cuando la prueba pasaría igual aunque se rompiera el comportamiento que dice " +
              "cubrir (p. ej. solo comprueba que la respuesta no es nula). No hagas análisis " +
              "estático: clasifica con la evidencia citada y acepta falsos negativos.",
          },
        },
      },
    },

    snippets: {
      type: "array",
      description:
        "Un fragmento por cada 'evidence' citado arriba, sin excepción. Es lo único que alimenta " +
        "«ver evidencia» y el único lugar del producto donde el dev ve código.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["evidence", "code"],
        properties: {
          evidence: { type: "string", description: "La misma cadena 'archivo:linea' citada arriba." },
          code: {
            type: "string",
            description: "El fragmento real, copiado literal del archivo. Dos a cinco líneas.",
          },
        },
      },
    },
  },
} as const;
