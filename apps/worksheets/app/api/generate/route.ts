export const runtime = "edge";

type ReqBody = {
  input: string;
  cefr: "A2" | "B1" | "B2" | "C1";
  exam: string;
  inclusive: boolean;
  locale?: string;
};

type GenResponse = {
  student_text: string;
  exercises: string[];
  source: string;
  credit: string;
};

function looksLikeUrl(s: string) {
  try { const u = new URL(s); return u.protocol === "http:" || u.protocol === "https:"; }
  catch { return false; }
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: Request) {
  const { input, cefr, exam, inclusive, locale = "IE" } = (await req.json()) as ReqBody;

  // 1) Get raw text (fetch if a URL was provided)
  let source = "pasted text";
  let raw = input || "";
  if (looksLikeUrl(input)) {
    source = input;
    try {
      const r = await fetch(input, { headers: { "Accept": "text/html,*/*;q=0.8" } });
      const html = await r.text();
      raw = stripHtml(html).slice(0, 6000); // keep it modest for token cost
    } catch {
      // if fetch fails, fall back to the original string
      raw = input;
    }
  }
  if (!raw) return new Response("Missing input", { status: 400 });

  const key = process.env.OPENAI_API_KEY;
  if (!key) return new Response("Missing OPENAI_API_KEY", { status: 500 });

  // 2) Build safe prompt
  const prompt = `
You are an ESL materials writer. Produce outputs that are safe, neutral, and compliant.

Input text (may be a page extract): <<<${raw}>>>.
Context:
- CEFR level: ${cefr}
- Target exam style: ${exam}
- Locale: ${locale}
- Inclusive profile: ${inclusive ? "ON" : "OFF"} (use people-first wording; avoid stereotypes; if ON, prefer gender-neutral phrasing where sensible).
- Compliant Mode: link or cite the original if known; avoid long quotes; avoid ridicule; no harmful content.

Return a strict JSON object with keys:
{
  "student_text": string,   // ${cefr} level, ~180–260 words, neutral tone
  "exercises": string[],    // 2–3 items, e.g. "Reading: True/False/Not Given (5)", "Short Answer (3)"
  "source": string,         // use provided URL or "pasted text"
  "credit": string          // "Prepared by [Your Name]"
}
No backticks, no extra commentary—JSON only.
`;

  // 3) Call the model
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!resp.ok) {
    return new Response(`Upstream error ${resp.status}`, { status: 502 });
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content ?? "{}";

  // 4) Parse JSON safely and enforce source/credit defaults
// 4) Parse JSON safely and enforce source/credit defaults
let parsed: Partial<GenResponse> = {};
try { parsed = JSON.parse(content); } catch {}

const result: GenResponse = {
  student_text: parsed.student_text ?? "Sorry—could not generate.",
  exercises: Array.isArray(parsed.exercises) ? parsed.exercises.slice(0, 6) : [],
  source,
  credit: (parsed.credit ?? "Prepared by [Your Name]") + " • real-v1"
};

const res = new Response(JSON.stringify(result), {
  headers: { "Content-Type": "application/json" }
});
res.headers.set("x-gen-version", "real-v1");
return res;
