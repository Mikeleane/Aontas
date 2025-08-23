"use client";
import React, { useEffect, useState } from "react";

type Props = { onPayloadChange: (obj: any) => void };

export default function AdvancedPanel({ onPayloadChange }: Props) {
  const [raw, setRaw] = useState<string>("{}");
  const [ok, setOk] = useState(true);

  useEffect(() => {
    try {
      const obj = raw.trim() ? JSON.parse(raw) : {};
      setOk(true);
      onPayloadChange(obj);
    } catch {
      setOk(false);
      onPayloadChange({});
    }
  }, [raw]);

  return (
    <details className="mt-3">
      <summary className="cursor-pointer">Advanced (JSON) – optional</summary>
      <p className="text-sm mt-2">
        Paste extra request fields to send with <code>/api/generate</code>. Example:
      </p>
      <pre className="text-xs bg-gray-50 p-2 rounded">
{`{
  "path": "public",
  "country": "IE",
  "schoolYear": "1st Year (Junior Cycle)",
  "curriculumTaskType": "Reading comprehension",
  "includeLD": true,
  "teacherName": "Ms. Murphy",
  "outputLanguage": "en",
  "studentProfile": "teen",
  "exam": { "provider": "Cambridge", "level": "B2", "task": "Reading Part 5" },
  "grammarPoints": ["past modals", "passive voice"],
  "vocabInclude": "public speaking; feedback",
  "locale": "IE"
}`}
      </pre>
      <textarea
        className="w-full h-28 border p-2 font-mono text-sm mt-2"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="{}"
      />
      <div className={`text-xs mt-1 ${ok ? "text-green-700" : "text-red-700"}`}>
        {ok ? "Valid JSON" : "Invalid JSON"}
      </div>
    </details>
  );
}
