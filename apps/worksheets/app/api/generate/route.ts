export const runtime = "edge"; // fast, serverless

export async function POST(req: Request) {
  const { input = "", cefr = "B1", exam = "Cambridge B2", inclusive = true, locale = "IE" } =
    await req.json().catch(() => ({}));

  const text = typeof input === "string" ? input : "";
  // TODO: replace this stub with your real model call when ready
  const student_text =
    `(${cefr} • ${exam} • ${locale}) Neutralised summary:\n` +
    text.slice(0, 400) + (text.length > 400 ? "…" : "");
  const exercises = [
    "Reading: True/False/Not Given (5)",
    "Short Answer (3)",
    inclusive ? "Inclusive profile: ON" : "Inclusive profile: OFF",
  ];

  return new Response(JSON.stringify({
    student_text, exercises,
    source: /^https?:\/\//.test(text) ? text : "pasted text",
    credit: "Prepared by [Your Name]"
  }), { headers: { "Content-Type": "application/json" }});
}
