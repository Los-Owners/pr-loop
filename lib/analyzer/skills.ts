/**
 * Las skills de `.agents/skills/`, cargadas para que participen de verdad del producto.
 *
 * Dos puntos de enganche, ninguno decorativo:
 *
 * 1. `repo-to-spec` — su doctrina de ingeniería inversa (el código es la única fuente, el
 *    README solo orienta, exploración por capas, todo se verifica contra lo que se ejecuta)
 *    se inyecta en el prompt del analizador. Editar el SKILL.md cambia el analizador.
 * 2. `architecture-map` — sus reglas de sintaxis Mermaid están implementadas en
 *    lib/mermaid.ts, y su propio `validate.mjs` es el que corre `npm run check:mermaid`.
 *
 * Solo servidor: lee del disco. El resultado se memoiza porque el directorio no cambia
 * entre peticiones.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

export type VendoredSkill = {
  slug: string;
  name: string;
  description: string;
  /** Cómo participa en pr-loop. Vacío si está vendorizada pero todavía no se usa. */
  role: string;
};

const ROOT = join(process.cwd(), ".agents", "skills");

/** Cómo se usa cada skill acá. Lo que no está en este mapa se lista como no utilizada. */
const ROLES: Record<string, string> = {
  "repo-to-spec":
    "Su doctrina de ingeniería inversa gobierna el prompt del analizador: el código es la única fuente de verdad y todo se cita.",
  "architecture-map":
    "Sus reglas de sintaxis Mermaid rigen los diagramas generados, y su validate.mjs los verifica contra el parser oficial.",
};

function frontmatter(md: string): Record<string, string> {
  const m = /^---\n([\s\S]*?)\n---/.exec(md);
  if (!m) return {};
  const out: Record<string, string> = {};
  // Un campo por línea `clave: valor`, con continuación indentada (las descripciones son largas).
  let key = "";
  for (const line of m[1].split("\n")) {
    const kv = /^([a-z_-]+):\s*(.*)$/i.exec(line);
    if (kv) {
      key = kv[1];
      out[key] = kv[2];
    } else if (key && line.trim()) {
      out[key] += ` ${line.trim()}`;
    }
  }
  return out;
}

/** Devuelve una sección `## Título` completa, sin su encabezado. */
function section(md: string, heading: string): string {
  const start = md.indexOf(heading);
  if (start === -1) return "";
  const rest = md.slice(start + heading.length);
  const end = rest.search(/\n## /);
  return (end === -1 ? rest : rest.slice(0, end)).trim();
}

function read(...parts: string[]): string {
  const path = join(ROOT, ...parts);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

let cachedSkills: VendoredSkill[] | null = null;

export function loadSkills(): VendoredSkill[] {
  if (cachedSkills) return cachedSkills;
  if (!existsSync(ROOT)) return (cachedSkills = []);

  cachedSkills = readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      const fm = frontmatter(read(e.name, "SKILL.md"));
      return {
        slug: e.name,
        name: fm.name ?? e.name,
        description: fm.description ?? "",
        role: ROLES[e.name] ?? "",
      };
    })
    .filter((s) => s.description !== "" || s.role !== "");

  return cachedSkills;
}

let cachedDoctrine: string | null = null;

/**
 * El fragmento de `repo-to-spec` que el analizador necesita: cómo se explora un repo
 * cuando el código es lo único que se puede creer. Se lee del SKILL.md, no se copia:
 * si la skill cambia, el analizador cambia con ella.
 */
export function reverseEngineeringDoctrine(): string {
  if (cachedDoctrine !== null) return cachedDoctrine;

  const md = read("repo-to-spec", "SKILL.md");
  const layered = section(md, "## Paso 2: Explorar en capas");
  if (!layered) return (cachedDoctrine = "");

  return (cachedDoctrine = [
    "## Cómo explorar (doctrina de la skill repo-to-spec)",
    "",
    "El repo real es la única fuente de verdad: los `.md` que el propio repo trae (README, docs)",
    "sirven solo para orientarte por dónde mirar, nunca como hecho confirmado — todo lo que termine",
    "en el análisis se verifica contra el código que efectivamente se ejecuta.",
    "",
    layered,
  ].join("\n"));
}

/**
 * Las reglas de sintaxis de `architecture-map`. No van al prompt —los diagramas se generan
 * con código, no con un modelo— pero se exponen para que el reporte pueda decir de dónde
 * salen las reglas que cumple el Mermaid que entrega.
 */
export function mermaidRulesSource(): string {
  return read("architecture-map", "references", "mermaid-syntax-rules.md");
}
