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

  // 1) Get raw text (fetch if URL)
  let source = "pasted text";
  let raw = input || "";
  if (looksLikeUrl(input)) {
    source = input;
    try {
      const r = await fetch(input, { headers: { Accept: "text/html,*/*;q=0.8" } });
      raw = stripHtml(await r.text()).slice(0, 8000);
    } catch {
      raw = input;
    }
  }
  if (!raw) return new Response("Missing input", { status: 400 });

  const key = process.env.OPENAI_API_KEY;
  if (!key) return new Response("Missing OPENAI_API_KEY", { status: 500 });

  // 2) Prompt
  const prompt = `
You are an ESL materials writer. Create a neutral, inclusive student text and exercises.

INPUT TEXT:
<<<${raw}>>>

CONSTRAINTS:
- CEFR: ${cefr}; Exam style: ${exam}; Locale: ${locale}
- Length for "student_text": about 200–260 words.
- Factual tone; people-first language; if Inclusive profile is ON, prefer gender-neutral phrasing where sensible.
- If the input is sensitive, summarise respectfully and avoid graphic detail.

RETURN JSON ONLY:
{
  "student_text": "string (~200–260 words, ${cefr})",
  "exercises": ["Reading: True/False/Not Given (5)", "Short Answer (3)"],
  "source": "${source}",
  "credit": "Prepared by [Your Name]"
}
`;

  // 3) Call the model
  const api = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!api.ok) return new Response(`Upstream error ${api.status}`, { status: 502 });

  const data = await api.json();
  const content = data?.choices?.[0]?.message?.content ?? "{}";

  // 4) Parse + shape output (ONE declaration of `result`)
  let parsed: Partial<GenResponse> = {};
  try { parsed = JSON.parse(content); } catch {}

  const result: GenResponse = {
    student_text: parsed.student_text ?? "Sorry—could not generate.",
    exercises: Array.isArray(parsed.exercises) ? parsed.exercises.slice(0, 6) : [],
    source,
    credit: (parsed.credit ?? "Prepared by [Your Name]") + " • real-v1",
  };

  const res = new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
  res.headers.set("x-gen-version", "real-v1");
  return res;
}
