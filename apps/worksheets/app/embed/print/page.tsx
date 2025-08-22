"use client";
import React, { useEffect, useState } from "react";
import TeacherPanel from "../TeacherPanel";

type Exercise = { type: string; prompt?: string; items?: any[] };
type GenResponse = {
  student_text?: string;
  exercises?: Exercise[];
  // teacher fields (may or may not be present)
  cefr_rationale?: string;
  sensitive_flags?: string[];
  inclusive_notes?: string[];
  differentiation?: string[];
  preteach_vocab?: string[];
  answer_key?: string[];
  sources?: { title?: string; url: string }[];
};

export default function PrintPage() {
  const [data, setData] = useState<GenResponse | null>(null);
  const [includeLD, setIncludeLD] = useState<boolean>(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("aontasExport");
      if (raw) {
        const parsed = JSON.parse(raw);
        setData(parsed.result ?? parsed); // support either {result,...} or plain
        setIncludeLD(!!parsed.includeLD);
      }
    } catch {}
  }, []);

  if (!data) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold mb-2">Nothing to export</h1>
        <p>Open the generator, click <em>Export</em>—then you can print or save as PDF.</p>
      </div>
    );
  }

  return (
    <div className="p-8 print:p-0">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page-break { page-break-before: always; break-before: page; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .title { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
        .subtle { color: #555; }
      `}</style>

      <div className="no-print mb-4 flex gap-3">
        <button onClick={() => window.print()} className="px-3 py-2 rounded bg-black text-white">
          Print / Save PDF
        </button>
      </div>

      {/* Student view */}
      <section>
        <div className="title">Student Text</div>
        <div className="whitespace-pre-wrap">{data.student_text || "—"}</div>

        {data.exercises?.length ? (
          <div className="mt-6">
            <div className="title">Exercises</div>
            {data.exercises.map((ex, i) => (
              <div key={i} className="mb-4">
                <div className="font-semibold">{ex.type}</div>
                {ex.prompt ? <div className="mb-1">{ex.prompt}</div> : null}
                {/* Keep simple; students print their sheet without answers */}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* Teacher panel on a new page */}
      <section className="page-break mt-6">
        <TeacherPanel data={data} />
        {includeLD ? (
          <div className="mt-8">
            <h3 className="font-semibold text-lg mb-1">Learning Diversity (LD) Notes</h3>
            <p className="subtle">
              (Include your LD guidance here—this block is shown because “LD panel” was selected before export.)
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
