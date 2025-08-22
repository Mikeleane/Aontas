"use client";
import React from "react";

type SourceLink = { title?: string; url: string };
type TeacherData = {
  cefr_rationale?: string;
  sensitive_flags?: string[];
  inclusive_notes?: string[];
  differentiation?: string[];
  preteach_vocab?: string[];
  answer_key?: string[];
  sources?: SourceLink[];
};

export default function TeacherPanel({ data }: { data: TeacherData }) {
  const section = (title: string, body?: React.ReactNode) =>
    body ? (
      <section className="mb-5">
        <h3 className="font-semibold text-lg mb-1">{title}</h3>
        <div className="prose prose-sm">{body}</div>
      </section>
    ) : null;

  const list = (items?: (string | React.ReactNode)[]) =>
    items && items.length ? (
      <ul className="list-disc ml-5">{items.map((it, i) => <li key={i}>{it}</li>)}</ul>
    ) : null;

  return (
    <div>
      <h2 className="text-xl font-bold mb-3">Teacher Panel</h2>
      {section("CEFR rationale", data.cefr_rationale)}
      {section("Sensitive content flags", list(data.sensitive_flags))}
      {section("Inclusive-language notes", list(data.inclusive_notes))}
      {section("Suggested differentiation", list(data.differentiation))}
      {section("Pre-teach vocabulary", list(data.preteach_vocab))}
      {section("Answer key", list(data.answer_key))}
      {section("Sources",
        data.sources && data.sources.length ? (
          <ol className="list-decimal ml-5">
            {data.sources.map((s, i) => (
              <li key={i}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.title || s.url}
                </a>
              </li>
            ))}
          </ol>
        ) : null
      )}
    </div>
  );
}
