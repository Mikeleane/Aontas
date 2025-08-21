export const runtime = "nodejs";

type OutputLanguage = "ga" | "en" | "es";
type Payload = {
  outputLanguage: OutputLanguage;
  publicSchool: boolean;
  school?: { country: "IE" | "ES"; year: string };
  exam?: { cefr: "A1"|"A2"|"B1"|"B2"|"C1"|"C2"; type: "Cambridge"|"Trinity"|"Aptis"|"Linguaskill"; questionTypes: string[] };
  topic: string;
  ldSupport: boolean;
};

const ALLOWED_MODELS = new Set(["gpt-4o-mini","gpt-4o","gpt-4.1-mini"]);
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function buildMessages(p: Payload) {
  const audience = p.publicSchool
    ? `Public school • ${p.school?.country} • ${p.school?.year}`
    : `Exam prep • CEFR ${p.exam?.cefr} • ${p.exam?.type} • Question types: ${(p.exam?.questionTypes||[]).join(", ") || "auto"}`;

  const langLabel =
    p.outputLanguage === "ga" ? "Irish (Gaeilge)" :
    p.outputLanguage === "es" ? "Spanish (Español)" : "English";

  const system =
    `You are an expert language educator and exam item writer. ` +
    `Write the STUDENT content entirely in ${langLabel}. ` +
    `After that, include a TEACHER-ONLY PANEL with objectives, mapping to ${p.publicSchool ? "the selected school year" : "CEFR descriptors"}, timing, answer key, marking rubric, differentiation tips, and extension activities. ` +
    `Respect exam/question-type conventions if provided. Keep content age-appropriate and culturally appropriate for ${p.school?.country || "the selected audience"}.`;

  const ldBlock = p.ldSupport
    ? `Also produce an LD-ADAPTED VERSION for learners with specific learning difficulties: shorter sentences, simplified vocabulary, increased white space, bullet steps, explicit scaffolding, and a small pre-teach vocabulary list with simple definitions.`
    : `Do not include an LD section.`;

  const user =
`Topic/brief: ${p.topic || "(none)"}.
Audience: ${audience}.
Sections (use these exact headers):
### STUDENT MATERIAL
### TEACHER-ONLY PANEL
${p.ldSupport ? "### LD-ADAPTED VERSION" : ""}`.trim() + `

${ldBlock}
If exam types/question types were selected, mirror authentic formats (length, register, rubrics).`;

  return [
    { role: "system", content: system },
    { role: "user", content: user }
  ];
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Payload & { model?: string; temperature?: number };
    if (!body || !body.outputLanguage || !body.topic) {
      return new Response(JSON.stringify({ error: "outputLanguage and topic are required" }), { status: 400 });
    }
    if (body.publicSchool && (!body.school?.country || !body.school?.year)) {
      return new Response(JSON.stringify({ error: "school.country and school.year required when publicSchool=true" }), { status: 400 });
    }
    if (!body.publicSchool && (!body.exam?.cefr || !body.exam?.type)) {
      return new Response(JSON.stringify({ error: "exam.cefr and exam.type required when publicSchool=false" }), { status: 400 });
    }

    const model = ALLOWED_MODELS.has(body.model || "") ? body.model! : DEFAULT_MODEL;
    const messages = buildMessages(body);

    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "text/event-stream"
      },
      body: JSON.stringify({
        model,
        stream: true,
        temperature: typeof body.temperature === "number" ? body.temperature : 0.7,
        max_tokens: 900,
        messages
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(()=> "");
      return new Response(text || "Upstream error", { status: upstream.status || 502 });
    }

    return new Response(upstream.body as any, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive"
      }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Server error" }), { status: 500 });
  }
}
