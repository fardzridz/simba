import { NextResponse } from "next/server";
import { confirmEmailChange } from "../actions";

/**
 * Tautan verifikasi surel (§9.11). Token dipakai sekali; hasilnya diarahkan ke
 * halaman Akun Saya dengan penanda status, bukan halaman terpisah.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const result = await confirmEmailChange(token);

  if (result.code === "unauthenticated") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const target = new URL("/account", request.url);
  target.searchParams.set("kontak", result.success ? "surel-terverifikasi" : "gagal");
  return NextResponse.redirect(target);
}
