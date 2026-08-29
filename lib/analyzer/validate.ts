import type { Analysis, Decision, FlowPath, Participant, TestCase } from "../types";

/** La forma cruda que devuelve el modelo: igual a Analysis pero con snippets en arreglo. */
export type RawAnalysis = Omit<Analysis, "snippets"> & {
  snippets: { evidence: string; code: string }[];
};

/** Qué se descartó y por qué. Se registra: un análisis que pierde mucho es un análisis malo. */
export type Dropped = { kind: string; id: string; reason: string };

const EVIDENCE_RE = /^(.+):(\d+)$/;

function parseEvidence(evidence: string) {
  const m = EVIDENCE_RE.exec(evidence.trim());
  if (!m) return null;
  return { path: m[1], line: Number(m[2]) };
}

/**
 * Recorta el fragmento real del archivo alrededor de la línea citada. Se usa para
 * verificar lo que devolvió el modelo y para rellenar lo que le faltó: los snippets son
 * el único lugar del producto donde el dev ve código, así que no pueden ser inventados.
 */
function sliceAround(body: string, line: number, span = 3) {
  const lines = body.split("\n");
  const start = Math.max(0, line - 1);
  return lines.slice(start, Math.min(lines.length, start + span)).join("\n").trimEnd();
}

/** Normaliza sangría y espacios para comparar un fragmento contra el archivo. */
function squash(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Convierte la salida del modelo en el contrato que consume la UI, haciendo cumplir las
 * reglas duras de docs/spec/03-analizador.md:
 *
 * - Todo elemento cita líneas. Lo que no puede señalar dónde vive, se descarta.
 * - Los mensajes solo conectan participantes declarados.
 * - Cada evidencia tiene su fragmento, y el fragmento existe de verdad en el archivo.
 *
 * Descarta en vez de lanzar: un análisis parcial pero citable sirve; uno amplio y vago no.
 */
export function normalize(
  raw: RawAnalysis,
  files: Record<string, string> = {},
): { analysis: Analysis; dropped: Dropped[] } {
  const dropped: Dropped[] = [];

  // 1 · Snippets. Se prefiere siempre el archivo real sobre lo que dijo el modelo.
  const snippets: Record<string, string> = {};
  for (const { evidence, code } of raw.snippets ?? []) {
    const at = parseEvidence(evidence);
    const body = at ? files[at.path] : undefined;
    if (!at || !body) {
      snippets[evidence] = code;
      continue;
    }
    // Si el fragmento no aparece en el archivo, el modelo lo reescribió: se reemplaza.
    snippets[evidence] = squash(body).includes(squash(code))
      ? code
      : sliceAround(body, at.line);
  }

  /** Una cita vale si se puede resolver a un fragmento, propio o reconstruido del archivo. */
  const cites = (evidence: string | undefined): boolean => {
    if (!evidence) return false;
    if (snippets[evidence]) return true;
    const at = parseEvidence(evidence);
    const body = at ? files[at.path] : undefined;
    if (!at || !body) return false;
    const slice = sliceAround(body, at.line);
    if (!slice) return false;
    snippets[evidence] = slice; // el modelo lo omitió; lo reconstruimos del archivo
    return true;
  };

  // 2 · Participantes.
  const participants: Participant[] = [];
  for (const p of raw.participants ?? []) {
    if (!cites(p.evidence)) {
      dropped.push({ kind: "participant", id: p.id, reason: "sin evidencia citable" });
      continue;
    }
    participants.push(p);
  }
  const known = new Set(participants.map((p) => p.id));

  // 3 · Caminos. Un mensaje que conecta un participante inexistente no se puede dibujar.
  const paths: FlowPath[] = [];
  for (const path of raw.paths ?? []) {
    const messages = (path.messages ?? []).filter(
      (m) => known.has(m.from) && known.has(m.to) && cites(m.evidence),
    );
    if (messages.length === 0) {
      dropped.push({ kind: "path", id: path.id, reason: "ningún mensaje citable" });
      continue;
    }
    paths.push({ ...path, messages });
  }
  const pathIds = new Set(paths.map((p) => p.id));

  // 4 · Decisiones. Sin al menos dos alternativas no hay pregunta que hacer.
  const decisions: Decision[] = [];
  for (const d of raw.decisions ?? []) {
    if (!cites(d.evidence)) {
      dropped.push({ kind: "decision", id: d.id, reason: "sin evidencia citable" });
      continue;
    }
    // `alternatives` son solo distractores: la respuesta real la agrega questions.ts. Si el
    // modelo coló una copia de `actual`, la pregunta tendría dos opciones ciertas y no mediría
    // nada, así que se saca acá.
    const same = squash(d.actual).toLowerCase();
    const alternatives = [...new Set(d.alternatives ?? [])]
      .filter(Boolean)
      .filter((alt) => squash(alt).toLowerCase() !== same);
    if (alternatives.length < 1) {
      dropped.push({ kind: "decision", id: d.id, reason: "sin distractores utilizables" });
      continue;
    }
    decisions.push({ ...d, alternatives });
  }

  // 5 · Pruebas. `covers` solo puede apuntar a caminos que sobrevivieron.
  const tests: TestCase[] = [];
  for (const t of raw.tests ?? []) {
    if (!cites(t.file)) {
      dropped.push({ kind: "test", id: t.id, reason: "sin evidencia citable" });
      continue;
    }
    tests.push({ ...t, covers: (t.covers ?? []).filter((id) => pathIds.has(id)) });
  }

  return {
    analysis: { feature: raw.feature, participants, paths, decisions, tests, snippets },
    dropped,
  };
}

/**
 * Comprueba que el análisis alcanza para correr una sesión. Devuelve los problemas
 * encontrados: vacío significa utilizable.
 */
export function checkUsable(a: Analysis): string[] {
  const problems: string[] = [];
  if (a.participants.length < 2) problems.push("hacen falta al menos dos participantes");
  if (!a.paths.some((p) => p.kind === "happy")) problems.push("no hay camino feliz");
  if (a.decisions.length === 0) problems.push("no se encontró ninguna decisión que preguntar");
  if (a.paths.filter((p) => p.kind !== "happy").length === 0) {
    problems.push("no hay caminos alternativos ni faltantes");
  }
  return problems;
}
