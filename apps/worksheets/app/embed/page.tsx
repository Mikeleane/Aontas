"use client";
import React, { useEffect, useState } from "react";

type GenResponse = { student_text: string; exercises: string[]; source?: string; credit?: string };

export default function EmbedPage() {
  const [input, setInput] = useState("");
  const [cefr, setCefr] = useState("B1");
  const [exam, setExam] = useState("Cambridge B2");
  const [inclusive, setInclusive] = useState(true);
  const [note, setNote] = useState("");
  const [data, setData] = useState<GenResponse | null>(null);

async function generate() {
  if (!input.trim()) { setNote("Please paste text or a URL."); return; }
  setNote("Generating…");
  (document.querySelector("button[type=button]") as HTMLButtonElement)?.setAttribute("disabled","true");

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, cefr, exam, inclusive, locale: "IE" })
    });

    const text = await res.text();

    if (!res.ok) {
      // show a clear, friendly message; no JSON parsing
      setNote(`Server ${res.status}: ${text || "Please wait ~30s and try again."}`);
      return;
    }

    // success path: parse JSON
    const json: GenResponse = JSON.parse(text);
    setData(json);
    setNote("Preview ready.");

    setTimeout(() => window.parent?.postMessage({ type: "resize", height: document.body.scrollHeight }, "*"), 50);
  } catch (e) {
    setNote("Network error. Please try again.");
  } finally {
    (document.querySelector("button[type=button]") as HTMLButtonElement)?.removeAttribute("disabled");
  }
}


  useEffect(() => {
    window.parent?.postMessage({ type:"resize", height: document.body.scrollHeight }, "*");
  });

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-semibold mb-3">LevelUp — Worksheet Generator</h1>
      <label className="block font-medium mt-2">Source text or URL</label>
      <textarea value={input} onChange={(e)=>setInput(e.target.value)} className="w-full min-h-[140px] border rounded-lg p-2" />
      <div className="flex gap-3 my-3 flex-wrap">
        <label>CEFR
          <select value={cefr} onChange={(e)=>setCefr(e.target.value)} className="ml-2 border rounded-lg p-1">
            <option>A2</option><option>B1</option><option>B2</option><option>C1</option>
          </select>
        </label>
        <label>Exam
          <select value={exam} onChange={(e)=>setExam(e.target.value)} className="ml-2 border rounded-lg p-1">
            <option>Cambridge B1</option><option>Cambridge B2</option>
            <option>Cambridge C1</option><option>IELTS Academic</option>
          </select>
        </label>
        <label className="ml-auto"><input type="checkbox" checked={inclusive} onChange={(e)=>setInclusive(e.target.checked)} className="mr-1" />Inclusive profile</label>
      </div>
      <button onClick={generate} className="bg-black text-white rounded-lg px-4 py-2">Generate preview</button>
      <div className="text-sm mt-2">{note}</div>
      {data && (
        <div className="mt-4 border-t pt-3">
          <h3 className="text-lg font-semibold">Student text (preview)</h3>
          <p className="whitespace-pre-line">{data.student_text}</p>
          <h4 className="mt-3 font-semibold">Exercises</h4>
          <ol className="list-decimal pl-6">{data.exercises.map((x,i)=><li key={i}>{x}</li>)}</ol>
          <div className="text-xs text-gray-600 mt-2">Source: {data.source ?? "—"} • {data.credit ?? ""}</div>
        </div>
      )}
    </main>
  );
}
