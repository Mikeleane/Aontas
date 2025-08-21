"use client";
import ClientEmbed from "./ClientEmbed";

// Keep these after the directive; this file is purely client.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default function Page() {
  return <ClientEmbed />;
}
