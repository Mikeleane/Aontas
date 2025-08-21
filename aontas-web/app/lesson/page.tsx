"use client";
import React, { useMemo, useState } from "react";
import LessonConfigurator from "./LessonConfigurator";
import { generateLessonStream, splitSections } from "./generateLesson";

export default function LessonPage() {
  const [raw, setRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"student"|"teacher"|"ld">("student");
  const [teacherMode, setTeacherMode] = useState(false);

  async function onSubmit(payload: any) {
    setLoading(true);
    setRaw("");
    try {
      for await (const chunk of generateLessonStream(payload)) {
        setRaw(prev => prev + chunk);
      }
    } finally {
      setLoading(false);
    }
  }

  const sections = useMemo(() => splitSections(raw), [raw]);

  return (
    <div className="grid gap-4 p-6">
      <h1 className="text-xl font-semibold">Lesson Generator</h1>
      <LessonConfigurator onSubmit={onSubmit} />

      <div className="flex items-center gap-3">
        <div className="inline-flex rounded border overflow-hidden">
          <button className={`px-3 py-2 ${tab==="student"?"bg-black text-white":""}`} onClick={()=>setTab("student")}>Student</button>
          <button className={`px-3 py-2 ${tab==="teacher"?"bg-black text-white":""}`} onClick={()=>setTab("teacher")}>Teacher</button>
          <button className={`px-3 py-2 ${tab==="ld"?"bg-black text-white":""}`} onClick={()=>setTab("ld")}>LD</button>
        </div>
        <label className="ml-auto text-sm">
          <input type="checkbox" checked={teacherMode} onChange={e=>setTeacherMode(e.target.checked)} /> Teacher mode
        </label>
      </div>

      <div className="border rounded p-4 min-h-[200px] whitespace-pre-wrap leading-relaxed">
        {loading && <div>Generating…</div>}
        {!loading && tab==="student" && (sections.student || "—")}
        {!loading && tab==="teacher" && (teacherMode ? (sections.teacher || "—") : "Enable Teacher mode to view this panel.")}
        {!loading && tab==="ld" && (sections.ld || "—")}
      </div>
    </div>
  );
}
