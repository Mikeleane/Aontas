import { redirect } from "next/navigation";
export const dynamic = "force-dynamic"; // evaluate per-request

export default function Home() {
  redirect("/embed");
}
