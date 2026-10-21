import { appContext } from "@/env";
import { getNotifications } from "@/db/queries/notifications";
import { requireActor } from "@/lib/auth/current";
import NotificationsClient from "./notifications-client";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const actor = await requireActor();
  const { db } = appContext();

  const { items, unreadCount } = await getNotifications(db, actor.id);

  return (
    <NotificationsClient
      initialNotifications={items}
      initialUnreadCount={unreadCount}
    />
  );
}
