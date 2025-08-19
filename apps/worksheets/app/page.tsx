import { redirect } from "next/navigation";

// prevent static pre-render; always run on request
export const dynamic = "force-dynamic";

export default function Home() {
  redirect("/embed");
}
