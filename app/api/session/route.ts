import { NextResponse } from "next/server";
import { buildQuestions } from "@/lib/questions";
import { buildSessionOutput, parseAnswers, type OutputPr } from "@/lib/session";
import type { Analysis } from "@/lib/types";

/**
 * Cierra la sesión: análisis + respuestas -> las preguntas, las respuestas y el Mermaid.
 *
 * No llama al modelo. Todo lo que devuelve se deriva del JSON del analizador con código
 * normal, así que es instantáneo y reproducible — la misma sesión da siempre la misma
 * salida. Ver docs/spec/03-analizador.md
 */
export async function POST(request: Request) {
  let body: { analysis?: Analysis; answers?: unknown; pr?: OutputPr | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const analysis = body.analysis;
  if (!analysis || !Array.isArray(analysis.paths) || !Array.isArray(analysis.participants)) {
    return NextResponse.json({ error: "Falta el análisis." }, { status: 400 });
  }
  // Un análisis sin caminos ni participantes no da una sesión: es un 400 del que lo manda,
  // no un fallo nuestro.
  if (analysis.paths.length === 0 || analysis.participants.length === 0) {
    return NextResponse.json(
      { error: "El análisis no alcanza para armar una sesión: no tiene caminos ni participantes." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(
      buildSessionOutput({
        analysis,
        questions: buildQuestions(analysis),
        answers: parseAnswers(body.answers),
        pr: body.pr ?? null,
      }),
    );
  } catch (error) {
    console.error("[session]", error);
    return NextResponse.json({ error: "No se pudo armar la salida." }, { status: 500 });
  }
}
