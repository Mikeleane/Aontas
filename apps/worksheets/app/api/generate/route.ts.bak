export const runtime = "edge";
// Optional (plan-dependent): you can declare maxDuration for Edge.
// export const maxDuration = 30; // Hobby ~30s. Pro can be higher.

/* ---------- Types ---------- */
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

/* ---------- Helpers ---------- */
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

// Tiny utility to sleep but never exceed the remaining budget
async function sleepWithinBudget(ms: number, leftMs: number) {
  await new Promise(res => setTimeout(res, Math.max(0, Math.min(ms, leftMs))));
}

/* ---------- OpenAI call with strict budget ---------- */
async function callOpenAIWithinBudget(body: any, key: string, budgetMs: number) {
  const url = "https://api.openai.com/v1/chat/completions";
  const start = Date.now();
  const tries = 3;

  for (let attempt = 0; attempt < tries; attempt++) {
    const elapsed = Date.now() - start;
    const left = budgetMs - elapsed;
    if (left <= 0) break;

    // Give the OpenAI call at most 12s or whatever budget remains
    const perCall = Math.min(12_000, left);
    // @ts-ignore - Edge supports AbortSignal.timeout in modern runtimes
    const signal = typeof AbortSignal !== "undefined" && AbortSignal.timeout
      ? AbortSignal.timeout(perCall)
      : undefined;

    const resp = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal
    });

    // Retry only on classic transient statuses
    if (![429, 500, 502, 503, 504, 520, 521, 522, 523, 524, 525, 526].includes(resp.status)) {
      return resp; // success or non-retryable error
    }

    // Backoff but stay within remaining budget; respect Retry-After if present
    const ra = Number(resp.headers.get("retry-after") ?? 0);
    const backoff = ra > 0 ? ra * 1000 : (400 * 2 ** attempt) + Math.floor(Math.random() * 200);
    const newElapsed = Date.now() - start;
    const newLeft = budgetMs - newElapsed;
    if (newLeft <= 0) break;
    await sleepWithinBudget(backoff, newLeft);
  }

  return new Response(
    JSON.stringify({ error: "Upstream busy (rate limited). Please try again shortly." }),
    { status: 503, headers: { "Content-Type": "application/json" } }
  );
}

/* ---------- Route ---------- */
System.Func`2[System.Text.RegularExpressions.Match,System.String]
  const { input, cefr, exam, inclusive, locale = "IE" } = (await req.json()) as ReqBody;

  // Overall budget: keep under ~24s (safe margin below Hobby Edge limit)
  const BUDGET_MS = 24_000;
  const started = Date.now();
  const left = () => BUDGET_MS - (Date.now() - started);

  // 1) Prepare text (or fetch URL quickly)
  let source = "pasted text";
  let raw = (input ?? "").trim();
  if (looksLikeUrl(raw)) {
    source = raw;
    try {
      // Fast fetch with 4s timeout so we don't burn the budget
      const perFetch = Math.min(4_000, Math.max(1_000, left()));
      // @ts-ignore
      const signal = typeof AbortSignal !== "undefined" && AbortSignal.timeout
        ? AbortSignal.timeout(perFetch)
        : undefined;

      const r = await fetch(raw, { headers: { Accept: "text/html,*/*;q=0.8" }, signal });
      const html = await r.text();
      raw = stripHtml(html).slice(0, 4000); // smaller slice lowers token usage & 429 likelihood
    } catch {
      // fall back to the original input if fetch fails
      raw = input;
    }
  }

  if (!raw) {
    return new Response(JSON.stringify({ error: "Missing input" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  // 2) API key
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  // 3) Build prompt
  const prompt = `
You are an ESL materials writer. Create a neutral, inclusive student text and exercises.

INPUT TEXT:
<<<${raw}>>>

CONSTRAINTS:
- CEFR level: ${cefr}; Exam style: ${exam}; Locale: ${locale}
- Length of "student_text": about 200–260 words.
- Factual tone, accessible vocabulary for the target level.
- Inclusive profile ${inclusive ? "ON" : "OFF"}: use people-first, gender-neutral phrasing where sensible; avoid stereotypes; no graphic detail.
- If content is sensitive, summarise respectfully and neutrally.

RETURN JSON ONLY in this exact shape:
{
  "student_text": "string (~200–260 words, ${cefr})",
  "exercises": ["Reading: True/False/Not Given (5)", "Short Answer (3)"],
  "source": "${source}",
  "credit": "Prepared by [Your Name]"
}
`.trim();

  // 4) Call model within remaining budget
  const body = {
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  };

  const api = await callOpenAIWithinBudget(body, key, left());

  if (!api.ok) {
    const txt = await api.text().catch(() => "");
    return new Response(
      JSON.stringify({ error: `Upstream error ${api.status}`, detail: txt.slice(0, 200) }),
      { status: api.status, headers: { "Content-Type": "application/json" } }
    );
  }

  // 5) Parse model JSON safely
  const data = await api.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "{}";

  let parsed: Partial<GenResponse> = {};
  try { parsed = JSON.parse(content); } catch {}

  const result: GenResponse = {
    student_text: parsed.student_text ?? "Sorry—could not generate a student text.",
    exercises: Array.isArray(parsed.exercises)
      ? parsed.exercises.slice(0, 6)
      : ["Reading: True/False/Not Given (5)", "Short Answer (3)"],
    source,
    credit: (parsed.credit ?? "Prepared by [Your Name]") + " • real-v1",
  };

  const res = new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
  res.headers.set("x-gen-version", "real-v1");
  return res;
}

