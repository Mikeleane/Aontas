export async function* generateLessonStream(payload: any) {
  const resp = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!resp.ok || !resp.body) throw new Error("Request failed");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const payload = line.slice(6);
        if (payload === "[DONE]") return;
        try {
          const delta = JSON.parse(payload);
          const text = delta?.choices?.[0]?.delta?.content;
          if (text) yield text;
        } catch { /* keep-alive */ }
      }
    }
  }
}

export function splitSections(fullText: string) {
  const parts = { student: "", teacher: "", ld: "" };
  const re = /(### STUDENT MATERIAL|### TEACHER-ONLY PANEL|### LD-ADAPTED VERSION)/g;
  const indices: {header: string, index: number}[] = [];
  for (const m of fullText.matchAll(re)) indices.push({ header: m[1], index: m.index! });
  indices.sort((a,b)=>a.index-b.index);

  for (let i=0;i<indices.length;i++){
    const { header, index } = indices[i];
    const end = i+1 < indices.length ? indices[i+1].index : fullText.length;
    const content = fullText.slice(index + header.length, end).trim();
    if (header.includes("STUDENT MATERIAL")) parts.student = content;
    if (header.includes("TEACHER-ONLY PANEL")) parts.teacher = content;
    if (header.includes("LD-ADAPTED VERSION")) parts.ld = content;
  }
  return parts;
}
