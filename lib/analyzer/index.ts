import Anthropic from "@anthropic-ai/sdk";
import type { Analysis } from "../types";
import { ANALYSIS_SCHEMA } from "./schema";
import { buildSystem, buildUserMessage } from "./prompt";
import { normalize, checkUsable, type Dropped, type RawAnalysis } from "./validate";

/**
 * Lo que el analizador va sabiendo mientras genera. Es progreso real, no un temporizador:
 * `sections` son las secciones del contrato que el modelo ya emitió, leídas del propio JSON
 * a medida que llega. Ver docs/spec/03-analizador.md
 */
export type AnalyzeProgress = { chars: number; sections: string[] };

/** Las claves de nivel superior del contrato, en el orden en que el modelo las escribe. */
const SECTIONS = ["feature", "participants", "paths", "decisions", "tests", "snippets"];

export type AnalyzeInput = {
  diff: string;
  /** Contenido completo de los archivos que toca el PR, por ruta. Numerados en el prompt. */
  files?: Record<string, string>;
  title?: string;
};

export type AnalyzeResult = {
  analysis: Analysis;
  /** Elementos que no pudieron citar líneas y se descartaron. Ver docs/spec/03-analizador.md */
  dropped: Dropped[];
  /** Faltantes que dejan el análisis corto para una sesión. Vacío = utilizable. */
  problems: string[];
  usage: { input: number; output: number; costUsd: number };
};

/** Precio de claude-opus-5 por millón de tokens. */
const PRICE = { input: 5, output: 25 };

export class AnalyzerError extends Error {}

/**
 * El foso: una sola llamada que convierte un diff en specs estructurados. Todo lo demás
 * —preguntas, diagrama, reporte— se renderiza desde este JSON.
 *
 * Va en streaming porque un diff grande con sus archivos empuja la respuesta hacia los
 * minutos, y una petición sin streaming se cae contra el timeout antes de terminar.
 */
export async function analyze(
  input: AnalyzeInput,
  onProgress?: (progress: AnalyzeProgress) => void,
): Promise<AnalyzeResult> {
  if (!input.diff.trim()) throw new AnalyzerError("El diff está vacío.");

  // Sin argumentos: el SDK resuelve ANTHROPIC_API_KEY del entorno.
  const client = new Anthropic();

  const stream = client.messages.stream({
    model: "claude-opus-5",
    max_tokens: 64000,
    system: buildSystem(),
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: { type: "json_schema", schema: ANALYSIS_SCHEMA },
    },
    messages: [{ role: "user", content: buildUserMessage(input) }],
  });

  if (onProgress) {
    let seen = 0;
    let ticked = 0;
    stream.on("text", (_delta, snapshot) => {
      const sections = SECTIONS.filter((key) => snapshot.includes(`"${key}"`));
      // Se avisa cuando aparece una sección nueva, o cada 4k caracteres: suficiente para
      // que la barra se mueva sin inundar la conexión con un evento por token.
      if (sections.length > seen || snapshot.length - ticked > 4000) {
        seen = sections.length;
        ticked = snapshot.length;
        onProgress({ chars: snapshot.length, sections });
      }
    });
  }

  const response = await stream.finalMessage();

  if (response.stop_reason === "refusal") {
    throw new AnalyzerError(
      `El modelo declinó analizar este PR${
        response.stop_details ? ` (${response.stop_details.category})` : ""
      }.`,
    );
  }
  if (response.stop_reason === "max_tokens") {
    throw new AnalyzerError("El análisis se cortó por longitud: el PR es demasiado grande.");
  }

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  let raw: RawAnalysis;
  try {
    raw = JSON.parse(text) as RawAnalysis;
  } catch {
    throw new AnalyzerError("El modelo no devolvió el JSON del contrato.");
  }

  const { analysis, dropped } = normalize(raw, input.files ?? {});
  const { input_tokens, output_tokens } = response.usage;

  return {
    analysis,
    dropped,
    problems: checkUsable(analysis),
    usage: {
      input: input_tokens,
      output: output_tokens,
      costUsd: (input_tokens * PRICE.input + output_tokens * PRICE.output) / 1_000_000,
    },
  };
}
