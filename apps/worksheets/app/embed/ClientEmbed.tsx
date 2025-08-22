"use client";

import React, { useState } from "react";

type TeacherPanel = {
  cefr_rationale?: string;
  sensitive_flags?: string[];
  inclusive_notes?: string[];
  differentiation?: string[];
  ld_panel?: string | null;
  preteach_vocab?: string[];     // added per your request
  answers?: Record<string, unknown>; // added per your request
  sources_verified?: boolean;
  sources?: Array<{ title?: string; url?: string }>;
};

type Preview = {
  student_text?: string;
  exercises?: any[];
  teacher_panel?: TeacherPanel;
};

function safeRenderExercise(ex: any, idx: number): JSX.Element | null {
  if (ex == null) return null;

  const isPrimitive =
    typeof ex === "string" || typeof ex === "number" || typeof ex === "boolean";

  if (isPrimitive) {
    return <li key={idx}>{String(ex)}</li>;
  }

  if (Array.isArray(ex)) {
    return (
      <li key={idx}>
        <ul>{ex.map((child, i) => safeRenderExercise(child, i))}</ul>
      </li>
    );
  }

  if (typeof ex === "object") {
    // Common shapes: { task, questions, options, answer, ... }
    const {
      type,
      task,
      prompt,
      text,
      question,
      questions,
      options,
      answer,
      ...rest
    } = ex as Record<string, unknown>;

    const hasQuestions = Array.isArray(questions) && questions.length > 0;
    const hasOptions = Array.isArray(options) && options.length > 0;
    const hasRest = Object.keys(rest ?? {}).length > 0;

    return (
      <li key={idx}>
        <div className="font-medium">{String(task ?? type ?? "Exercise")}</div>

        {prompt && <div className="mb-1">{String(prompt)}</div>}
        {text && <div className="mb-1">{String(text)}</div>}
        {question && <div className="mb-1">Q: {String(question)}</div>}

        {hasQuestions && (
          <ol className="list-decimal ml-5">
            {(questions as any[]).map((q, i) => (
              <li key={i}>{safeRenderExercise(q, i)}</li>
            ))}
          </ol>
        )}

        {hasOptions && (
          <ul className="list-disc ml-5">
            {(options as any[]).map((o, i) => <li key={i}>{String(o)}</li>)}
          </ul>
        )}

        {answer !== undefined && (
          <details className="mt-1">
            <summary>Answer</summary>
            <pre className="whitespace-pre-wrap text-sm">
              {typeof answer === "string" || typeof answer === "number"
                ? String(answer)
                : JSON.stringify(answer, null, 2)}
            </pre>
          </details>
        )}

        {hasRest && (
          <details className="mt-1">
            <summary>More</summary>
            <pre className="whitespace-pre-wrap text-xs">
              {JSON.stringify(rest, null, 2)}
            </pre>
          </details>
        )}
      </li>
    );
  }

  // Fallback
  return <li key={idx}>{String(ex)}</li>;
}

export default function ClientEmbed() {
  const [input, setInput] = useState("");
  const [cefr, setCefr] = useState("B2");
  const [exam, setExam] = useState("Cambridge B2");
  const [locale, setLocale] = useState("IE");
  const [school, setSchool] = useState("Public");
  const [inclusive, setInclusive] = useState(true);
  const [ldPanel, setLdPanel] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [showTeacher, setShowTeacher] = useState(false);

  async function onGenerate() {
    setError(null);
    setLoading(true);
    setPreview(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          input,
          cefr,
          exam,
          locale,
          school,
          inclusive,
          ld_support: ldPanel,
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Server ${res.status}: ${txt || res.statusText}`);
      }

      const data = (await res.json()) as Preview;
      setPreview(data);
      setShowTeacher(true);

      // save to localStorage for print/export page
      if (typeof window !== "undefined") {
        localStorage.setItem("aontas_preview", JSON.stringify(data));
      }
    } catch (e: any) {
      setError(e?.message || "Failed to generate.");
    } finally {
      setLoading(false);
    }
  }

  function onReset() {
    setPreview(null);
    setError(null);
    setShowTeacher(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("aontas_preview");
    }
  }

  function onExport() {
    // open the printable page; it will read from localStorage
    window.open("/embed/print", "_blank");
  }

  return (
    <div className="max-w-3xl w-full mx-auto">
      {/* Controls */}
      <div className="space-y-4">
        <textarea
          className="w-full border rounded p-2 min-h-[160px]"
          placeholder="Paste article text or a URL..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-2">
            <span className="w-28">CEFR</span>
            <select className="border rounded p-1 flex-1" value={cefr} onChange={(e) => setCefr(e.target.value)}>
              {["A1","A2","B1","B2","C1","C2"].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>

          <label className="flex items-center gap-2">
            <span className="w-28">Exam</span>
            <select className="border rounded p-1 flex-1" value={exam} onChange={(e) => setExam(e.target.value)}>
              {["Cambridge B1","Cambridge B2","IELTS","TOEFL","Trinity","None"].map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>

          <label className="flex items-center gap-2">
            <span className="w-28">Locale</span>
            <select className="border rounded p-1 flex-1" value={locale} onChange={(e) => setLocale(e.target.value)}>
              {["IE","UK","US","ES"].map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>

          <label className="flex items-center gap-2">
            <span className="w-28">School</span>
            <select className="border rounded p-1 flex-1" value={school} onChange={(e) => setSchool(e.target.value)}>
              {["Public","Private","Exam Prep"].map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={inclusive} onChange={(e) => setInclusive(e.target.checked)} />
            <span>Inclusive language</span>
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={ldPanel} onChange={(e) => setLdPanel(e.target.checked)} />
            <span>Include LD panel</span>
          </label>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onGenerate}
            disabled={loading || !input.trim()}
            className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
          >
            {loading ? "Generating…" : "Generate preview"}
          </button>
          <button onClick={onReset} className="px-3 py-2 rounded border">
            Reset
          </button>
          <button onClick={onExport} disabled={!preview} className="px-3 py-2 rounded border disabled:opacity-50">
            Export (print)
          </button>
        </div>
      </div>

      {/* Errors */}
      {error && (
        <div className="mt-4 p-3 border border-red-300 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="mt-8 space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-2">Student worksheet</h2>
            {preview.student_text && (
              <div className="prose max-w-none whitespace-pre-wrap mb-4">
                {preview.student_text}
              </div>
            )}

            <h3 className="font-semibold mb-1">Exercises</h3>
            <ul className="list-disc ml-5">
              {(preview.exercises ?? []).map((ex, i) => safeRenderExercise(ex, i))}
            </ul>
          </section>

          {/* Teacher panel */}
          <section>
            <button
              className="px-3 py-2 rounded border"
              onClick={() => setShowTeacher(!showTeacher)}
            >
              {showTeacher ? "Hide" : "Show"} Teacher Panel
            </button>

            {showTeacher && (
              <div className="mt-3 p-3 border rounded space-y-2 bg-gray-50">
                <h3 className="font-semibold">Teacher Panel</h3>
                {preview.teacher_panel?.cefr_rationale && (
                  <p><strong>CEFR rationale:</strong> {preview.teacher_panel.cefr_rationale}</p>
                )}
                {preview.teacher_panel?.sensitive_flags?.length ? (
                  <p><strong>Flagged content:</strong> {preview.teacher_panel.sensitive_flags.join(", ")}</p>
                ) : null}
                {preview.teacher_panel?.inclusive_notes?.length ? (
                  <p><strong>Inclusive language notes:</strong> {preview.teacher_panel.inclusive_notes.join("; ")}</p>
                ) : null}
                {preview.teacher_panel?.differentiation?.length ? (
                  <p><strong>Differentiation:</strong> {preview.teacher_panel.differentiation.join("; ")}</p>
                ) : null}
                {preview.teacher_panel?.preteach_vocab?.length ? (
                  <p><strong>Pre-teach vocab:</strong> {preview.teacher_panel.preteach_vocab.join(", ")}</p>
                ) : null}
                {preview.teacher_panel?.answers ? (
                  <details>
                    <summary><strong>Task answers</strong></summary>
                    <pre className="whitespace-pre-wrap text-sm">
                      {JSON.stringify(preview.teacher_panel.answers, null, 2)}
                    </pre>
                  </details>
                ) : null}
                {ldPanel && preview.teacher_panel?.ld_panel ? (
                  <details>
                    <summary><strong>LD panel</strong></summary>
                    <div className="whitespace-pre-wrap">{preview.teacher_panel.ld_panel}</div>
                  </details>
                ) : null}
                {"sources_verified" in (preview.teacher_panel ?? {}) && (
                  <p><strong>Sources verified:</strong> {preview.teacher_panel?.sources_verified ? "Yes" : "No"}</p>
                )}
                {preview.teacher_panel?.sources?.length ? (
                  <ul className="list-disc ml-5">
                    {preview.teacher_panel.sources.map((s, i) => (
                      <li key={i}>
                        {s.title ? <span className="font-medium">{s.title}: </span> : null}
                        {s.url ? <a className="text-blue-600 underline" href={s.url} target="_blank" rel="noreferrer">{s.url}</a> : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
