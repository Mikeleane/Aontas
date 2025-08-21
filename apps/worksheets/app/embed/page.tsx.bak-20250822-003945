"use client";
import React, { useEffect, useState } from "react";

type TeacherPanel = {
  cefr_rationale: string;
  sensitive_flags: string[];
  inclusive_notes: string[];
  differentiation: string[];
  source_notes?: string;
};

type SourceVerification = {
  url: string;
  score: number;
  verdict: "likely_original" | "reputable" | "aggregation" | "unknown";
  checks: {
    is_https: boolean;
    has_canonical: boolean;
    has_og: boolean;
    has_date_meta: boolean;
    word_count: number;
    link_count: number;
    domain: string;
    tld_ok: boolean;
  };
  notes?: string;
};

type GenResponse = {
  student_text: string;
  exercises: string[];
  source?: string;
  credit?: string;
  teacher_panel: TeacherPanel;
  source_verification?: SourceVerification;
};

export default function EmbedPage() {
  const [includeLD, setIncludeLD] = useState(true);
  const [cefr, setCefr] = useState<"A2"|"B1"|"B2"|"C1">("B1");
  const [exam, setExam] = useState("Cambridge B2");
  const [inclusive, setInclusive] = useState(true);
  const [note, setNote] = useState("");
  const [data, setData] = useState<GenResponse | null>(null);
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (!input.trim()) { setNote("Please paste text or a URL."); return; }
    setNote("Generating…"); setBusy(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, cefr, exam, inclusive, locale: "IE" })
      });
      const text = await res.text();
      if (!res.ok) { setNote(`Server ${res.status}: ${text.slice(0,160)}`); return; }
      const json: GenResponse = JSON.parse(text);
      setData(json);
      const ver = res.headers.get("x-gen-version") || "unknown";
      setNote(ver.startsWith("fallback") ? "Preview ready (fallback mode)." : "Preview ready.");
      setTimeout(() => {
        window.parent?.postMessage({ type: "resize", height: document.body.scrollHeight }, "*");
      }, 50);
    } catch {
      setNote("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    window.parent?.postMessage({ type: "resize", height: document.body.scrollHeight }, "*");
  });

  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="text-2xl font-semibold mb-3">LevelUp — Worksheet Generator</h1>

      <label className="block font-medium mt-2">Source text or URL</label>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full min-h-[140px] border rounded-lg p-2"
        placeholder="Paste article text or a link…"
      />

      <div className="flex gap-3 my-3 flex-wrap items-center">
        <label>CEFR
          <select value={cefr} onChange={(e)=>setCefr(e.target.value as any)} className="ml-2 border rounded-lg p-1">
            <option>A2</option><option>B1</option><option>B2</option><option>C1</option>
          </select>
        </label>
        <label>Exam
          <select value={exam} onChange={(e)=>setExam(e.target.value)} className="ml-2 border rounded-lg p-1">
            <option>Cambridge B1</option>
            <option>Cambridge B2</option>
            <option>Cambridge C1</option>
            <option>IELTS Academic</option>
          </select>
        </label>
        <label className="ml-auto">
          <input type="checkbox" checked={inclusive} onChange={(e)=>setInclusive(e.target.checked)} className="mr-1"/>
          Inclusive profile
        </label>
      </div>

      <button
        onClick={generate}
        disabled={busy}
        className={`rounded-lg px-4 py-2 ${busy ? "bg-gray-500 cursor-not-allowed" : "bg-black text-white"}`}
        type="button"
      >
        {busy ? "Working…" : "Generate preview"}
<div className="flex items-center gap-3 my-3">
  <label className="flex items-center gap-2">
    <input type="checkbox" checked={includeLD} onChange={(e)=>setIncludeLD(e.target.checked)} />
    Include LD panel in export
  </label>

  <button
    onClick={async () => {
      if (!data) { setNote("Generate first."); return; }
      setNote("Building DOCX…");
      const res = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ data, includeLD })
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "worksheet.docx"; a.click();
      URL.revokeObjectURL(url);
      setNote("DOCX downloaded.");
    }}
    className="rounded-lg px-3 py-2 border"
    type="button"
  >
    Export DOCX
  </button>

  <button
    onClick={async () => {
      if (!data) { setNote("Generate first."); return; }
      setNote("Building PDF…");
      const res = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ data, includeLD })
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "worksheet.pdf"; a.click();
      URL.revokeObjectURL(url);
      setNote("PDF downloaded.");
    }}
    className="rounded-lg px-3 py-2 border"
    type="button"
  >
    Export PDF
  </button>
</div>

      </button>
      <div className="text-sm mt-2">{note}</div>

      {data && (
        <div className="mt-6 grid md:grid-cols-5 gap-6">
          {/* Student output */}
          <section className="md:col-span-3 border rounded-xl p-4">
            <h3 className="text-lg font-semibold">Student text (preview)</h3>
            <p className="whitespace-pre-line mt-2">{data.student_text}</p>
            <h4 className="mt-4 font-semibold">Exercises</h4>
            <ol className="list-decimal pl-6">
              {(data.exercises ?? []).map((x, i) => <li key={i}>{x}</li>)}
            </ol>
            <div className="text-xs text-gray-600 mt-3">
              Source: {data.source ?? "—"} • {data.credit ?? ""}
            </div>
          </section>

          {/* Teacher Panel */}
          <aside className="md:col-span-2 border rounded-xl p-4 bg-gray-50">
            <h3 className="text-lg font-semibold">Teacher Panel</h3>

<div className="mt-3">
  <h4 className="font-medium">Pre-teach vocabulary</h4>
  <ul className="list-disc pl-5 text-sm">
    {(data.teacher_panel?.preteach_vocab ?? []).map((w,i)=> <li key={i}>{w}</li>)}
  </ul>
</div>

<div className="mt-3">
  <h4 className="font-medium">Answer key</h4>
  <ul className="list-decimal pl-5 text-sm">
    {(data.answer_key ?? []).map((a,i)=> <li key={i}>{a}</li>)}
  </ul>
</div>


            <div className="mt-3">
              <h4 className="font-medium">CEFR rationale</h4>
              <p className="text-sm mt-1">{data.teacher_panel?.cefr_rationale || "—"}</p>
            </div>

            <div className="mt-3">
              <h4 className="font-medium">Sensitive content flags</h4>
              <div className="flex flex-wrap gap-1 mt-1">
                {(data.teacher_panel?.sensitive_flags ?? []).length
                  ? data.teacher_panel.sensitive_flags.map((f,i)=>(
                      <span key={i} className="text-xs bg-amber-200 rounded px-2 py-[2px]">{f}</span>
                    ))
                  : <span className="text-sm">None detected.</span>}
              </div>
            </div>

            <div className="mt-3">
              <h4 className="font-medium">Inclusive-language notes</h4>
              <ul className="list-disc pl-5 text-sm">
                {(data.teacher_panel?.inclusive_notes ?? []).map((n,i)=> <li key={i}>{n}</li>)}
              </ul>
            </div>

            <div className="mt-3">
              <h4 className="font-medium">Differentiation</h4>
              <ul className="list-disc pl-5 text-sm">
                {(data.teacher_panel?.differentiation ?? []).map((n,i)=> <li key={i}>{n}</li>)}
              </ul>
            </div>

            {data.teacher_panel?.source_notes && (
              <div className="mt-3">
                <h4 className="font-medium">Source notes</h4>
                <p className="text-sm mt-1">{data.teacher_panel.source_notes}</p>
              </div>
            )}

            {/* Source verification */}
            {data.source_verification && (
              <div className="mt-4 border-t pt-3">
                <h4 className="font-medium">Source verification</h4>
                <p className="text-sm mt-1">
                  <span className="font-semibold">{data.source_verification.verdict}</span>
                  {` • score ${data.source_verification.score}/100`}
                </p>
                <p className="text-xs text-gray-600">Domain: {data.source_verification.checks.domain}</p>
                <ul className="text-xs mt-1">
                  <li>HTTPS: {String(data.source_verification.checks.is_https)}</li>
                  <li>Canonical: {String(data.source_verification.checks.has_canonical)}</li>
                  <li>OG meta: {String(data.source_verification.checks.has_og)}</li>
                  <li>Date meta: {String(data.source_verification.checks.has_date_meta)}</li>
                  <li>Word count: {data.source_verification.checks.word_count}</li>
                  <li>Links on page: {data.source_verification.checks.link_count}</li>
                </ul>
                {data.source_verification.notes && (
                  <p className="text-xs text-gray-600 mt-1">{data.source_verification.notes}</p>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
