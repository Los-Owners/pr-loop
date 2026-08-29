"use client";

import { VERDICT_META } from "@/lib/scoring";
import type { Verdict } from "@/lib/types";

type HistoryEntry = { id: string; title: string; meta: string; worst: Verdict; active?: boolean };

/** Historial de ejemplo: se reemplaza por Convex cuando haya sesiones guardadas. */
const TODAY: HistoryEntry[] = [
  { id: "418", title: "Descuento por volumen", meta: "acme/checkout #418", worst: "red", active: true },
  { id: "412", title: "Cupones por campaña", meta: "acme/checkout #412", worst: "green" },
];
const OLDER: HistoryEntry[] = [
  { id: "405", title: "Reintentos de cobro", meta: "acme/billing #405", worst: "yellow" },
  { id: "398", title: "Timeout de precios", meta: "acme/checkout #398", worst: "green" },
];

function Group({ label, items }: { label: string; items: HistoryEntry[] }) {
  return (
    <div className="railGroup">
      <p className="eyebrow">{label}</p>
      {items.map((h) => (
        <button key={h.id} className="histItem" data-active={h.active ? "true" : undefined} type="button">
          <span className="dot" style={{ background: VERDICT_META[h.worst].color }} />
          <span style={{ minWidth: 0 }}>
            <span className="histTitle">{h.title}</span>
            <span className="histMeta">{h.meta}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export default function Shell({
  crumbRepo,
  crumbTitle,
  onNew,
  children,
}: {
  crumbRepo: string;
  crumbTitle: string;
  onNew: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 5v14" /><path d="M20 5v14" /><path d="M9 9l3 3-3 3" /><path d="M14 12h3.5" />
          </svg>
          Ownership Gate
        </div>

        <button className="newBtn" onClick={onNew} type="button">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14" /><path d="M5 12h14" />
          </svg>
          Analizar un PR
        </button>

        <Group label="Hoy" items={TODAY} />
        <Group label="Semana pasada" items={OLDER} />

        <div className="account">
          <div className="accountRow">
            <span className="avatar">JG</span>
            <span style={{ minWidth: 0, flexGrow: 1 }}>
              <span style={{ display: "block", fontSize: 13 }}>Jhair Guzmán</span>
              <span style={{ display: "block", fontSize: 11, color: "var(--faint)" }}>Plan gratuito</span>
            </span>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="mono" style={{ fontSize: 12.5 }}>{crumbRepo}</span>
            <span style={{ fontSize: 13, color: "var(--faint)" }}>{crumbTitle}</span>
          </div>
          <span className="chip">Producto</span>
        </div>
        {children}
      </main>
    </div>
  );
}
