import { NextResponse } from "next/server";
import { analyze, AnalyzerError } from "@/lib/analyzer";

/** El análisis tarda minutos: sin esto la función se corta antes de terminar. */
export const maxDuration = 300;

export async function POST(request: Request) {
  let body: { diff?: string; files?: Record<string, string>; title?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  if (typeof body.diff !== "string" || !body.diff.trim()) {
    return NextResponse.json({ error: "Falta el diff." }, { status: 400 });
  }

  try {
    const result = await analyze({ diff: body.diff, files: body.files, title: body.title });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AnalyzerError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error("[analyze]", error);
    return NextResponse.json({ error: "El analizador falló." }, { status: 500 });
  }
}
