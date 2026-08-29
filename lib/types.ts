/** Contrato del analizador. Ver docs/spec/03-analizador.md */

export type Participant = { id: string; name: string; evidence: string };

export type Message = {
  from: string;
  to: string;
  label: string;
  isReturn: boolean;
  evidence: string;
};

export type PathKind = "happy" | "alternative" | "missing";

export type FlowPath = {
  id: string;
  name: string;
  kind: PathKind;
  messages: Message[];
};

export type Decision = {
  id: string;
  question: string;
  actual: string;
  alternatives: string[];
  evidence: string;
};

export type TestCase = {
  id: string;
  file: string;
  /** Lo que la aserción comprueba, parafraseado. Nunca el nombre del test. */
  asserts: string;
  covers: string[];
  substantive: boolean;
};

export type Analysis = {
  feature: { title: string; summary: string };
  participants: Participant[];
  paths: FlowPath[];
  decisions: Decision[];
  tests: TestCase[];
  /** file:linea -> fragmento citable. Alimenta «ver evidencia» en el reporte. */
  snippets: Record<string, string>;
};

/** Una pregunta de la sesión, ya lista para pintar. */
export type Option = { id: string; label: string; correct?: boolean };

export type Question = {
  id: string;
  title: string;
  hint: string;
  multi: boolean;
  needsText: boolean;
  panel: "diagram" | "tests";
  options: Option[];
};

export type Answer = {
  picks: string[];
  /** true = "Lo confirmo", false = "Prefiero revisarlo", undefined = no aplica */
  confirmed?: boolean;
  text: string;
};

export type Verdict = "green" | "blue" | "red" | "yellow" | "grey";
