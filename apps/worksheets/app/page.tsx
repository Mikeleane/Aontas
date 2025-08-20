import { redirect } from "next/navigation";
export const dynamic = "force-dynamic"; // ensure runtime executes per request

export default function Home() {
  redirect("/embed");
}
