"use client";

export type DiagramActor = { id: string; name: string; isNew?: boolean; dim?: boolean };
export type DiagramMessage = { from: string; to: string; label: string; isReturn?: boolean; color?: string; evidence?: string };

const TOP = 34;
const ROW = 46;
const LEFT = 66;

/**
 * Diagrama de secuencia en HTML/CSS. Nada de SVG: el texto tiene que ser texto.
 */
export default function SequenceDiagram({
  actors,
  messages,
  width = 560,
  empty,
}: {
  actors: DiagramActor[];
  messages: DiagramMessage[];
  width?: number;
  empty?: string;
}) {
  const step = actors.length > 1 ? Math.min(140, (width - LEFT * 2) / (actors.length - 1)) : 0;
  const x: Record<string, number> = {};
  actors.forEach((a, i) => (x[a.id] = LEFT + i * step));

  const rows = Math.max(messages.length, 4);
  const lineH = 40 + rows * ROW;

  return (
    <div className="diagram" style={{ width: "100%", height: lineH + TOP }}>
      {actors.map((a) => (
        <div key={`life-${a.id}`} className="life" style={{ left: x[a.id], top: TOP, height: lineH }} />
      ))}

      {actors.map((a) => {
        const w = a.name.length * 6.4 + 22;
        return (
          <div
            key={`actor-${a.id}`}
            className="actor"
            data-new={a.isNew ? "true" : undefined}
            data-dim={a.dim ? "true" : undefined}
            style={{ left: x[a.id] - w / 2, width: w }}
          >
            {a.name}
          </div>
        );
      })}

      {messages.map((m, i) => {
        const a = x[m.from];
        const b = x[m.to];
        if (a === undefined || b === undefined) return null;
        const left = Math.min(a, b);
        const w = Math.abs(b - a);
        const toRight = b > a;
        const color = m.color ?? "#8a8a94";
        const muted = color === "#a6a6b0";
        return (
          <div
            key={`msg-${i}`}
            className="msg"
            style={{
              left,
              top: 62 + i * ROW,
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
            <span className="msgLabel" style={{ color }}>
              <span>{m.label}</span>
            </span>
          </div>
        );
      })}

      {empty ? <p className="emptyDiagram">{empty}</p> : null}
    </div>
  );
}
