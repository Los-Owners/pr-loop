"use client";

import { useMemo, useState } from "react";
import Shell from "./Shell";
import SignInGate from "./SignInGate";
import { authEnabled } from "./ConvexClientProvider";
import Session from "./Session";
import Scan from "./Scan";
import Report from "./Report";
import SaveSession, { type SavePayload } from "./SaveSession";
import SavedReport from "./SavedReport";
import type { Id } from "@/convex/_generated/dataModel";
import { buildQuestions } from "@/lib/questions";
import { applyPhase, initialPhases, type PhaseId, type PhaseState } from "@/lib/phases";
import { UNSURE, tally } from "@/lib/scoring";
import type { OutputPr } from "@/lib/session";
import type { Analysis, Answer, Question } from "@/lib/types";

type Step = "start" | "auth" | "scan" | "session" | "report" | "saved";

const EMPTY: Answer = { picks: [], text: "" };

export default function App({ example }: { example: Analysis }) {
  const [analysis, setAnalysis] = useState<Analysis>(example);
  const [pr, setPr] = useState<OutputPr | null>(null);
  const [step, setStep] = useState<Step>("start");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phases, setPhases] = useState<Record<PhaseId, PhaseState>>(initialPhases);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [openId, setOpenId] = useState<Id<"sessions"> | null>(null);

  const questions = useMemo(() => buildQuestions(analysis), [analysis]);

  const reset = () => {
    setStep("start");
    setIndex(0);
    setAnswers({});
    setError(null);
    setOpenId(null);
  };

  const openSaved = (id: Id<"sessions">) => {
    setOpenId(id);
    setError(null);
    setStep("saved");
  };

  /** El PR de ejemplo no toca la red ni gasta análisis: es el que se enseña en vivo. */
  const runExample = () => {
    setAnalysis(example);
    setPr(null);
    setError(null);
    setIndex(0);
    setAnswers({});
    setStep("session");
    setOpenId(null);
  };

  /**
   * Corre el análisis leyendo el progreso real por SSE. Cada fase que el servidor cierra
   * marca su check acá; no hay ningún temporizador simulando avance.
   */
  const scan = async () => {
    setError(null);
    setIndex(0);
    setAnswers({});
    setPhases(initialPhases());
    setStep("scan");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "text/event-stream" },
        body: JSON.stringify({ url }),
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "El analizador falló.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let result: { analysis: Analysis; pr?: OutputPr | null } | null = null;

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Los eventos van separados por una línea en blanco; lo que quede a medias se
        // guarda para el próximo trozo.
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const name = /^event: (.+)$/m.exec(chunk)?.[1];
          const raw = /^data: (.+)$/m.exec(chunk)?.[1];
          if (!name || !raw) continue;
          const payload = JSON.parse(raw);

          if (name === "phase") setPhases((prev) => applyPhase(prev, payload));
          else if (name === "error") throw new Error(payload.error);
          else if (name === "result") result = payload;
        }
      }

      if (!result) throw new Error("El análisis se cortó antes de terminar.");

      setAnalysis(result.analysis);
      setPr(result.pr ?? null);
      // Un respiro para que el último check se vea antes de cambiar de pantalla.
      await new Promise((r) => setTimeout(r, 550));
      setStep("session");
    } catch (e) {
      setError(e instanceof Error ? e.message : "El analizador falló.");
      setStep("start");
    }
  };

  /** Sin deployment de Convex no hay a quién pedirle login: se analiza directo. */
  const begin = () => {
    if (!url.trim()) {
      setError("Pega la URL de un pull request público.");
      return;
    }
    if (authEnabled) setStep("auth");
    else void scan();
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

  const repo = pr
    ? `${pr.url.replace(/^https?:\/\/github\.com\//, "")}`.replace(/\/pull\//, " #")
    : "PR de ejemplo";

  const savePayload: SavePayload | null = useMemo(() => {
    if (step !== "report") return null;
    const counts = tally(questions, answers);
    return {
      label: repo,
      title: analysis.feature.title,
      prUrl: pr?.url,
      verdict: counts.red
        ? "red"
        : counts.yellow
          ? "yellow"
          : counts.blue
            ? "blue"
            : counts.green
              ? "green"
              : "grey",
      analysis,
      answers,
    };
    // `answers` ya no cambia en el reporte, y `repo` se deriva de `pr`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return (
    <Shell
      crumbRepo={
        step === "start" ? "Nuevo análisis" : step === "saved" ? "Del historial" : repo
      }
      crumbTitle={step === "start" || step === "saved" ? "" : analysis.feature.title}
      onNew={reset}
      activeSessionId={openId}
      onOpenSession={openSaved}
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
              <input
                className="input"
                value={url}
                placeholder="github.com/usuario/repo/pull/123"
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && begin()}
                aria-label="URL del PR"
              />
              <button type="button" className="primary" onClick={begin}>Analizar</button>
            </div>

            {error ? (
              <p style={{ fontSize: 12.5, color: "var(--red)", margin: "10px 0 0" }} role="alert">
                {error}
              </p>
            ) : null}

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
              Solo repos públicos. Durante la sesión no vas a poder mirar el código.{" "}
              <button type="button" className="ghost" onClick={runExample}>
                Ver el PR de ejemplo
              </button>
            </p>
          </div>
        </div>
      ) : null}

      {step === "auth" ? (
        <SignInGate repo={url} onSignedIn={() => void scan()} onCancel={() => setStep("start")} />
      ) : null}

      {step === "scan" ? <Scan phases={phases} /> : null}

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
        <>
          {savePayload ? <SaveSession payload={savePayload} /> : null}
          <Report
            analysis={analysis}
            questions={questions}
            answers={answers}
            pr={pr}
            onRestart={reset}
          />
        </>
      ) : null}

      {step === "saved" && openId ? <SavedReport id={openId} onRestart={reset} /> : null}
    </Shell>
  );
}
