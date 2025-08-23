"use client";

import React, { useEffect, useState } from "react";

type AnswerKey = {
  tfng?: string[];
  short_answers?: string[];
  [k: string]: unknown;
};

type TeacherPanel = {
  cefr_rationale?: string;
  sensitive_content?: string[] | string;
  inclusive_notes?: string[] | string;
  differentiation?: string[] | string;
  preteach_vocab?: string[];
  ld_notes?: string[] | string;
  answer_key?: AnswerKey;
  compliance?: string | Record<string, unknown>;
  [k: string]: unknown;
};

type SourceInfo = {
  url?: string;
  title?: string;
  publisher?: string;
  date?: string;
  linkback?: boolean;
};

type TeacherInfo = { name?: string; org?: string; jurisdiction?: string };

type Preview = {
  student_text?: string;
  exercises?: unknown[];
  teacher_panel?: TeacherPanel;
  teacherPanel?: TeacherPanel;
  teacher?: TeacherInfo;
  source?: SourceInfo;
  export?: { page_breaks?: boolean };
  [k: string]: unknown;
};

function asArray(x: unknown): string[] {
  if (!x) return [];
  if (Array.isArray(x)) return x.map(String);
  return [String(x)];
}

function SafeExerciseItem({ ex }: { ex: unknown }) {
  if (typeof ex === "string" || typeof ex === "number") {
    return <li>{String(ex)}</li>;
  }
  if (Array.isArray(ex)) {
    return (
      <li>
        <ul className="list-disc ml-5">
          {ex.map((child, i) => (
            <SafeExerciseItem key={i} ex={child} />
          ))}
        </ul>
      </li>
    );
  }
  if (ex && typeof ex === "object") {
    const obj = ex as Record<string, unknown>;
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
    } = obj;

    return (
      <li>
        <div className="font-medium">{String(task ?? type ?? "Exercise")}</div>

        {prompt && <div className="mb-1">{String(prompt)}</div>}
        {text && <div className="mb-1">{String(text)}</div>}
        {question && <div className="mb-1">Q: {String(question)}</div>}

        {Array.isArray(questions) && questions.length > 0 && (
          <ol className="list-decimal ml-5">
            {questions.map((q, i) => (
              <li key={i}>
                <SafeExerciseItem ex={q} />
              </li>
            ))}
          </ol>
        )}

        {Array.isArray(options) && options.length > 0 && (
          <ul className="list-disc ml-5">
            {options.map((o, i) => (
              <li key={i}>{String(o)}</li>
            ))}
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
  return null;
}

export default function PrintPage() {
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("aontas_preview");
      if (raw) setPreview(JSON.parse(raw));
    } catch {}
  }, []);

  if (!preview) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold mb-2">Nothing to print</h1>
        <p className="mb-4">
          There’s no worksheet in memory. Go back and generate a preview first.
        </p>
        <a className="underline" href="/embed">
          ← Back to generator
        </a>
      </div>
    );
  }

  const tp: TeacherPanel =
    (preview.teacher_panel as TeacherPanel) ??
    (preview.teacherPanel as TeacherPanel) ??
    {};

  const teacher = preview.teacher ?? {};
  const source = preview.source ?? {};
  const today = new Date().toLocaleDateString("en-IE", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  return (
    <div className="p-6 max-w-3xl mx-auto print:p-0">
      {/* Controls (hidden on print) */}
      <div className="mb-4 flex gap-3 no-print">
        <button
          onClick={() => window.print()}
          className="px-3 py-1 rounded border"
        >
          Print
        </button>
        <a href="/embed" className="px-3 py-1 rounded border">
          Back
        </a>
      </div>

      {/* ===== Student worksheet ===== */}
      <h1 className="text-2xl font-bold mb-4">Worksheet (Print)</h1>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">STUDENT WORKSHEET</h2>

        <h3 className="font-medium mb-2">
          Title: Alison Hammond – A Positive Presenter
        </h3>

        <div className="space-y-3 mb-4 whitespace-pre-wrap">
          {preview.student_text
            ? preview.student_text
            : "No student text provided."}
        </div>

        {Array.isArray(preview.exercises) && preview.exercises.length > 0 && (
          <div className="mb-3">
            <h4 className="font-semibold mb-2">Exercises</h4>
            <ul className="list-disc ml-5">
              {preview.exercises.map((ex, i) => (
                <SafeExerciseItem key={i} ex={ex} />
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 text-sm">
          <div className="font-semibold">Attribution</div>
          <div>
            Worksheet adapted for classroom use by{" "}
            <strong>
              {teacher?.name ?? "Teacher Name"}
              {teacher?.org ? ` (${teacher.org})` : ""}
            </strong>{" "}
            — {today}.
          </div>
          <div>
            Where applicable, original article © publisher; used under
            license/quotation for educational purposes.
          </div>
        </div>

        <div className="mt-3 text-sm">
          <div className="font-semibold">Source</div>
          <div>
            <strong>Title:</strong> {source.title ?? "—"}
          </div>
          <div>
            <strong>Publisher:</strong> {source.publisher ?? "—"}
          </div>
          <div>
            <strong>URL:</strong>{" "}
            {source.url ? (
              <a className="underline" href={source.url}>
                {source.url}
              </a>
            ) : (
              "—"
            )}
          </div>
          <div>
            <strong>Date:</strong> {source.date ?? "—"}
          </div>
        </div>
      </section>

      {/* Hard page break */}
      <hr className="page-break my-8" />

      {/* ===== Teacher panel ===== */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">TEACHER PANEL — B1</h2>

        <div className="mb-3">
          <h3 className="font-medium">CEFR rationale</h3>
          <p className="whitespace-pre-wrap">
            {tp.cefr_rationale ??
              "Short biographical/informative text on familiar topics; clear cohesion; high-frequency lexis. Stable for B1; stretch for A2; easy for B2."}
          </p>
        </div>

        <div className="mb-3">
          <h3 className="font-medium">Sensitive-content scan</h3>
          <ul className="list-disc ml-5">
            {asArray(tp.sensitive_content).length > 0 ? (
              asArray(tp.sensitive_content).map((s, i) => <li key={i}>{s}</li>)
            ) : (
              <li>No blocking issues detected.</li>
            )}
          </ul>
        </div>

        <div className="mb-3">
          <h3 className="font-medium">Inclusive-language notes</h3>
          <ul className="list-disc ml-5">
            {asArray(tp.inclusive_notes).length > 0 ? (
              asArray(tp.inclusive_notes).map((s, i) => <li key={i}>{s}</li>)
            ) : (
              <>
                <li>Use person-first phrasing; avoid generalisations.</li>
                <li>
                  Use non-binary pronouns for real people only if they
                  self-identify that way.
                </li>
              </>
            )}
          </ul>
        </div>

        <div className="mb-3">
          <h3 className="font-medium">Suggested differentiation</h3>
          <ul className="list-disc ml-5">
            {asArray(tp.differentiation).length > 0 ? (
              asArray(tp.differentiation).map((s, i) => <li key={i}>{s}</li>)
            ) : (
              <>
                <li>A2: sentence ordering of a shortened text; timeline.</li>
                <li>B1: tasks as set + one inference question.</li>
                <li>B1+/B2: 90–120 word opinion with PEEL scaffold.</li>
              </>
            )}
          </ul>
        </div>

        <div className="mb-3">
          <h3 className="font-medium">Pre-teach vocabulary</h3>
          <ul className="list-disc ml-5">
            {(tp.preteach_vocab ?? [
              "presenter",
              "cheerful",
              "reality show",
              "interview",
              "positivity",
              "relatable",
              "diverse backgrounds",
              "role model",
              "embrace (an idea)",
              "achieve (goals)",
            ]).map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        </div>

        <div className="mb-3">
          <h3 className="font-medium">LD notes</h3>
          <ul className="list-disc ml-5">
            {asArray(tp.ld_notes).length > 0 ? (
              asArray(tp.ld_notes).map((s, i) => <li key={i}>{s}</li>)
            ) : (
              <>
                <li>12–14pt sans serif, 1.5 spacing; left aligned.</li>
                <li>Chunk into 3–4 sections with sub-headings.</li>
                <li>Gloss low-frequency words; offer TTS; word banks.</li>
              </>
            )}
          </ul>
        </div>

        <div className="mb-3">
          <h3 className="font-medium">Answer key</h3>
          <div className="mb-2">
            <strong>True/False/Not Given:</strong>
            <ul className="list-disc ml-5">
              {(tp.answer_key?.tfng ?? [
                "1) False — started on a reality show (Big Brother).",
                "2) True — laughter helps in difficult times.",
                "3) False — known for a cheerful personality.",
              ]).map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
          <div>
            <strong>Short answers:</strong>
            <ul className="list-disc ml-5">
              {(tp.answer_key?.short_answers ?? [
                "Big Brother (2002).",
                "It helps people through difficult times.",
                "By connecting with her audience and sharing experiences.",
              ]).map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 text-sm">
          <h3 className="font-medium">Source verification & compliance</h3>
          <p>
            Teacher: <strong>{teacher?.name ?? "—"}</strong>
            {teacher?.org ? ` (${teacher.org})` : ""} — Jurisdiction:{" "}
            <strong>{teacher?.jurisdiction ?? "—"}</strong>.
          </p>
          <p>
            Source:{" "}
            <strong>{source.title ?? "—"}</strong>
            {source.publisher ? ` — ${source.publisher}` : ""}{" "}
            {source.date ? ` — ${source.date}` : ""}{" "}
            {source.url ? (
              <>
                —{" "}
                <a className="underline" href={source.url}>
                  {source.url}
                </a>
              </>
            ) : null}
          </p>
          <p>
            If third-party text is used, ensure linkback and local
            quotation/reproduction limits are observed.
          </p>
        </div>
      </section>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .page-break {
            break-before: page;
            page-break-before: always;
            border: 0;
            height: 0;
            margin: 0;
            padding: 0;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
