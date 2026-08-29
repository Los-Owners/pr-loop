"use client";

import type { PhaseId, PhaseState } from "@/lib/phases";

/**
 * El progreso del análisis. Cada fila refleja una fase real del servidor: se enciende
 * cuando el trabajo empieza y se marca cuando terminó de verdad. Nada acá corre con un
 * temporizador — un check que miente sobre lo que pasó es justo lo que este producto
 * critica del resto.
 */
export default function Scan({ phases }: { phases: Record<PhaseId, PhaseState> }) {
  const order: PhaseId[] = ["github", "model", "derive"];

  return (
    <div className="center">
      <p style={{ fontSize: 16, fontWeight: 500, margin: "0 0 20px" }}>
        Reconstruyendo los specs desde el código
      </p>

      <div className="scanList">
        {order.map((id) => {
          const phase = phases[id];
          return (
            <div key={id} className="scanRow" data-state={phase.status}>
              <span className="scanIcon" aria-hidden>
                {phase.status === "done" ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12.5l5.5 5.5L20 7" />
                  </svg>
                ) : phase.status === "pending" ? (
                  <span className="scanDot" />
                ) : (
                  <span className="scanSpinner" />
                )}
              </span>

              <span className="scanBody">
                <span className="scanLabel">{phase.label}</span>
                {phase.detail ? <span className="scanDetail">{phase.detail}</span> : null}

                {/* Las secciones del contrato que el modelo ya escribió. Progreso real:
                    se leen del JSON según llega, no de un reloj. */}
                {phase.sections?.length ? (
                  <span className="scanChips">
                    {phase.sections.map((s) => (
                      <span key={s} className="scanChip">{s}</span>
                    ))}
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 12.5, color: "var(--faint)", marginTop: 24 }}>
        El código es la única fuente de verdad. Nada de esto se te muestra todavía.
      </p>
    </div>
  );
}
