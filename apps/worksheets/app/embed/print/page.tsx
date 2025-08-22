function safeRenderExercise(ex, idx) {
  if (ex == null) return <li key={idx}>—</li>;

  const primitive = (v) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';

  if (primitive(ex)) return <li key={idx}>{String(ex)}</li>;

  if (Array.isArray(ex)) {
    return (
      <li key={idx}>
        <ul>{ex.map((child, i) => safeRenderExercise(child, i))}</ul>
      </li>
    );
  }

  if (typeof ex === 'object') {
    const o = ex;

    // common shapes: { task, questions|items|steps }
    const list = (Array.isArray(o?.questions) && o.questions)
              || (Array.isArray(o?.items)     && o.items)
              || (Array.isArray(o?.steps)     && o.steps)
              || null;

    if (list) {
      return (
        <li key={idx}>
          {o?.task ? <strong>{String(o.task)}</strong> : null}
          <ul>{list.map((child, i) => safeRenderExercise(child, i))}</ul>
        </li>
      );
    }

    try { return <li key={idx}>{JSON.stringify(o)}</li>; }
    catch { return <li key={idx}>[object]</li>; }
  }

  return <li key={idx}>[unsupported]</li>;
}
"use client";
import React, { useEffect, useState } from 'react';


/* === NORMALIZE_EXERCISES_HELPERS (injected) === */
function normalizeExercises(list) {
  if (Array.isArray(list)) return list;
  if (list && typeof list === "object") return Object.values(list);
  return [];
}

>{String(ex)}</li>;
  }

  // Array → list
  if (Array.isArray(ex)) {
    return (
      <li key={key}>
        <ul>{ex.map((e, i) => safeRenderExercise(e, i))}</ul>
      </li>
    );
  }

  // Object → show core fields, then optional details
  if (typeof ex === "object") {
    const { type, task, prompt, text, question, questions, options, answer, ...rest } = ex;
    return (
      <li key={key}>
        <div className="font-medium">{task ?? type ?? "Exercise"}</div>

        {prompt && <div className="mb-1">{String(prompt)}</div>}
        {text && <div className="mb-1">{String(text)}</div>}
        {question && <div className="mb-1">Q: {String(question)}</div>}

        {Array.isArray(questions) && questions.length > 0 && (
          <ol className="list-decimal ml-5">
            {questions.map((q, i) => (
              <li key={i}>{safeRenderExercise(q, i)}</li>
            ))}
          </ol>
        )}

        {Array.isArray(options) && options.length > 0 && (
          <ul className="list-disc ml-5">
            {options.map((o, i) => <li key={i}>{String(o)}</li>)}
          </ul>
        )}

        {answer !== undefined && (
          <details className="mt-1">
            <summary>Answer</summary>
            <pre className="whitespace-pre-wrap text-sm">
{(typeof answer === "string" || typeof answer === "number")
  ? String(answer)
  : JSON.stringify(answer, null, 2)}
            </pre>
          </details>
        )}

        {Object.keys(rest ?? {}).length > 0 && (
          <details className="mt-1">
            <summary>More</summary>
            <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(rest, null, 2)}</pre>
          </details>
        )}
      </li>
    );
  }

  // Fallback
  return <li key={key}>{String(ex)}</li>;
}
/* ===== SAFE EXERCISE RENDERERS (injected) ===== */
type ExerciseShape =
  | string
  | number

>{String(ex)}</li>;
  }
  if (Array.isArray(ex)) {
    return (
      <li key={idx}>
        <ul className="list-disc pl-5">
          {ex.map((item, i) => <li key={i}>{String(item)}</li>)}
        </ul>
      </li>
    );
  }
  if (ex && typeof ex === "object") {
    const obj = ex as Record<string, unknown>;
    const task = obj.task as string | undefined;
    const questions = (obj.questions as unknown[]) || [];
    return (
      <li key={idx} className="mb-3">
        {task && <div className="font-semibold">{task}</div>}
        {Array.isArray(questions) && questions.length > 0 && (
          <ol className="list-decimal pl-6 space-y-1">
            {questions.map((q, i) => <li key={i}>{String(q)}</li>)}
          </ol>
        )}
        {!task && (!Array.isArray(questions) || questions.length === 0) && (
          <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
            {JSON.stringify(ex, null, 2)}
          </pre>
        )}
      </li>
    );
  }
  return <li key={idx}>{String(ex)}</li>;
}

function Exercises({ items }: { items: any }) {
  return <>{(items ?? []).map(safeRenderExercise)}</>;
}
/* ===== end injected helpers ===== */
/** Keep types tolerant — we render defensively */
type TeacherPanel = {
  cefr_rationale?: string;
  sensitive_flags?: string[];
  inclusive_notes?: string[];
  differentiation?: string[];
  sources?: string[];
  preteach_vocab?: string[];
  answers?: Record<string, unknown> | string;
};

type GenResponse = {
  student_text: string;
  exercises: any[];
  source?: string;
  credit?: string;
  teacher?: TeacherPanel;
};

type ExportBlob = {
  result: GenResponse;
  includeLD?: boolean;
  cefr?: string;
  exam?: string;
  locale?: string;
};

export default function PrintPage() {
  const [payload, setPayload] = useState<ExportBlob | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("aontasExport");
      if (raw) setPayload(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  if (!payload?.result) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="no-print mb-6">
          <a
            href="/embed"
            className="inline-block rounded border px-3 py-2"
          >
            ← Back to generator
          </a>
        </div>
        <p>Nothing to print. Generate a worksheet and click Export again.</p>
      </div>
    );
  }

  const { result, includeLD, cefr, exam, locale } = payload;
  const teacher = result.teacher ?? {};
  const answersText =
    typeof teacher.answers === "string"
      ? teacher.answers
      : teacher.answers
      ? JSON.stringify(teacher.answers, null, 2)
      : "";

  return (
    <div className="p-6 max-w-4xl mx-auto print:p-0">
      {/* On-screen toolbar (hidden when printing) */}
      <div className="no-print flex items-center gap-2 mb-6">
        <button
          onClick={() => window.print()}
          className="rounded bg-black text-white px-3 py-2"
        >
          Print / Save as PDF
        </button>
        <a
          href="/embed"
          className="rounded border px-3 py-2"
        >
          Back to generator
        </a>
      </div>

      {/* ---- TEACHER PACK ---- */}
      <header>
        <h1 className="text-2xl font-bold">Teacher Pack</h1>
        <p className="text-sm text-gray-600">
          {exam || "Exam"} • {cefr || "CEFR"} • {locale || "Locale"}
        </p>
      </header>

      <section className="mt-4">
        <h2 className="text-lg font-semibold">CEFR rationale</h2>
        <p className="whitespace-pre-wrap">
          {teacher.cefr_rationale || "—"}
        </p>
      </section>

      {!!teacher.preatech_vocab?.length && (
        <section className="mt-4">
          <h2 className="text-lg font-semibold">Pre-teach vocabulary</h2>
          <ul className="list-disc pl-5">
            {teacher.preatech_vocab!.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      {/* tolerant to both spellings: "preteach_vocab" or "preatech_vocab" */}
      {!teacher.preatech_vocab?.length && !!teacher.preteach_vocab?.length && (
        <section className="mt-4">
          <h2 className="text-lg font-semibold">Pre-teach vocabulary</h2>
          <ul className="list-disc pl-5">
            {teacher.preteach_vocab!.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      {!!teacher.sensitive_flags?.length && (
        <section className="mt-4">
          <h2 className="text-lg font-semibold">Flagged sensitive content</h2>
          <ul className="list-disc pl-5">
            {teacher.sensitive_flags.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </section>
      )}

      {!!teacher.inclusive_notes?.length && (
        <section className="mt-4">
          <h2 className="text-lg font-semibold">Inclusive-language notes</h2>
          <ul className="list-disc pl-5">
            {teacher.inclusive_notes.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </section>
      )}

      {!!teacher.differentiation?.length && (
        <section className="mt-4">
          <h2 className="text-lg font-semibold">Suggested differentiation</h2>
          <ul className="list-disc pl-5">
            {teacher.differentiation.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </section>
      )}

      {!!teacher.sources?.length && (
        <section className="mt-4">
          <h2 className="text-lg font-semibold">Verified sources</h2>
          <ul className="list-disc pl-5">
            {teacher.sources.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </section>
      )}

      {/* LD / Accessibility panel (only if included at export) */}
      {includeLD && (
        <section className="mt-4">
          <h2 className="text-lg font-semibold">LD / Accessibility notes</h2>
          <ul className="list-disc pl-5">
            {(teacher.differentiation?.length
              ? teacher.differentiation
              : [
                  "Offer large-print version / high contrast.",
                  "Allow extended time or split tasks into smaller chunks.",
                  "Provide audio support or read-aloud options.",
                ]
            )!.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </section>
      )}

      {!!answersText && (
        <section className="mt-4">
          <h2 className="text-lg font-semibold">Answer key</h2>
          <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded border">
            {answersText}
          </pre>
        </section>
      )}

      {/* Page break before student pack */}
      <div className="page-break" />

      {/* ---- STUDENT PAGES ---- */}
      <section>
        <h1 className="text-2xl font-bold">Student Text</h1>
        <p className="whitespace-pre-wrap leading-relaxed mt-2">
          {result.student_text}
        </p>
      </section>

      <div className="page-break" />

      <section>
        <h1 className="text-2xl font-bold">Exercises</h1>
        {result.exercises?.length ? (
          <ol className="list-decimal pl-6 space-y-2 mt-2">
            {result.exercises.map((ex, i) => (
              <li key={i} className="leading-relaxed">
                <pre className="whitespace-pre-wrap text-sm">
                  {typeof ex === "string" ? ex : JSON.stringify(ex, null, 2)}
                </pre>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm">No exercises returned.</p>
        )}
      </section>

      <footer className="mt-8 text-xs text-gray-600">
        <div>Source: {result.source || "pasted text"}</div>
        <div>{result.credit || "Prepared by [Your Name]"}</div>
      </footer>

      {/* Minimal print styles */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .page-break {
            break-before: page;
            page-break-before: always;
          }
          html, body {
            background: #fff !important;
          }
        }
      `}</style>
    </div>
  );
}








