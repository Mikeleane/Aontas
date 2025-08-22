"use client";

import React, { useCallback, useMemo, useState } from "react";

/* ---------- Types that match the API shape (flexible / optional-safe) ---------- */

type TeacherPanel = {
  cefr_rationale?: string;
  sensitive_flags?: string[];
  inclusive_notes?: string[];
  differentiation?: string[];
  sources?: string[]; // verified sources / references
  preteach_vocab?: string[]; // optional: for teacher panel
  answers?: Record<string, unknown> | string; // optional: keys/solutions
};

type GenResponse = {
  student_text: string;
  exercises: any[];              // exercises as returned by the API
  source?: string;               // URL or "pasted text"
  credit?: string;               // "Prepared by …"
  teacher?: TeacherPanel;        // teacher-panel sidecar
};

/* ---------- Small helpers ---------- */

function isJsonResponse(res: Response) {
  const ct = res.headers.get("content-type") || "";
  return ct.toLowerCase().includes("application/json");
}

const CEFR_LEVELS = ["A2", "B1", "B2", "C1", "C2"] as const;
const EXAMS = [
  "Cambridge B1",
  "Cambridge B2",
  "Cambridge C1",
  "IELTS",
  "TOEFL",
] as const;

/* ---------- Component ---------- */

export default function ClientEmbed() {
  // form state
  const [sourceText, setSourceText] = useState<string>("");
  const [cefr, setCefr] = useState<(typeof CEFR_LEVELS)[number]>("B2");
  const [exam, setExam] = useState<(typeof EXAMS)[number]>("Cambridge B2");
  const [inclusive, setInclusive] = useState<boolean>(true);
  const [locale, setLocale] = useState<string>("IE");

  // result state
  const [result, setResult] = useState<GenResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canExport = !!result;

  const teacher = result?.teacher ?? {};

  /* ---------- Handlers ---------- */

  const onGenerate = useCallback(async () => {
    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: sourceText?.trim() || "",
          cefr,
          exam,
          inclusive,
          locale,
        }),
      });

      if (!res.ok) {
        // Try to surface server text if non-JSON (e.g., upstream 503/504…)
        const msg = isJsonResponse(res)
          ? (await res.json())?.error || `Server ${res.status}`
          : await res.text();
        throw new Error(
          typeof msg === "string" ? msg : `Server ${res.status}`
        );
      }

      const data: GenResponse = await res.json();
      // A tiny safety net to ensure the fields exist:
      setResult({
        student_text: data?.student_text ?? "Sorry—could not generate.",
        exercises: Array.isArray(data?.exercises) ? data.exercises.slice(0, 6) : [],
        source: data?.source ?? "pasted text",
        credit: data?.credit ?? "Prepared by [Your Name]",
        teacher: data?.teacher ?? {},
      });
    } catch (e: any) {
      setError(e?.message || "Generation failed");
    } finally {
      setBusy(false);
    }
  }, [sourceText, cefr, exam, inclusive, locale]);

  const onReset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const handleExport = useCallback(() => {
    if (!result) return;
    try {
      // The print page (apps/worksheets/app/embed/print/page.tsx) can read this:
      sessionStorage.setItem(
        "aontasExport",
        JSON.stringify({ result, includeLD: inclusive, cefr, exam, locale })
      );
    } catch {
      // ignore quota/private mode errors
    }
    window.open("/embed/print", "_blank", "noopener,noreferrer");
  }, [result, inclusive, cefr, exam, locale]);

  /* ---------- Render helpers (simple / resilient) ---------- */

  const ExerciseList = useMemo(() => {
    if (!result?.exercises?.length) return null;
    return (
      <ol className="list-decimal pl-6 space-y-2">
        {result.exercises.map((ex, i) => (
          <li key={i} className="leading-relaxed">
            {/* Render defensively: exercise may be string or object */}
            <pre className="whitespace-pre-wrap text-sm">
              {typeof ex === "string" ? ex : JSON.stringify(ex, null, 2)}
            </pre>
          </li>
        ))}
      </ol>
    );
  }, [result]);

  /* ---------- UI ---------- */

  return (
    <div className="grid gap-4">
      {/* INPUTS */}
      <div className="grid gap-3">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Source text or URL</span>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Paste source text or a URL…"
            className="w-full h-40 rounded border p-2 outline-none focus:ring"
          />
        </label>

        <div className="flex flex-wrap gap-3 items-end">
          <label className="space-y-1">
            <span className="text-sm font-medium">CEFR</span>
            <select
              value={cefr}
              onChange={(e) => setCefr(e.target.value as any)}
              className="block rounded border px-2 py-1"
            >
              {CEFR_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium">Exam</span>
            <select
              value={exam}
              onChange={(e) => setExam(e.target.value as any)}
              className="block rounded border px-2 py-1 min-w-[12rem]"
            >
              {EXAMS.map((ex) => (
                <option key={ex} value={ex}>
                  {ex}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium">Locale</span>
            <input
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="block rounded border px-2 py-1 w-24"
              placeholder="IE"
            />
          </label>

          <label className="flex items-center gap-2 ml-2">
            <input
              type="checkbox"
              checked={inclusive}
              onChange={(e) => setInclusive(e.target.checked)}
            />
            <span className="text-sm">Inclusive profile</span>
          </label>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onGenerate}
            disabled={busy}
            className="rounded border px-3 py-2 disabled:opacity-50"
          >
            {busy ? "Generating…" : "Generate preview"}
          </button>

          <button
            onClick={onReset}
            disabled={busy || !result}
            className="rounded border px-3 py-2 disabled:opacity-50"
          >
            Reset preview
          </button>

          <button
            onClick={handleExport}
            disabled={!canExport}
            className="rounded bg-black text-white px-3 py-2 disabled:opacity-40"
            title={canExport ? "Open printable view" : "Generate first"}
          >
            Export (PDF/Print)
          </button>
        </div>

        {error && (
          <p className="text-red-600 text-sm">
            {error}
          </p>
        )}
      </div>

      {/* PREVIEW */}
      {result && (
        <div className="grid gap-6 border rounded p-4 bg-white">
          {/* Teacher Panel (compact preview) */}
          <section className="space-y-2">
            <h3 className="text-lg font-semibold">Teacher Panel (preview)</h3>

            {teacher.cefr_rationale && (
              <div>
                <p className="text-sm font-medium">CEFR rationale</p>
                <p className="text-sm whitespace-pre-wrap">
                  {teacher.cefr_rationale}
                </p>
              </div>
            )}

            {!!teacher.sensitive_flags?.length && (
              <div>
                <p className="text-sm font-medium">Flagged sensitive content</p>
                <ul className="list-disc pl-5 text-sm">
                  {teacher.sensitive_flags.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            )}

            {!!teacher.inclusive_notes?.length && (
              <div>
                <p className="text-sm font-medium">Inclusive-language notes</p>
                <ul className="list-disc pl-5 text-sm">
                  {teacher.inclusive_notes.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            )}

            {!!teacher.differentiation?.length && (
              <div>
                <p className="text-sm font-medium">Suggested differentiation</p>
                <ul className="list-disc pl-5 text-sm">
                  {teacher.differentiation.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            )}

            {!!teacher.sources?.length && (
              <div>
                <p className="text-sm font-medium">Verified sources</p>
                <ul className="list-disc pl-5 text-sm">
                  {teacher.sources.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <hr />

          {/* Student text */}
          <section className="space-y-2">
            <h3 className="text-lg font-semibold">Student text (preview)</h3>
            <p className="whitespace-pre-wrap leading-relaxed">
              {result.student_text}
            </p>
          </section>

          {/* Exercises */}
          <section className="space-y-2">
            <h3 className="text-lg font-semibold">Exercises</h3>
            {ExerciseList ?? <p className="text-sm">No exercises returned.</p>}
          </section>

          {/* Footer / source */}
          <section className="text-xs text-gray-600">
            <div>Source: {result.source || "pasted text"}</div>
            <div>{result.credit || "Prepared by [Your Name]"}</div>
          </section>
        </div>
      )}
    </div>
  );
}

