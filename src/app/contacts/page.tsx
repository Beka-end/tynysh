import { requireProfile } from "@/lib/session";
import { AppShell } from "@/components/AppShell";
import { StartChat } from "./StartChat";
import { CHATS_ENABLED } from "@/lib/features";
import { redirect } from "next/navigation";
// Страница всегда считается на сервере: она смотрит на куки с сессией.
export const dynamic = "force-dynamic";
export default async function ContactsPage() {
  if (!CHATS_ENABLED) redirect("/dos");
  const { me } = await requireProfile();
  return (
    <AppShell meId={me.id} handle={me.handle} active="/contacts">
      <StartChat meId={me.id} myHandle={me.handle} />
    </AppShell>
  );
}