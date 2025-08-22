import type { NextRequest } from "next/server";

export const runtime = "edge";

type GenResponse = {
  student_text: string;
  exercises: string[];
  source: string;
  credit: string;
  teacher_panel?: any;
};

export async function POST(req: NextRequest) {
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return new Response(JSON.stringify({ error: "SERVER_MISCONFIG", detail: "Missing OPENAI_API_KEY" }), { status: 400 });
    }

    const body = await req.json();
    const input      = (body?.input ?? "").toString().slice(0, 8000).trim();
    const cefr       = (body?.cefr ?? "B2").toString();
    const exam       = (body?.exam ?? "Cambridge B2").toString();
    const inclusive  = !!body?.inclusive;
    const locale     = (body?.locale ?? "IE").toString();
    const schoolType = (body?.schoolType ?? "PUBLIC").toString();

    if (!input) {
      return new Response(JSON.stringify({ error: "VALIDATION", detail: "input is required" }), { status: 400 });
    }

    const dialectRule =
      locale === "IE" ? "Use Irish English conventions (spelling/usage)." :
      locale === "UK" ? "Use British English conventions (spelling/usage)." :
      locale === "US" ? "Use American English conventions (spelling/usage)." :
      locale === "ES" ? "Use Spanish (Spain) for bilingual labels if needed." :
      "";

    const schoolRule =
      schoolType === "DEIS"     ? "Assume DEIS context in Ireland: add scaffolds and sensitive-topic care." :
      schoolType === "PUBLIC"   ? "Assume public/state school context." :
      schoolType === "PRIVATE"  ? "Assume private school context." :
      schoolType === "ADULT_ED" ? "Assume adult education context." : "";

    const inclusiveRule = inclusive
      ? "Apply inclusive-language guidelines; flag bias/stereotypes and propose neutral alternatives."
      : "";

    const prompt = `
You are a careful ELT materials writer.

INPUT:
<<<${input}>>>

Write a JSON object with properties:
- "student_text": ~180–260 words in a neutral tone for ${cefr} level (${exam}) following ${dialectRule}
- "exercises": an array with 2–3 tasks (True/False/Not Given + Short Answer recommended)
- "source": origin label (URL or "pasted text")
- "credit": "Prepared by [Your Name]"
- "teacher_panel": object with:
  - "cefr_rationale"
  - "sensitive_content" (array)
  - "inclusive_language" (array)
  - "differentiation": { "extra_support", "fast_finishers", "ld_support" }
  - "verified_sources" (array)

Context rules:
- ${schoolRule}
- ${inclusiveRule}

JSON only. No markdown or backticks.
`.trim();

    const completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 800
      })
    });

    const raw = await completion.text();
    if (!completion.ok) {
      return new Response(raw, { status: completion.status });
    }

    let parsed: any = {};
    try {
      const outer = JSON.parse(raw);
      const inner = outer?.choices?.[0]?.message?.content ?? "{}";
      parsed = JSON.parse(inner);
    } catch {
      parsed = {};
    }

    const result: GenResponse = {
      student_text: parsed.student_text ?? "Sorry—could not generate.",
      exercises: Array.isArray(parsed.exercises) ? parsed.exercises.slice(0, 6) : [],
      source: parsed.source ?? "pasted text",
      credit: parsed.credit ?? "Prepared by [Your Name]",
      teacher_panel: parsed.teacher_panel ?? undefined,
    };

    return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "SERVER_ERROR", detail: String(err?.message ?? err) }), { status: 500 });
  }
}
