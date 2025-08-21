"use client";
import React, { useMemo, useState } from "react";
import { CEFR, EXAM_QUESTION_TYPES, PUBLIC_SCHOOL, type Payload, type OutputLanguage } from "./learning";

export default function LessonConfigurator({ onSubmit }: { onSubmit: (p: Payload)=>void }) {
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>("en");
  const [publicSchool, setPublicSchool] = useState(false);
  const [country, setCountry] = useState<"IE"|"ES">("IE");
  const [year, setYear] = useState(PUBLIC_SCHOOL["IE"].years[0]);
  const [cefr, setCefr] = useState<typeof CEFR[number]>("B1");
  const [examType, setExamType] = useState<keyof typeof EXAM_QUESTION_TYPES>("Cambridge");
  const [questionTypes, setQuestionTypes] = useState<string[]>([]);
  const [topic, setTopic] = useState("");
  const [ldSupport, setLdSupport] = useState(false);

  const availableQTypes = useMemo(() => EXAM_QUESTION_TYPES[examType] ?? [], [examType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Payload = publicSchool
      ? { outputLanguage, publicSchool, school: { country, year }, topic, ldSupport }
      : { outputLanguage, publicSchool, exam: { cefr, type: examType, questionTypes }, topic, ldSupport };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div>
        <label>Output language</label>
        <select value={outputLanguage} onChange={e=>setOutputLanguage(e.target.value as OutputLanguage)}>
          <option value="ga">Irish (Gaeilge)</option>
          <option value="en">English</option>
          <option value="es">Spanish (Español)</option>
        </select>
      </div>

      <div>
        <label><input type="checkbox" checked={publicSchool} onChange={e=>setPublicSchool(e.target.checked)} /> Public school content</label>
      </div>

      {publicSchool ? (
        <>
          <div>
            <label>Country</label>
            <select value={country} onChange={e=>{const c=e.target.value as "IE"|"ES"; setCountry(c); setYear(PUBLIC_SCHOOL[c].years[0]);}}>
              {Object.entries(PUBLIC_SCHOOL).map(([code, cfg])=>(
                <option key={code} value={code}>{cfg.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label>School year</label>
            <select value={year} onChange={e=>setYear(e.target.value)}>
              {PUBLIC_SCHOOL[country].years.map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </>
      ) : (
        <>
          <div>
            <label>CEFR level</label>
            <select value={cefr} onChange={e=>setCefr(e.target.value as any)}>
              {CEFR.map(l=><option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label>Exam type</label>
            <select value={examType} onChange={e=>{setExamType(e.target.value as any); setQuestionTypes([]);}}>
              {Object.keys(EXAM_QUESTION_TYPES).map(ex=><option key={ex} value={ex}>{ex}</option>)}
            </select>
          </div>
          <div>
            <label>Question types</label>
            <select multiple value={questionTypes} onChange={e=>setQuestionTypes(Array.from(e.currentTarget.selectedOptions).map(o=>o.value))}>
              {availableQTypes.map(q=> <option key={q} value={q}>{q}</option>)}
            </select>
            <small>Select one or more.</small>
          </div>
        </>
      )}

      <div>
        <label>Topic / brief</label>
        <input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="e.g., Renewable energy for teens" />
      </div>

      <div>
        <label><input type="checkbox" checked={ldSupport} onChange={e=>setLdSupport(e.target.checked)} /> Learning difficulties adaptation</label>
      </div>

      <button type="submit">Generate</button>
    </form>
  );
}
