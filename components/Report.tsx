"use client";

import { useState } from "react";
import SequenceDiagram, { type DiagramMessage } from "./SequenceDiagram";
import { VERDICT_META, headline, tally, verdictFor } from "@/lib/scoring";
import { CAUSES, adviceFor, buildPrompt, evidenceFor, feedbackFor, questionForMessage, skillsFor } from "@/lib/report";
import type { Analysis, Answer, Question } from "@/lib/types";

export default function Report({
  analysis,
  questions,
  answers,
  onRestart,
}: {
  analysis: Analysis;
  questions: Question[];
  answers: Record<string, Answer>;
  onRestart: () => void;
}) {
  const [tab, setTab] = useState(analysis.paths[0]?.id ?? "");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  const counts = tally(questions, answers);
  const worst = counts.red ? "red" : counts.yellow ? "yellow" : counts.blue ? "blue" : "green";
  const colorOf = (qid: string) => {
    const q = questions.find((x) => x.id === qid);
    return q ? VERDICT_META[verdictFor(q, answers[qid])].color : VERDICT_META.grey.color;
  };

  const path = analysis.paths.find((p) => p.id === tab) ?? analysis.paths[0];
  const used = new Set(path.messages.flatMap((m) => [m.from, m.to]));
  const messages: DiagramMessage[] = path.messages.map((m) => {
    const qid = questionForMessage(m, path.kind, analysis);
    return { ...m, color: qid ? colorOf(qid) : VERDICT_META.grey.color };
  });

  const prompt = buildPrompt(questions, answers, analysis);

  return (
    <div className="report">
      <div className="verdictRow">
        <div>
          <p className="eyebrow" style={{ color: VERDICT_META[worst].color, marginBottom: 9 }}>Reporte</p>
          <h2 className="verdictTitle">{headline(counts)}</h2>
          <p style={{ fontSize: 14.5, color: "var(--soft)", margin: 0, maxWidth: "70ch" }}>
            {counts.red
              ? "Nada de esto lo habrían dicho las pruebas: están todas en verde."
              : "Quedan caminos que el código no cubre, aunque los hayas identificado."}
          </p>
        </div>
        <button type="button" className="chipBtn" onClick={onRestart}>Analizar otro PR</button>
      </div>

      <div className="tally">
        {(["green", "blue", "red", "yellow"] as const).map((v) => (
          <div key={v} className="tallyItem">
            <span className="dot" style={{ background: VERDICT_META[v].color }} />
            <span className="mono">{counts[v]}</span>
            <span style={{ color: "var(--soft)" }}>{VERDICT_META[v].label.toLowerCase()}</span>
          </div>
        ))}
      </div>

      <p className="eyebrow" style={{ marginBottom: 10 }}>Sección 1 · la secuencia del código, pintada por tus respuestas</p>
      <div className="tabsBox">
        <div className="tabsCol">
          {analysis.paths.map((p) => (
            <button key={p.id} type="button" className="tab" data-on={p.id === tab ? "true" : undefined} onClick={() => setTab(p.id)}>
              <span className="dot" style={{ marginTop: 6, background: p.id === tab ? "var(--accent)" : "#d5d5dc" }} />
              <span>{p.name}</span>
            </button>
          ))}
        </div>
        <div style={{ padding: "18px 22px 14px" }}>
          <p style={{ fontSize: 13, color: "var(--soft)", margin: "0 0 10px", maxWidth: "72ch" }}>
            {path.kind === "missing"
              ? "Este camino no existe en el código."
              : path.kind === "happy"
                ? "El camino que ocurre cuando todo responde."
                : "Un camino alternativo del feature."}
          </p>
          <SequenceDiagram
            width={720}
            actors={analysis.participants.map((p) => ({ id: p.id, name: p.name, dim: !used.has(p.id) }))}
            messages={messages}
          />
          <div className="legend">
            {(["green", "blue", "red", "yellow", "grey"] as const).map((v) => (
              <span key={v} className="legendItem">
                <span className="sw" style={{ background: VERDICT_META[v].color }} />
                {VERDICT_META[v].label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="eyebrow" style={{ marginBottom: 10 }}>Sección 2 · pregunta por pregunta</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 34 }}>
        {questions.map((q) => {
          const v = verdictFor(q, answers[q.id]);
          const meta = VERDICT_META[v];
          const a = answers[q.id];
          const labels = q.options.filter((o) => a?.picks.includes(o.id)).map((o) => o.label);
          const conf = a?.confirmed === true ? " — y lo confirmaste" : a?.confirmed === false ? " — preferiste revisarlo" : "";
          const diverges = v === "red" || v === "yellow";
          const ev = evidenceFor(q.id, analysis);
          const isOpen = !!open[q.id];
          return (
            <article key={q.id} className="card" style={{ borderLeft: `3px solid ${meta.color}` }}>
              <div className="cardHead">
                <p style={{ fontSize: 15, fontWeight: 500, margin: 0, maxWidth: "66ch" }}>{q.title}</p>
                <span className="tagChip" style={{ color: meta.color, background: meta.tint }}>{meta.label}</span>
              </div>
              <dl className="kv">
                <dt>Respondiste</dt>
                <dd>{labels.join(", ") || "sin responder"}{conf}</dd>
                <dt>Dijiste</dt>
                <dd className="said">{(a?.text ?? "").trim() || "—"}</dd>
                <dt>Producto</dt>
                <dd>{feedbackFor(q.id, analysis)}</dd>
              </dl>

              {diverges ? (
                <div className="causes" style={{ background: meta.tint }}>
                  <p className="eyebrow" style={{ color: meta.color, marginBottom: 7 }}>Por qué pueden diferir</p>
                  <p className="causesText">{CAUSES[q.id]}</p>
                </div>
              ) : null}

              {ev ? (
                <div style={{ marginTop: 12 }}>
                  <button type="button" className="ghost" onClick={() => setOpen({ ...open, [q.id]: !isOpen })}>
                    {isOpen ? "Ocultar evidencia" : "Ver evidencia en el código"}
                  </button>
                  {isOpen ? (
                    <div className="evidence">
                      <p>{ev.ref}</p>
                      <pre>{ev.code}</pre>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <p className="eyebrow" style={{ marginBottom: 10 }}>Sección 3 · qué te llevas</p>
      <div className="takeaway">
        <div className="promptBox">
          <div className="promptHead">
            Pégalo en tu sesión
            <button type="button" className="ghost" onClick={() => { navigator.clipboard?.writeText(prompt); setCopied(true); }}>
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          <p className="promptBody">{prompt}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="sideCard">
            <p className="eyebrow" style={{ marginBottom: 9 }}>En qué mejorar</p>
            <p style={{ fontSize: 13.5, color: "#4a4a54", margin: 0 }}>{adviceFor(counts)}</p>
          </div>
          <div className="sideCard">
            <p className="eyebrow" style={{ marginBottom: 11 }}>Skills que te vendrían bien</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {skillsFor(counts).map((s) => (
                <div key={s.id} className="skill" style={{ borderLeftColor: s.color }}>
                  <p className="skillId">{s.id}</p>
                  <p className="skillWhy">{s.why}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
