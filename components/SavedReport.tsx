"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Report from "./Report";
import { buildQuestions } from "@/lib/questions";
import type { Analysis, Answer } from "@/lib/types";

/**
 * El reporte de una sesión guardada.
 *
 * Solo se guardaron el análisis y las respuestas; las preguntas y todo el reporte se
 * vuelven a derivar acá, igual que en vivo. Por eso una mejora en el reporte alcanza
 * también a las sesiones viejas.
 *
 * Lee y pinta, sin sincronizar estado: nada de efectos ni de setState.
 */
export default function SavedReport({
  id,
  onRestart,
}: {
  id: Id<"sessions">;
  onRestart: () => void;
}) {
  const session = useQuery(api.sessions.get, { id });

  if (session === undefined) {
    return (
      <div className="center">
        <p style={{ fontSize: 14, color: "var(--faint)" }}>Abriendo el reporte…</p>
      </div>
    );
  }

  if (session === null) {
    return (
      <div className="center">
        <p style={{ fontSize: 14, color: "var(--soft)" }}>Esta sesión ya no está disponible.</p>
        <button type="button" className="chipBtn" style={{ marginTop: 14 }} onClick={onRestart}>
          Analizar un PR
        </button>
      </div>
    );
  }

  const analysis = session.analysis as Analysis;
  const answers = (session.answers ?? {}) as Record<string, Answer>;

  return (
    <Report
      analysis={analysis}
      questions={buildQuestions(analysis)}
      answers={answers}
      pr={null}
      onRestart={onRestart}
    />
  );
}
