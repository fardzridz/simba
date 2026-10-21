import { redirect } from "next/navigation";
import { loadActor } from "@/lib/auth/current";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const actor = await loadActor();
  redirect(actor ? "/dashboard" : "/login");
}
