import { logout } from "@/app/login/actions";

/** Server component: form-nya memanggil server action `logout` secara langsung. */
export default function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="rounded-md border border-border px-3 py-1 text-body hover:bg-background"
      >
        Keluar
      </button>
    </form>
  );
}
