/**
 * Renderizador de diagramas Mermaid a partir del análisis.
 *
 * No lo genera un modelo: se deriva del JSON del analizador con código normal, igual que
 * las preguntas. Instantáneo, gratis y reproducible — y en un demo en vivo reproducible
 * vale más que inteligente. Ver docs/spec/03-analizador.md
 *
 * Las reglas de sintaxis son las de la skill `architecture-map`
 * (.agents/skills/architecture-map/references/mermaid-syntax-rules.md), implementadas acá y
 * verificadas contra el parser oficial por `npm run check:mermaid`, que invoca el propio
 * validador de la skill:
 *
 * - frontmatter de tema oscuro dentro del fence, nunca el `%%{init}%%` deprecado
 * - `;` sin escapar corta la sentencia          -> entidad `#59;`
 * - `#` es carácter de comentario en secuencia  -> entidad numérica `#35;`
 * - `end` es palabra reservada                  -> se envuelve en comillas
 * - un `participant` por servicio real, en el orden en que aparecen en el flujo
 *
 * Sin imports de valores a propósito: el script de validación lo carga con el type
 * stripping de Node, que borra los `import type` y no resuelve nada más.
 */

import type { Analysis, FlowPath, Message } from "./types";

/** Un color por mensaje, para pintar la secuencia por corrección × confianza. */
export type TintFn = (message: Message, index: number) => string | undefined;

export type MermaidDiagram = {
  pathId: string;
  name: string;
  kind: FlowPath["kind"];
  diagram: string;
};

/**
 * Escapa los dos caracteres que rompen el parseo de un label. En una sola pasada: si se
 * hicieran dos, el `;` de la primera entidad volvería a escaparse y saldría `#35#59;`.
 *
 * Para el `#` va la entidad numérica `#35;` y no la nominal `&num;` que sugiere la skill:
 * `&num;` parsea dentro de un mensaje pero rompe dentro de un alias de `participant` —el
 * tokenizador corta el nombre ahí—, y lo cazó el propio validador de la skill al correr
 * `npm run check:mermaid`. La numérica funciona en los dos lugares.
 */
function escapeLabel(text: string): string {
  const flat = text.replace(/\r?\n/g, "<br/>").trim();
  const escaped = flat.replace(/[#;]/g, (c) => (c === "#" ? "#35;" : "#59;"));
  // `end` cierra un bloque: como texto suelto tiene que ir entre comillas.
  return /^end$/i.test(escaped) ? `"${escaped}"` : escaped;
}

/** Los ids del análisis ya vienen cortos y en minúsculas; esto es el cinturón. */
function safeId(id: string): string {
  const clean = id.replace(/[^A-Za-z0-9_]/g, "_");
  return /^[0-9]/.test(clean) ? `p_${clean}` : clean || "x";
}

/** `#1F7A4C` -> `rgb(31, 122, 76)`, que es lo que entiende `rect`. */
function toRgb(hex: string, alpha = 1): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const parts = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return alpha >= 1 ? `rgb(${parts.join(", ")})` : `rgba(${parts.join(", ")}, ${alpha})`;
}

export type DiagramActor = { id: string; name: string };
export type DiagramArrow = {
  from: string;
  to: string;
  label: string;
  isReturn?: boolean;
  /** Color hex del veredicto. Agrupa mensajes contiguos en un bloque `rect`. */
  tint?: string;
};

/**
 * Arma un `sequenceDiagram` completo, con frontmatter y participantes en orden de flujo.
 * Los mensajes contiguos que comparten color se agrupan en un `rect`: es la única forma
 * de pintar una secuencia que el parser oficial acepta.
 */
export function sequenceDiagram({
  actors,
  arrows,
  autonumber = true,
  tintAlpha = 0.22,
}: {
  actors: DiagramActor[];
  arrows: DiagramArrow[];
  autonumber?: boolean;
  tintAlpha?: number;
}): string {
  const lines = ["---", "config:", "  theme: dark", "---", "sequenceDiagram"];
  if (autonumber) lines.push("    autonumber");

  for (const a of actors) {
    lines.push(`    participant ${safeId(a.id)} as ${escapeLabel(a.name)}`);
  }

  let openTint: string | null = null;
  const closeBlock = () => {
    if (openTint !== null) {
      lines.push("    end");
      openTint = null;
    }
  };

  for (const arrow of arrows) {
    const rgb = arrow.tint ? toRgb(arrow.tint, tintAlpha) : null;
    if (rgb !== openTint) {
      closeBlock();
      if (rgb) {
        lines.push(`    rect ${rgb}`);
        openTint = rgb;
      }
    }
    const indent = openTint ? "        " : "    ";
    const kind = arrow.isReturn ? "-->>" : "->>";
    lines.push(
      `${indent}${safeId(arrow.from)}${kind}${safeId(arrow.to)}: ${escapeLabel(arrow.label)}`,
    );
  }
  closeBlock();

  return lines.join("\n");
}

/** Solo los participantes que ese camino toca, en el orden en que aparecen. */
function actorsOf(analysis: Analysis, path: FlowPath): DiagramActor[] {
  const order: string[] = [];
  for (const m of path.messages) {
    for (const id of [m.from, m.to]) if (!order.includes(id)) order.push(id);
  }
  return order.map((id) => ({
    id,
    name: analysis.participants.find((p) => p.id === id)?.name ?? id,
  }));
}

/** El diagrama de un camino del código. `tint` lo pinta por veredicto; sin él sale limpio. */
export function mermaidForPath(
  analysis: Analysis,
  path: FlowPath,
  tint?: TintFn,
): string {
  return sequenceDiagram({
    actors: actorsOf(analysis, path),
    arrows: path.messages.map((m, i) => ({
      from: m.from,
      to: m.to,
      label: m.label,
      isReturn: m.isReturn,
      tint: tint?.(m, i),
    })),
  });
}

/** Un diagrama por camino: feliz, alternativos y los que el código no maneja. */
export function mermaidForAnalysis(analysis: Analysis, tint?: TintFn): MermaidDiagram[] {
  return analysis.paths.map((path) => ({
    pathId: path.id,
    name: path.name,
    kind: path.kind,
    diagram: mermaidForPath(analysis, path, tint),
  }));
}

/**
 * El diagrama que construyó el dev con sus respuestas, no el del código. Es el otro mapa:
 * superponerlo con el de arriba es de lo que trata el producto.
 */
export function mermaidForDev({
  actors,
  arrows,
}: {
  actors: DiagramActor[];
  arrows: DiagramArrow[];
}): string {
  if (actors.length === 0) return "";
  return sequenceDiagram({ actors, arrows, autonumber: false });
}
