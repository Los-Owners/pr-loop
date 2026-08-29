"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authEnabled } from "./ConvexClientProvider";
import type { Analysis, Answer, Verdict } from "@/lib/types";

export type SavePayload = {
  label: string;
  title: string;
  prUrl?: string;
  verdict: Verdict;
  analysis: Analysis;
  answers: Record<string, Answer>;
};

/**
 * Guarda la sesión al llegar al reporte. No pinta nada.
 *
 * El efecto solo dispara la mutación —no toca estado de React—, y el `ref` la deja en
 * una sola vez aunque el reporte se vuelva a renderizar. Si no hay sesión iniciada, la
 * mutación devuelve null y no se guarda: el flujo sigue funcionando sin login.
 */
function Save({ payload }: { payload: SavePayload }) {
  const save = useMutation(api.sessions.save);
  const saved = useRef(false);

  useEffect(() => {
    if (saved.current) return;
    saved.current = true;
    void save(payload).catch(() => {
      // Que no se guarde el historial no puede tumbar el reporte que el dev está leyendo.
    });
  }, [save, payload]);

  return null;
}

export default function SaveSession({ payload }: { payload: SavePayload }) {
  if (!authEnabled) return null;
  return <Save payload={payload} />;
}
