import { eq } from "drizzle-orm";
import { divisions } from "@/db/schema";
import { countUnreadNotifications } from "@/db/queries/notifications";
import { appContext } from "@/env";
import { actorWithProfile } from "@/lib/auth/current";
import { navFor, ROLE_LABEL } from "@/lib/nav";
import LogoutButton from "./logout-button";
import SessionKeepalive from "./session-keepalive";
import Shell from "./shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await actorWithProfile();
  const { db } = appContext();
  const [division] = await db
    .select({ name: divisions.name })
    .from(divisions)
    .where(eq(divisions.id, actor.divisionId))
    .limit(1);

  const unreadNotificationCount = await countUnreadNotifications(db, actor.id);

  return (
    <Shell
      nav={navFor(actor.role)}
      role={actor.role}
      roleLabel={ROLE_LABEL[actor.role]}
      accountName={actor.fullName}
      divisionName={division?.name ?? actor.divisionId}
      unreadNotificationCount={unreadNotificationCount}
      logout={<LogoutButton />}
    >
      <SessionKeepalive />
      {children}
    </Shell>
  );
}
