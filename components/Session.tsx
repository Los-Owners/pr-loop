"use client";

import SequenceDiagram from "./SequenceDiagram";
import { UNSURE, isReady, needsConfirmation } from "@/lib/scoring";
import { devDiagram } from "@/lib/dev-diagram";
import type { Analysis, Answer, Question } from "@/lib/types";

export default function Session({
  analysis,
  questions,
  index,
  answers,
  onPick,
  onConfirm,
  onText,
  onNext,
}: {
  analysis: Analysis;
  questions: Question[];
  index: number;
  answers: Record<string, Answer>;
  onPick: (q: Question, optionId: string) => void;
  onConfirm: (qid: string, value: boolean) => void;
  onText: (qid: string, value: string) => void;
  onNext: () => void;
}) {
  const q = questions[index];
  const a = answers[q.id];
  const picks = a?.picks ?? [];
  const last = index === questions.length - 1;
  const ready = isReady(q, a);
  const { actors, messages } = devDiagram(analysis, answers, q.id === "q1");

  const hint = !picks.length
    ? "Elige una opción."
    : needsConfirmation(a) && a?.confirmed === undefined
      ? "Falta confirmar."
      : q.needsText && !(a?.text ?? "").trim()
        ? "El porqué es obligatorio en esta."
        : "";

  return (
    <div className="session">
      <section className="panel">
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 3 }}>
          <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>
            {q.panel === "tests" ? "Las pruebas del PR" : "Tu diagrama"}
          </p>
          <p className="eyebrow">{q.panel === "tests" ? "traducidas de sus aserciones" : "lo dibujas tú"}</p>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--soft)", margin: "0 0 14px", maxWidth: "60ch" }}>{q.hint}</p>

        {q.panel === "diagram" ? (
          <SequenceDiagram
            actors={actors}
            messages={messages}
            empty={
              messages.length
                ? undefined
                : actors.length > 2
                  ? "Todavía no hay orden. Responde y aparecen las flechas."
                  : "Marca los servicios y sus líneas aparecen acá."
            }
          />
        ) : (
          <div>
            {analysis.tests.map((t) => (
              <div key={t.id} className="testCard">
                <p className="eyebrow" style={{ marginBottom: 5 }}>{t.file}</p>
                <p style={{ margin: 0, fontSize: 14 }}>{t.asserts}</p>
              </div>
            ))}
            <p style={{ fontSize: 12, color: "var(--faint)", margin: "8px 0 0" }}>
              Descritas por lo que comprueban, no por el nombre que les puso quien las escribió.
            </p>
          </div>
        )}
      </section>

      <section className="ask">
        <div className="pips">
          {questions.map((qq, i) => (
            <span
              key={qq.id}
              className="pip"
              data-on={(answers[qq.id]?.picks.length ?? 0) > 0 ? "true" : undefined}
              data-here={i === index ? "true" : undefined}
            />
          ))}
          <span className="mono" style={{ fontSize: 10.5, color: "var(--faint)", marginLeft: 7 }}>
            {index + 1} de {questions.length}
          </span>
        </div>

        <h2 className="qTitle">{q.title}</h2>

        <div className="options">
          {q.options.map((o) => (
            <button
              key={o.id}
              type="button"
              className="option"
              data-on={picks.includes(o.id) ? "true" : undefined}
              onClick={() => onPick(q, o.id)}
            >
              <span className="mark" data-square={q.multi && o.id !== UNSURE ? "true" : undefined} />
              <span>{o.label}</span>
            </button>
          ))}
        </div>

        {needsConfirmation(a) ? (
          <div className="confirm">
            <p style={{ margin: "0 0 9px", fontSize: 13.5, fontWeight: 500 }}>¿Lo confirmas?</p>
            <div className="confirmBtns">
              <button type="button" className="chipBtn" data-on={a?.confirmed === true ? "yes" : undefined} onClick={() => onConfirm(q.id, true)}>
                Lo confirmo
              </button>
              <button type="button" className="chipBtn" data-on={a?.confirmed === false ? "no" : undefined} onClick={() => onConfirm(q.id, false)}>
                Prefiero revisarlo
              </button>
            </div>
          </div>
        ) : null}

        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <p className="eyebrow">Por qué · {q.needsText ? "obligatorio" : "opcional"}</p>
            <span className="ghost" aria-hidden>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" />
              </svg>
              Dictar
            </span>
          </div>
          <textarea
            className="textarea"
            placeholder="¿Por qué? Una o dos frases."
            value={a?.text ?? ""}
            onChange={(e) => onText(q.id, e.target.value)}
          />
        </div>

        <div className="footRow">
          <button type="button" className="primary" disabled={!ready} onClick={onNext}>
            {last ? "Ver el reporte" : "Siguiente"}
          </button>
          <span className="hintText">{hint}</span>
        </div>
      </section>
    </div>
  );
}
