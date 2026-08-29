"use client";

import { useEffect, useRef, useState } from "react";

export type DiagramActor = { id: string; name: string; isNew?: boolean; dim?: boolean };
export type DiagramMessage = {
  from: string;
  to: string;
  label: string;
  isReturn?: boolean;
  color?: string;
  evidence?: string;
};

/** Alto de la banda de actores: dos líneas de nombre más el aire de la píldora. */
const HEAD = 46;
/** Alto por mensaje. Da lugar a una etiqueta de dos líneas sin tocar la flecha de abajo. */
const ROW = 52;
/** Lo que baja la primera flecha desde la banda de actores. */
const FIRST = 30;
const MIN_COL = 96;
const MIN_LABEL = 150;

/**
 * Diagrama de secuencia en HTML/CSS. Nada de SVG: el texto tiene que ser texto.
 *
 * El ancho se mide del contenedor real, no se recibe como prop: los nombres que escribe el
 * analizador son de negocio y largos («Configuración de canales del sitio»), así que con un
 * ancho supuesto las píldoras se pisan y el nombre queda cortado por la de al lado.
 *
 * Cada actor ocupa una columna completa y su píldora nunca la excede. Lo que no entra se
 * corta con puntos suspensivos y queda entero en el `title`.
 */
export default function SequenceDiagram({
  actors,
  messages,
  empty,
}: {
  actors: DiagramActor[];
  messages: DiagramMessage[];
  empty?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    setWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  // Una columna por actor, centrado en ella: así la píldora entra siempre en su carril.
  // Si no entran todas, el diagrama se hace más ancho que el contenedor y este hace scroll.
  const col = actors.length ? Math.max(MIN_COL, width / actors.length) : 0;
  const inner = Math.max(width, col * actors.length);
  const x: Record<string, number> = {};
  actors.forEach((a, i) => (x[a.id] = col * (i + 0.5)));

  const rows = Math.max(messages.length, 3);
  const lineH = FIRST + rows * ROW;

  return (
    <div className="diagramScroll" ref={box}>
      <div className="diagram" style={{ width: inner, height: lineH + HEAD }}>
        {actors.map((a) => (
          <div key={`life-${a.id}`} className="life" style={{ left: x[a.id], top: HEAD, height: lineH }} />
        ))}

        {actors.map((a) => (
          <div
            key={`actor-${a.id}`}
            className="actor"
            title={a.name}
            data-new={a.isNew ? "true" : undefined}
            data-dim={a.dim ? "true" : undefined}
            style={{ left: x[a.id] - (col - 12) / 2, width: col - 12 }}
          >
            <span>{a.name}</span>
          </div>
        ))}

        {messages.map((m, i) => {
          const a = x[m.from];
          const b = x[m.to];
          if (a === undefined || b === undefined) return null;
          const color = m.color ?? "#8a8a94";
          const muted = color === "#a6a6b0";
          const top = HEAD + FIRST + i * ROW;

          // Un mensaje de un participante a sí mismo no es una flecha entre dos líneas:
          // sin esto quedaría de ancho cero y la etiqueta desaparecería.
          if (m.from === m.to) {
            return (
              <div key={`msg-${i}`} className="selfMsg" style={{ left: a, top, borderColor: color }}>
                <span className="msgLabel selfLabel" style={{ color, width: MIN_LABEL }}>
                  <span title={m.label}>{m.label}</span>
                </span>
              </div>
            );
          }

          const left = Math.min(a, b);
          const w = Math.abs(b - a);
          const toRight = b > a;
          return (
            <div
              key={`msg-${i}`}
              className="msg"
              style={{
                left,
                top,
                width: w,
                borderTop: `${muted ? 1.2 : 1.8}px ${m.isReturn ? "dashed" : "solid"} ${color}`,
              }}
            >
              <span
                className="tip"
                style={
                  toRight
                    ? { right: -1, borderLeft: `6px solid ${color}` }
                    : { left: -1, borderRight: `6px solid ${color}` }
                }
              />
              {/* La etiqueta puede ser más ancha que su flecha: una flecha corta con texto
                  largo, si no, lo desborda y se monta sobre la línea. */}
              <span className="msgLabel" style={{ color, width: Math.max(w, MIN_LABEL) }}>
                <span title={m.label}>{m.label}</span>
              </span>
            </div>
          );
        })}

        {empty ? <p className="emptyDiagram">{empty}</p> : null}
      </div>
    </div>
  );
}
