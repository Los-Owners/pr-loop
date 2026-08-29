"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { VERDICT_META } from "@/lib/scoring";
import { authEnabled } from "./ConvexClientProvider";

export type SessionSummary = {
  _id: Id<"sessions">;
  _creationTime: number;
  label: string;
  title: string;
  prUrl?: string;
  verdict: "green" | "blue" | "red" | "yellow" | "grey";
};

const DAY = 24 * 60 * 60 * 1000;

/** Hoy, la semana, y todo lo demás. Suficiente para un panel de 268px. */
function groupByAge(sessions: SessionSummary[]) {
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const groups: { label: string; items: SessionSummary[] }[] = [
    { label: "Hoy", items: [] },
    { label: "Últimos 7 días", items: [] },
    { label: "Antes", items: [] },
  ];
  for (const s of sessions) {
    const bucket =
      s._creationTime >= startOfToday ? 0 : s._creationTime >= startOfToday - 6 * DAY ? 1 : 2;
    groups[bucket].items.push(s);
  }
  return groups.filter((g) => g.items.length > 0);
}

function Rows({
  sessions,
  activeId,
  onOpen,
}: {
  sessions: SessionSummary[];
  activeId: Id<"sessions"> | null;
  onOpen: (id: Id<"sessions">) => void;
}) {
  return (
    <>
      {groupByAge(sessions).map((group) => (
        <div className="railGroup" key={group.label}>
          <p className="eyebrow">{group.label}</p>
          {group.items.map((s) => (
            <button
              key={s._id}
              type="button"
              className="histItem"
              data-active={s._id === activeId ? "true" : undefined}
              onClick={() => onOpen(s._id)}
              title={`${s.title} · ${s.label}`}
            >
              <span className="dot" style={{ background: VERDICT_META[s.verdict].color }} />
              <span style={{ minWidth: 0 }}>
                <span className="histTitle">{s.title}</span>
                <span className="histMeta">{s.label}</span>
              </span>
            </button>
          ))}
        </div>
      ))}
    </>
  );
}

function LiveHistory({
  activeId,
  onOpen,
}: {
  activeId: Id<"sessions"> | null;
  onOpen: (id: Id<"sessions">) => void;
}) {
  const sessions = useQuery(api.sessions.list, {});

  // Cargando, o sin sesión: no se pinta nada. Un esqueleto acá solo haría ruido.
  if (sessions === undefined) return null;

  if (sessions.length === 0) {
    return (
      <div className="railGroup">
        <p className="railEmpty">Tus análisis aparecen acá cuando termines el primero.</p>
      </div>
    );
  }

  return <Rows sessions={sessions} activeId={activeId} onOpen={onOpen} />;
}

export default function History(props: {
  activeId: Id<"sessions"> | null;
  onOpen: (id: Id<"sessions">) => void;
}) {
  // Sin backend no hay historial que leer, y no se inventa uno de ejemplo.
  if (!authEnabled) return null;
  return <LiveHistory {...props} />;
}
