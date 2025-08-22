"use client";
import React, { useState } from "react";

type Preview = {
  student_text?: string;
  exercises?: any[];
  source?: string;
  credit?: string;
  teacher_panel?: any;
};

export default function ClientEmbed() {
  const [input, setInput] = useState("");
  const [cefr, setCefr] = useState("B2");
  const [exam, setExam] = useState("Cambridge B2");
  const [inclusive, setInclusive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

// below your useState hooks, inside the ClientEmbed component
const handleExport = React.useCallback(() => {
  if (!result) return; // only export after a worksheet exists
  try {
    sessionStorage.setItem(
      "aontasExport",
      JSON.stringify({ result, includeLD }) // includeLD is your LD toggle
    );
  } catch {}
  window.open("/embed/print", "_blank"); // or: location.href = "/embed/print"
}, [result, includeLD]);


  async function onGenerate() {
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, cefr, exam, inclusive, locale: "IE" }),
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`Server ${res.status}: ${text}`);
      }
      const data = JSON.parse(text);
      setPreview(data);
    } catch (e:any) {
      setError(e?.message ?? "Unexpected error");
    } finally {
      setLoading(false);
      // auto-resize when embedded in iframes
      try {
        window.parent?.postMessage({ type: "resize", height: document.body.scrollHeight }, "*");
      } catch {}
    }
  }

  return (
    <div className="p-4 max-w-3xl mx-auto font-sans">
      <h1 className="text-2xl font-semibold mb-4">LevelUp — Worksheet Generator</h1>

      <label className="block text-sm mb-1">Source text or URL</label>
      <textarea
        className="w-full border rounded p-2 h-40 mb-3"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste text or a URL…"
      />

      <div className="flex gap-3 items-center mb-3">
        <div>
          <label className="block text-sm mb-1">CEFR</label>
          <select className="border rounded p-2" value={cefr} onChange={(e)=>setCefr(e.target.value)}>
            {["A2","B1","B2","C1","C2"].map(l=> <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Exam</label>
          <select className="border rounded p-2" value={exam} onChange={(e)=>setExam(e.target.value)}>
            {["Cambridge B1","Cambridge B2","Cambridge C1","IELTS","TOEFL"].map(x=> <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 mt-6">
          <input type="checkbox" checked={inclusive} onChange={(e)=>setInclusive(e.target.checked)} />
          Inclusive profile
        </label>
      </div>
<div className="flex gap-2 mt-3">
  <button
    type="button"
    onClick={onGenerate}  // your existing generate handler
    className="px-3 py-2 rounded border"
  >
    Generate preview
  </button>

  <button
    type="button"
    onClick={handleExport}
    disabled={!result}
    className="px-3 py-2 rounded bg-black text-white disabled:opacity-40"
  >
    Export (PDF/Print)
  </button>
</div>

      <button
        onClick={onGenerate}
        disabled={loading || !input.trim()}
        className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
      >
        {loading ? "Generating…" : "Generate preview"}
      </button>

      {error && (
        <p className="mt-4 text-red-600 text-sm whitespace-pre-wrap">Error: {error}</p>
      )}

      {preview && (
        <div className="mt-6 border rounded p-4 bg-white">
          <h2 className="font-semibold mb-2">Student text (preview)</h2>
          <p className="whitespace-pre-wrap text-sm">{preview.student_text ?? "(empty)"}</p>

          <h3 className="font-semibold mt-4 mb-2">Exercises</h3>
          <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
{JSON.stringify(preview.exercises ?? [], null, 2)}
          </pre>

          <p className="text-xs text-gray-500 mt-3">
            Source: {preview.source ?? "pasted text"} • {preview.credit ?? "Prepared by [Your Name]"}
          </p>
        </div>
      )}
    </div>
  );
}
