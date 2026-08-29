"use client";

import { useMemo, useState } from "react";
import Shell from "./Shell";
import Session from "./Session";
import Report from "./Report";
import { buildQuestions } from "@/lib/questions";
import { UNSURE } from "@/lib/scoring";
import type { Analysis, Answer, Question } from "@/lib/types";

type Step = "start" | "scan" | "session" | "report";

const EMPTY: Answer = { picks: [], text: "" };

export default function App({ analysis }: { analysis: Analysis }) {
  const questions = useMemo(() => buildQuestions(analysis), [analysis]);
  const [step, setStep] = useState<Step>("start");
  const [url, setUrl] = useState("github.com/acme/checkout/pull/418");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});

  const reset = () => {
    setStep("start");
    setIndex(0);
    setAnswers({});
  };

  const begin = () => {
    setStep("scan");
    setTimeout(() => setStep("session"), 1700);
  };

  const pick = (q: Question, optionId: string) => {
    setAnswers((prev) => {
      const cur = prev[q.id] ?? EMPTY;
      let picks: string[];
      if (optionId === UNSURE) {
        picks = cur.picks.includes(UNSURE) ? [] : [UNSURE];
      } else if (q.multi) {
        const base = cur.picks.filter((p) => p !== UNSURE);
        picks = base.includes(optionId) ? base.filter((p) => p !== optionId) : [...base, optionId];
      } else {
        picks = cur.picks.includes(optionId) ? [] : [optionId];
      }
      const confirmed = picks.length && !picks.includes(UNSURE) ? cur.confirmed : undefined;
      return { ...prev, [q.id]: { ...cur, picks, confirmed } };
    });
  };

  const confirm = (qid: string, value: boolean) =>
    setAnswers((prev) => ({ ...prev, [qid]: { ...(prev[qid] ?? EMPTY), confirmed: value } }));

  const setText = (qid: string, text: string) =>
    setAnswers((prev) => ({ ...prev, [qid]: { ...(prev[qid] ?? EMPTY), text } }));

  const next = () => {
    if (index === questions.length - 1) setStep("report");
    else setIndex(index + 1);
  };

  return (
    <Shell
      crumbRepo={step === "start" ? "Nuevo análisis" : "acme/checkout #418"}
      crumbTitle={step === "start" ? "" : analysis.feature.title}
      onNew={reset}
    >
      {step === "start" ? (
        <div className="center">
          <h1 className="h1">¿Sabes qué hace el PR que vas a aprobar?</h1>
          <p className="lede">
            Reconstruimos los specs desde el código y te preguntamos por el producto. Tú dibujas tu
            versión; al final las comparamos.
          </p>
          <div style={{ width: 600 }}>
            <div className="urlRow">
              <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="URL del PR" />
              <button type="button" className="primary" onClick={begin}>Analizar</button>
            </div>
            <div className="areas">
              <div className="area" data-on="true">
                <span className="areaName">Producto</span>
                <span style={{ fontSize: 11.5, color: "var(--soft)" }}>Qué hace y para quién</span>
              </div>
              <div className="area">
                <span className="areaName areaOff">Implementación</span>
                <span className="soon">Pronto</span>
              </div>
              <div className="area">
                <span className="areaName areaOff">Buenas prácticas</span>
                <span className="soon">Pronto</span>
              </div>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--faint)", margin: "16px 0 0", textAlign: "center" }}>
              Durante la sesión no vas a poder mirar el código.
            </p>
          </div>
        </div>
      ) : null}

      {step === "scan" ? (
        <div className="center">
          <p style={{ fontSize: 16, fontWeight: 500, margin: "0 0 18px" }}>Reconstruyendo los specs desde el código</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, width: 420 }}>
            {[
              `${analysis.participants.length} participantes detectados en el flujo`,
              `${analysis.paths.length} caminos reconstruidos desde las condicionales`,
              `${analysis.tests.length} pruebas analizadas, ${analysis.tests.filter((t) => !t.substantive).length} sin aserción real`,
              "Specs derivados del código",
            ].map((l) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "var(--soft)" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M4 12.5l5.5 5.5L20 7" />
                </svg>
                {l}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12.5, color: "var(--faint)", marginTop: 22 }}>
            El código es la única fuente de verdad. Nada de esto se te muestra todavía.
          </p>
        </div>
      ) : null}

      {step === "session" ? (
        <Session
          analysis={analysis}
          questions={questions}
          index={index}
          answers={answers}
          onPick={pick}
          onConfirm={confirm}
          onText={setText}
          onNext={next}
        />
      ) : null}

      {step === "report" ? (
        <Report analysis={analysis} questions={questions} answers={answers} onRestart={reset} />
      ) : null}
    </Shell>
  );
}
