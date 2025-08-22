export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  return Response.json({ ok: true, ts: new Date().toISOString() });
}
