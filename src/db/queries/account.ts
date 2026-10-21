import { eq } from "drizzle-orm";
import { divisions, notificationPreferences, users } from "@/db/schema";
import type { Db } from "@/env";
import type { Role } from "@/db/schema";

export type UserProfile = {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  emailVerifiedAt: Date | null;
  waNumber: string | null;
  waVerifiedAt: Date | null;
  nip: string | null;
  position: string | null;
  role: Role;
  divisionId: string;
  divisionName: string;
  divisionCode: string;
  notifyEmail: boolean;
  notifyWhatsapp: boolean;
};

/**
 * Mengambil profil kepegawaian pengguna untuk halaman Akun Saya (§9.2, L02).
 * Kueri dibatasi mutlak oleh ID pengguna yang sedang aktif (actor.id).
 */
export async function userProfile(
  db: Db,
  userId: string,
): Promise<UserProfile | null> {
  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      email: users.email,
      emailVerifiedAt: users.emailVerifiedAt,
      waNumber: users.waNumber,
      waVerifiedAt: users.waVerifiedAt,
      nip: users.nip,
      position: users.position,
      role: users.role,
      divisionId: users.divisionId,
      divisionName: divisions.name,
      divisionCode: divisions.code,
    })
    .from(users)
    .innerJoin(divisions, eq(divisions.id, users.divisionId))
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) return null;

  const preferences = await db
    .select({
      channel: notificationPreferences.channel,
      enabled: notificationPreferences.enabled,
    })
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));

  return {
    ...row,
    notifyEmail: preferences.find((item) => item.channel === "EMAIL")?.enabled ?? false,
    notifyWhatsapp: preferences.find((item) => item.channel === "WHATSAPP")?.enabled ?? false,
  };
}
