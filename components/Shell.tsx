"use client";

import { useSyncExternalStore } from "react";
import AccountRow from "./AccountRow";
import History from "./History";
import type { Id } from "@/convex/_generated/dataModel";

const STORAGE_KEY = "pr-loop:rail-collapsed";

/**
 * La preferencia vive en localStorage, que es un store externo: leerlo en un efecto y
 * llamar a setState provoca un render en cascada y React 19 lo rechaza. `useSyncExternalStore`
 * es la forma prevista — además resuelve la hidratación, porque el servidor siempre
 * responde «abierto».
 */
let listeners: (() => void)[] = [];

function subscribe(onChange: () => void) {
  listeners.push(onChange);
  return () => {
    listeners = listeners.filter((l) => l !== onChange);
  };
}

function isCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Modo incógnito o cookies bloqueadas: abierto, que es el default sano.
    return false;
  }
}

/** En el servidor no hay preferencia que leer: siempre abierto. */
function isCollapsedOnServer() {
  return false;
}

function setCollapsed(value: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // No sobrevive a la recarga, pero el panel sí se mueve.
  }
  for (const l of listeners) l();
}

/** El icono de panel lateral, el mismo abierto o cerrado: solo cambia qué hace. */
function PanelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <path d="M9.5 3v18" />
    </svg>
  );
}

export default function Shell({
  crumbRepo,
  crumbTitle,
  onNew,
  activeSessionId,
  onOpenSession,
  children,
}: {
  crumbRepo: string;
  crumbTitle: string;
  onNew: () => void;
  activeSessionId: Id<"sessions"> | null;
  onOpenSession: (id: Id<"sessions">) => void;
  children: React.ReactNode;
}) {
  const collapsed = useSyncExternalStore(subscribe, isCollapsed, isCollapsedOnServer);
  const toggle = () => setCollapsed(!collapsed);

  return (
    <div className="shell">
      <aside className="rail" data-collapsed={collapsed ? "true" : undefined}>
        {/* `visibility` en el CSS saca esto del orden de tabulación al plegarse:
            si no, se pueden enfocar botones que nadie ve. */}
        <div className="railInner">
          <div className="brand">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 5v14" /><path d="M20 5v14" /><path d="M9 9l3 3-3 3" /><path d="M14 12h3.5" />
            </svg>
            <span style={{ flexGrow: 1 }}>Ownership Gate</span>
            <button
              type="button"
              className="railToggle"
              onClick={toggle}
              aria-expanded={!collapsed}
              aria-label="Contraer el panel"
              title="Contraer el panel"
            >
              <PanelIcon />
            </button>
          </div>

          <button className="newBtn" onClick={onNew} type="button">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14" /><path d="M5 12h14" />
            </svg>
            Analizar un PR
          </button>

          <History activeId={activeSessionId} onOpen={onOpenSession} />

          <AccountRow />
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {collapsed ? (
              <button
                type="button"
                className="railToggle"
                onClick={toggle}
                aria-expanded={false}
                aria-label="Mostrar el panel"
                title="Mostrar el panel"
              >
                <PanelIcon />
              </button>
            ) : null}
            <span className="mono" style={{ fontSize: 12.5 }}>{crumbRepo}</span>
            <span className="crumbTitle">{crumbTitle}</span>
          </div>
          <span className="chip">Producto</span>
        </div>
        {children}
      </main>
    </div>
  );
}
