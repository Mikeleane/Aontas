"use client";

import React, { useEffect, useState } from "react";

type TeacherPanel = {
  cefr_rationale?: string;
  sensitive_flags?: string[];
  inclusive_notes?: string[];
  differentiation?: string[];
  ld_panel?: string | null;
  preteach_vocab?: string[];
  answers?: Record<string, unknown>;
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

    return (
      <li key={idx}>
        <div className="font-medium">{String(task ?? type ?? "Exercise")}</div>

        {prompt && <div className="mb-1">{String(prompt)}</div>}
        {text && <div className="mb-1">{String(text)}</div>}
        {question && <div className="mb-1">Q: {String(question)}</div>}

        {Array.isArray(questions) && questions.length > 0 && (
          <ol className="list-decimal ml-5">
            {questions.map((q: any, i: number) => (
              <li key={i}>{safeRenderExercise(q, i)}</li>
            ))}
          </ol>
        )}

        {Array.isArray(options) && options.length > 0 && (
          <ul className="list-disc ml-5">
            {options.map((o: any, i: number) => <li key={i}>{String(o)}</li>)}
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

        {Object.keys(rest ?? {}).length > 0 && (
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

  return <li key={idx}>{String(ex)}</li>;
}

export default function PrintPage() {
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("aontas_preview");
      if (raw) setPreview(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Worksheet (Print)</h1>

      {preview ? (
        <>
          <section className="mb-8">
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

          <div className="break-after-page h-8" />

          <section>
            <h2 className="text-xl font-semibold mb-2">Teacher Panel</h2>
            <div className="space-y-2">
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
                <details open>
                  <summary><strong>Task answers</strong></summary>
                  <pre className="whitespace-pre-wrap text-sm">
                    {JSON.stringify(preview.teacher_panel.answers, null, 2)}
                  </pre>
                </details>
              ) : null}
              {preview.teacher_panel?.ld_panel ? (
                <details open>
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
          </section>

          <div className="mt-6 print:hidden">
            <button
              onClick={() => window.print()}
              className="px-3 py-2 rounded border"
            >
              Print
            </button>
          </div>
        </>
      ) : (
        <div className="p-3 border rounded">No preview data found. Go back and click <em>Generate preview</em> first.</div>
      )}
    </div>
  );
}
