export default {
  async fetch(request: Request) {
    const origin = request.headers.get("Origin") || "";
    const ALLOW = new Set([
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://servlilingual.com", // change to your LearnWorlds domain if different
    ]);
    const cors = {
      "Access-Control-Allow-Origin": ALLOW.has(origin) ? origin : "http://localhost:3000",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
    };

    if (request.method === "OPTIONS") return new Response("ok", { headers: cors });

    const { pathname } = new URL(request.url);
    if (pathname === "/generate" && request.method === "POST") {
      const { input = "", cefr = "B1", exam = "Cambridge B2", inclusive = true, locale = "IE" } =
        await request.json().catch(() => ({}));

      const text = typeof input === "string" ? input : "";
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
      }), { headers: { "Content-Type": "application/json", ...cors }});
    }

    return new Response("Not found", { status: 404, headers: cors });
  }
};
