export const runtime = "edge";

/* ---------- Types ---------- */
type ReqBody = {
  input: string;
  cefr: "A2" | "B1" | "B2" | "C1";
  exam: string;
  inclusive: boolean;
  locale?: string;
};

type TeacherPanel = {
  cefr_rationale: string;
  sensitive_flags: string[];
  inclusive_notes: string[];
  differentiation: string[];
  source_notes?: string;
};

type SourceVerification = {
  url: string;
  score: number; // 0–100
  verdict: "likely_original" | "reputable" | "aggregation" | "unknown";
  checks: {
    is_https: boolean;
    has_canonical: boolean;
    has_og: boolean;
    has_date_meta: boolean;
    word_count: number;
    link_count: number;
    domain: string;
    tld_ok: boolean;
  };
  notes?: string;
};

type GenResponse = {
  student_text: string;
  exercises: string[];
  source: string;
  credit: string;
  teacher_panel: TeacherPanel;
  source_verification?: SourceVerification;
};

/* ---------- Tunables ---------- */
const BUDGET_MS = 18_000;
const FETCH_TIMEOUT_MS = 4_000;
const OPENAI_TIMEOUT_MS = 9_000;
const MAX_CHARS = 3000;
const MAX_TRIES = 2;

/* ---------- Utils ---------- */
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

function wordCount(s: string) { return (s.match(/\b[\p{L}\p{N}'’-]+\b/gu) || []).length; }
function sentenceCount(s: string) { return (s.match(/[.!?]+(?:\s|$)/g) || []).length || 1; }
function avgSentenceLen(s: string) { return Math.round(wordCount(s) / sentenceCount(s)); }
function pctLongWords(s: string) {
  const words = (s.match(/\b[\p{L}\p{N}'’-]+\b/gu) || []);
  const long = words.filter(w => w.replace(/['’-]/g, "").length >= 7).length;
  return Math.round((long / Math.max(1, words.length)) * 100);
}
function trimToWords(s: string, n = 220) {
  const words = (s.match(/\b[\p{L}\p{N}'’-]+\b/gu) || []).slice(0, n);
  if (!words.length) return "";
  const out = words.join(" ");
  return /[.!?]$/.test(out) ? out : out + ".";
}

/* ---------- Sensitive / inclusive heuristics ---------- */
function flagSensitive(raw: string): string[] {
  const t = raw.toLowerCase();
  const flags: string[] = [];
  if (/\bwar|attack|bomb|terror|assault|violence|killed|dead\b/.test(t)) flags.push("Violence/Conflict");
  if (/\bsuicide|self-harm|depression|anxiety|mental health\b/.test(t)) flags.push("Mental health");
  if (/\bsexual|harassment|abuse|assault\b/.test(t)) flags.push("Sexual content/harassment");
  if (/\bdrug|alcohol|addiction\b/.test(t)) flags.push("Substance use");
  if (/\breligion|faith|church|mosque|synagogue\b/.test(t)) flags.push("Religion (potentially sensitive)");
  if (/\bimmigrant|refugee|asylum|migration\b/.test(t)) flags.push("Migration/Identity");
  if (/\bpolitic|election|government|policy\b/.test(t)) flags.push("Politics");
  return [...new Set(flags)];
}

function inclusiveNotes(raw: string): string[] {
  const t = raw.toLowerCase();
  const notes: string[] = [];
  if (/\bhe\/she|he or she|s\/he\b/.test(t)) notes.push("Replace 'he/she' with a singular 'they' or rewrite to avoid gendered pronouns.");
  if (/\bhusband|wife|boyfriend|girlfriend\b/.test(t)) notes.push("Use neutral alternatives like 'partner' where appropriate.");
  if (/\bmankind|man-made\b/.test(t)) notes.push("Prefer 'humankind' / 'human-made'.");
  if (/\bthe disabled|the poor|the elderly\b/.test(t)) notes.push("Use people-first phrasing (e.g., 'people with disabilities').");
  if (/\bnormal people|able-bodied\b/.test(t)) notes.push("Avoid 'normal'; specify the attribute if needed.");
  return notes;
}

function differentiationByCEFR(level: ReqBody["cefr"]): string[] {
  const base = {
    A2: [
      "Pre-teach 8–10 key words with visuals.",
      "Gist read with 2–3 yes/no questions.",
      "Use short, chunked paragraphs; allow L1 glossary."
    ],
    B1: [
      "Gist → scanning tasks; underline evidence.",
      "Sentence starters for short answers.",
      "Pair-check before plenary to build confidence."
    ],
    B2: [
      "Add inference items; justify with quotes.",
      "Noticing task for cohesive devices.",
      "Optional challenge: paraphrase 5 sentences."
    ],
    C1: [
      "Synthesis question across two paragraphs.",
      "Author stance: identify hedging & modality.",
      "Extension: write a 120–150 word response."
    ]
  } as const;
  return [...base[level]];
}

/* ---------- Source verification (heuristic) ---------- */
function analyzeSource(url: string, html?: string): SourceVerification {
  const u = new URL(url);
  const domain = u.hostname.toLowerCase();
  const tld_ok = /\.[a-z]{2,}$/.test(domain);
  const is_https = u.protocol === "https:";
  let has_canonical = false, has_og = false, has_date_meta = false, link_count = 0, wc = 0;
  let notes = "";

  if (html) {
    has_canonical = /<link[^>]+rel=["']canonical["']/i.test(html);
    has_og = /<meta[^>]+property=["']og:/i.test(html);
    has_date_meta = /<meta[^>]+(property|name)=["'](article:published_time|date|pubdate)["'][^>]*>/i.test(html);
    link_count = (html.match(/<a\s/i) || []).length;
    wc = wordCount(stripHtml(html));
  }

  // crude score
  let score = 0;
  if (is_https) score += 20;
  if (tld_ok) score += 10;
  if (has_canonical) score += 20;
  if (has_og) score += 15;
  if (has_date_meta) score += 15;
  if (wc >= 300) score += 10;
  if (link_count >= 3) score += 10;

  let verdict: SourceVerification["verdict"] = "unknown";
  if (score >= 75) verdict = "reputable";
  else if (score >= 55) verdict = "likely_original";
  else if (score >= 35) verdict = "aggregation";
  notes = !html ? "Fetched as plain text; limited checks." : "";

  return {
    url,
    score: Math.min(100, score),
    verdict,
    checks: { is_https, has_canonical, has_og, has_date_meta, word_count: wc, link_count, domain, tld_ok },
    notes
  };
}

/* ---------- LLM call with tiny backoff and strict per-call timeout ---------- */
const RETRYABLE = new Set([429, 500, 502, 503, 504, 520, 521, 522, 523, 524, 525, 526]);

async function callLLM(body: any, key: string, timeLeftMs: number) {
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const perCall = Math.min(OPENAI_TIMEOUT_MS, Math.max(1500, timeLeftMs));
    // @ts-ignore
    const signal = typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(perCall) : undefined;

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal
    });

    if (!RETRYABLE.has(resp.status)) return resp;

    const ra = Number(resp.headers.get("retry-after") ?? 0);
    const backoff = ra > 0 ? ra * 1000 : (400 * (attempt + 1)) + Math.floor(Math.random() * 200);
    await new Promise(res => setTimeout(res, Math.min(backoff, Math.max(0, timeLeftMs - 500))));
  }
  return new Response(JSON.stringify({ error: "Upstream busy (rate limited)." }), {
    status: 503, headers: { "Content-Type": "application/json" }
  });
}

/* ---------- Fallback (no LLM) ---------- */
function fallbackResult(raw: string, cefr: string, exam: string, source: string): GenResponse {
  const rationale = `Heuristic: avg sentence ${avgSentenceLen(raw)} words; ${pctLongWords(raw)}% long words; ${wordCount(raw)} words total.`;
  return {
    student_text: `Neutralised summary (${cefr} • ${exam}). ${trimToWords(raw, 220)}`,
    exercises: ["Reading: True/False/Not Given (5)", "Short Answer (3)"],
    source,
    credit: "Prepared by [Your Name] • fallback",
    teacher_panel: {
      cefr_rationale: rationale,
      sensitive_flags: flagSensitive(raw),
      inclusive_notes: inclusiveNotes(raw),
      differentiation: differentiationByCEFR(cefr as any),
      source_notes: "AI fallback used; source not verified by the model."
    }
  };
}

/* ---------- Route ---------- */
export async function POST(req: Request) {
  const started = Date.now();
  const remain = () => BUDGET_MS - (Date.now() - started);

  const { input, cefr, exam, inclusive, locale = "IE" } = (await req.json()) as ReqBody;

  // 1) Get text (or fetch URL quickly)
  let source = "pasted text";
  let raw = (input ?? "").trim();
  let fetchedHtml: string | undefined;

  if (looksLikeUrl(raw)) {
    source = raw;
    try {
      const timeout = Math.min(FETCH_TIMEOUT_MS, Math.max(1000, remain()));
      // @ts-ignore
      const signal = typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(timeout) : undefined;
      const r = await fetch(raw, { headers: { Accept: "text/html,*/*;q=0.8" }, signal });
      fetchedHtml = await r.text();
      raw = stripHtml(fetchedHtml);
    } catch { /* fall back to input text */ }
  }

  if (!raw) {
    return new Response(JSON.stringify({ error: "Missing input" }), {
      status: 400, headers: { "Content-Type": "application/json" }
    });
  }

  raw = raw.slice(0, MAX_CHARS);

  // 2) Source verification (heuristic)
  const source_verification = looksLikeUrl(source)
    ? analyzeSource(source, fetchedHtml)
    : undefined;

  // 3) If no API key, return heuristic fallback
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    const fb = fallbackResult(raw, cefr, exam, source);
    fb.source_verification = source_verification;
    const res = new Response(JSON.stringify(fb), { headers: { "Content-Type": "application/json" } });
    res.headers.set("x-gen-version", "fallback-no-key");
    return res;
  }

  // 4) Prompt – ask for Teacher Panel (strict JSON)
  const metrics = `avg_sentence_len=${avgSentenceLen(raw)}, pct_long_words=${pctLongWords(raw)}%, total_words=${wordCount(raw)}`;
  const prompt = `
You are an ESL materials writer. Produce safe, inclusive materials AND a teacher panel.

INPUT TEXT:
<<<${raw}>>>

CONTEXT:
- CEFR: ${cefr} ; Exam: ${exam} ; Locale: ${locale}
- Inclusive profile: ${inclusive ? "ON" : "OFF"} (people-first language, avoid stereotypes; gender-neutral where sensible)
- Build a ${cefr} student_text of ~200–260 words, neutral and factual.

RETURN STRICT JSON (no commentary):
{
  "student_text": "string",
  "exercises": ["Reading: True/False/Not Given (5)", "Short Answer (3)"],
  "source": "${source}",
  "credit": "Prepared by [Your Name]",
  "teacher_panel": {
    "cefr_rationale": "Use readability & vocabulary reasoning. Consider ${metrics}.",
    "sensitive_flags": ["list potential sensitivities, if any"],
    "inclusive_notes": ["practical edits for neutral/inclusive phrasing"],
    "differentiation": ["3 concise suggestions for this CEFR"],
    "source_notes": "If source is a URL, suggest how to cite/link appropriately."
  }
}
`.trim();

  const body = {
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }]
  };

  const api = await callLLM(body, key, remain());
  if (!api.ok) {
    // Quota/rate-limited or upstream busy → graceful fallback
    const fb = fallbackResult(raw, cefr, exam, source);
    fb.source_verification = source_verification;
    fb.credit += " • degraded";
    const res = new Response(JSON.stringify(fb), { headers: { "Content-Type": "application/json" } });
    res.headers.set("x-gen-version", "fallback");
    return res;
  }

  const data = await api.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "{}";

  // 5) Parse model JSON safely and patch teacher panel if missing
  let parsed: Partial<GenResponse> = {};
  try { parsed = JSON.parse(content); } catch {}

  const result: GenResponse = {
    student_text: parsed.student_text ?? fallbackResult(raw, cefr, exam, source).student_text,
    exercises: Array.isArray(parsed.exercises) ? parsed.exercises.slice(0, 6) : ["Reading: True/False/Not Given (5)", "Short Answer (3)"],
    source,
    credit: (parsed.credit ?? "Prepared by [Your Name]") + " • real-v1",
    teacher_panel: parsed.teacher_panel ?? {
      cefr_rationale: `Heuristic: ${metrics}.`,
      sensitive_flags: flagSensitive(raw),
      inclusive_notes: inclusiveNotes(raw),
      differentiation: differentiationByCEFR(cefr),
      source_notes: "Model did not supply notes; heuristics used."
    },
    source_verification
  };

  const res = new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
  res.headers.set("x-gen-version", "real-v1");
  return res;
}
