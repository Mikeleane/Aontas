export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import ClientEmbed from "./ClientEmbed";

export default function Page() {
  return <ClientEmbed />;
}
