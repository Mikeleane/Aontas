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
  preteach_vocab: string[];    // NEW
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
  exercises: string[];         // e.g., "Reading: T/F/NG (5)", etc.
  answer_key: string[];        // NEW — one entry per exercise item or a brief key
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

function preteachVocab(raw: string, n = 10): string[] {
  const stop = new Set(["the","a","an","and","or","but","to","of","in","on","at","for","with","by","from","as","that","this","it","is","are","was","were","be","been","being","which","who","whom","whose","than","then","so","such","into","about","over","under","between","after","before","because","while","if","though","although","however","there","their","they","them","we","our","you","your","i","me","my"]);
  const words = (raw.toLowerCase().match(/\b[\p{L}\p{N}'’-]+\b/gu) || [])
    .map(w => w.replace(/^[’'--]+|[’'--]+$/g,""))
    .filter(w => w.length >= 6 && !stop.has(w));
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
  return [...freq.entries()]
    .sort((a,b)=> b[1]-a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([w]) => w);
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
    answer_key: ["(Create T/F/NG answers using the text.)", "(Short answers will vary; accept paraphrases)."],  // NEW
    source,
    credit: "Prepared by [Your Name] • fallback",
    teacher_panel: {
      cefr_rationale: rationale,
      sensitive_flags: flagSensitive(raw),
      inclusive_notes: inclusiveNotes(raw),
      differentiation: differentiationByCEFR(cefr as any),
      preteach_vocab: preteachVocab(raw, 10),                                                // NEW
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
  "answer_key": ["Answer 1...", "Answer 2..."],                   // answers for listed tasks
  "source": "${source}",
  "credit": "Prepared by [Your Name]",
  "teacher_panel": {
    "cefr_rationale": "readability & vocabulary reasoning",
    "sensitive_flags": ["potential sensitivities"],
    "inclusive_notes": ["practical edits for inclusive phrasing"],
    "differentiation": ["3 concise suggestions for this CEFR"],
    "preteach_vocab": ["10 key words/phrases to pre-teach"],       // NEW
    "source_notes": "if source is a URL, how to cite/link"
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
  answer_key: Array.isArray((parsed as any).answer_key) ? (parsed as any).answer_key.slice(0, 6) : ["(Create T/F/NG answers using the text.)","(Short answers will vary.)"],
  source,
  credit: (parsed.credit ?? "Prepared by [Your Name]") + " • real-v1",
  teacher_panel: parsed.teacher_panel ?? {
    cefr_rationale: `Heuristic: ${metrics}.`,
    sensitive_flags: flagSensitive(raw),
    inclusive_notes: inclusiveNotes(raw),
    differentiation: differentiationByCEFR(cefr),
    preteach_vocab: preteachVocab(raw, 10),
    source_notes: "Model did not supply notes; heuristics used."
  },
  source_verification
};


  const res = new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
  res.headers.set("x-gen-version", "real-v1");
  return res;
}
export const runtime = "nodejs";

import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { data, includeLD = true } = await req.json();

  const { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType, PageBreak } = await import("docx");

  const H1 = (t: string) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_1 });
  const H2 = (t: string) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2 });
  const P  = (t: string) => new Paragraph({ children: [new TextRun(t)] });

  const doc = new Document({
    styles: { default: { document: { run: { size: 24, font: "Calibri" }, paragraph: { spacing: { line: 276 } } } } },
    sections: [
      {
        children: [
          H1("Student Text"),
          P(data.student_text || ""),
          new Paragraph({ children: [new PageBreak()] }),

          H1("Exercises"),
          ...((data.exercises || []) as string[]).map((ex: string, i: number) => P(`${i + 1}. ${ex}`)),
          H2("Answer Key"),
          ...((data.answer_key || []) as string[]).map((a: string, i: number) => P(`${i + 1}. ${a}`)),
          new Paragraph({ children: [new PageBreak()] }),

          H1("Teacher Panel"),
          H2("CEFR rationale"), P(data.teacher_panel?.cefr_rationale || "—"),
          H2("Sensitive content flags"),
          P((data.teacher_panel?.sensitive_flags || []).join(", ") || "None detected."),
          H2("Inclusive-language notes"),
          ...((data.teacher_panel?.inclusive_notes || []) as string[]).map((n: string) => P("• " + n)),
          H2("Differentiation"),
          ...((data.teacher_panel?.differentiation || []) as string[]).map((n: string) => P("• " + n)),
          ...(includeLD ? [H2("Learning Differences (LD) — included"), P("Ensure multi-modal input, scaffolded output, and extra processing time.")] : []),
          H2("Pre-teach vocabulary"),
          ...((data.teacher_panel?.preteach_vocab || []) as string[]).map((w: string) => P("• " + w)),
          H2("Source verification"),
          P(data.source_verification ? `${data.source_verification.verdict} • score ${data.source_verification.score}/100` : "—"),
          P("Source: " + (data.source || "—")),
          P(data.credit || "")
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="worksheet.docx"`
    }
  });
}
export const runtime = "nodejs";

import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { data, includeLD = true } = await req.json();
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const margin = 50, lineHeight = 14, maxWidth = 500;

  const addPage = () => pdf.addPage([612, 792]); // US Letter; ok for A4 too
  let page = addPage();
  let y = 792 - margin;

  function drawHeading(text: string, level = 1) {
    const size = level === 1 ? 16 : 13;
    y -= lineHeight * 1.5;
    page.drawText(text, { x: margin, y, size, font: fontBold, color: rgb(0, 0, 0) });
    y -= lineHeight * 0.5;
  }

  function drawText(text: string) {
    const words = text.split(/\s+/);
    let line = "";
    const size = 11;

    for (const w of words) {
      const test = line ? line + " " + w : w;
      const width = font.widthOfTextAtSize(test, size);
      if (width > maxWidth) {
        y -= lineHeight;
        if (y < margin) { page = addPage(); y = 792 - margin; }
        page.drawText(line, { x: margin, y, size, font });
        line = w;
      } else {
        line = test;
      }
    }
    if (line) {
      y -= lineHeight;
      if (y < margin) { page = addPage(); y = 792 - margin; }
      page.drawText(line, { x: margin, y, size, font });
    }
  }

  function pageBreak() {
    page = addPage();
    y = 792 - margin;
  }

  // Student text
  drawHeading("Student Text", 1);
  drawText(data.student_text || "");
  pageBreak();

  // Exercises + Answer Key
  drawHeading("Exercises", 1);
  (data.exercises || []).forEach((ex: string, i: number) => drawText(`${i + 1}. ${ex}`));
  drawHeading("Answer Key", 2);
  (data.answer_key || []).forEach((a: string, i: number) => drawText(`${i + 1}. ${a}`));
  pageBreak();

  // Teacher Panel
  drawHeading("Teacher Panel", 1);
  drawHeading("CEFR rationale", 2); drawText(data.teacher_panel?.cefr_rationale || "—");
  drawHeading("Sensitive content flags", 2); drawText((data.teacher_panel?.sensitive_flags || []).join(", ") || "None detected.");
  drawHeading("Inclusive-language notes", 2); (data.teacher_panel?.inclusive_notes || []).forEach((n: string)=> drawText("• " + n));
  drawHeading("Differentiation", 2); (data.teacher_panel?.differentiation || []).forEach((n: string)=> drawText("• " + n));
  if (includeLD) { drawHeading("Learning Differences (LD)", 2); drawText("Ensure multi-modal input, scaffolded output, and extra processing time."); }
  drawHeading("Pre-teach vocabulary", 2); (data.teacher_panel?.preteach_vocab || []).forEach((w: string)=> drawText("• " + w));
  drawHeading("Source verification", 2);
  if (data.source_verification) {
    drawText(`${data.source_verification.verdict} • score ${data.source_verification.score}/100`);
  } else {
    drawText("—");
  }
  drawText("Source: " + (data.source || "—"));
  drawText(data.credit || "");

  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="worksheet.pdf"'
    }
  });
}
