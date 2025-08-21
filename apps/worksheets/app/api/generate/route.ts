export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type GenResponse = {
  student_text: string;
  exercises: any[];
  source: string;
  credit: string;
  teacher_panel?: any;
};

export async function POST(req: Request) {
  // Safe parse of incoming JSON
  let body: any = {};
  try { body = await req.json(); } catch {}
  const {
    input = "",
    cefr = "B2",
    exam = "Cambridge B2",
    inclusive = true,
    locale = "IE",
  } = body || {};

  if (!input?.trim()) {
    return new Response(JSON.stringify({ error: "Missing input" }), { status: 400 });
  }

  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  if (!key) {
    return new Response(
      JSON.stringify({ error: "SERVER_MISCONFIG", detail: "Missing OPENAI_API_KEY" }),
      { status: 500 }
    );
  }

  const system =
    `You are an English language worksheet generator. Return ONLY JSON with keys:
- student_text (180–260 words, neutral tone)
- exercises (2–6 items, e.g., "Reading: True/False/Not Given (5)", "Short Answer (3)")
- source ("pasted text" or URL)
- credit ("Prepared by [Your Name]")
- teacher_panel (object with: cefr_rationale, sensitive_flags, inclusive_language_notes, differentiation, sources)
No markdown, no backticks, no commentary.`;

  const userPayload = {
    input,
    cefr,
    exam,
    inclusive,
    locale,
  };

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
    }),
  });

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: `Upstream ${upstream.status}`, detail }),
      { status: 502 }
    );
  }

  let content = "{}";
  try {
    const data = await upstream.json();
    content = data?.choices?.[0]?.message?.content ?? "{}";
  } catch {
    content = "{}";
  }

  let parsed: Partial<GenResponse> = {};
  try { parsed = JSON.parse(content); } catch {}

  const result: GenResponse = {
    student_text: parsed.student_text ?? "Sorry—could not generate.",
    exercises: Array.isArray(parsed.exercises) ? parsed.exercises.slice(0, 6) : [],
    source: parsed.source ?? "pasted text",
    credit: parsed.credit ?? "Prepared by [Your Name]",
    teacher_panel: parsed.teacher_panel ?? undefined,
  };

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
}
