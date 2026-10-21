/**
 * Konvensi waktu (§1.2 D3): semua waktu disimpan sebagai epoch detik UTC,
 * dirender memakai zona Asia/Jakarta (UTC+7, tanpa DST sejak 1964).
 */
export const JAKARTA_OFFSET_SECONDS = 7 * 60 * 60;
export const DUE_SOON_WINDOW_SECONDS = 3 * 24 * 60 * 60;

/** epoch detik saat ini. */
export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/** Awal hari (00:00:00 WIB) dari sebuah instant, dalam epoch detik UTC. */
export function startOfJakartaDay(epochSeconds: number): number {
  const shifted = epochSeconds + JAKARTA_OFFSET_SECONDS;
  return shifted - (shifted % 86_400) - JAKARTA_OFFSET_SECONDS;
}

/**
 * Tenggat dari input tanggal `<input type="date">` (YYYY-MM-DD) diperlakukan
 * sebagai akhir hari 23:59:59 WIB dan dikembalikan sebagai epoch detik UTC.
 * Mengembalikan null bila format tidak valid atau tanggalnya tidak ada.
 */
export function endOfJakartaDayFromDateInput(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcMidnight = Date.UTC(year, month - 1, day, 0, 0, 0);
  const check = new Date(utcMidnight);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return null;
  }
  return Math.floor(utcMidnight / 1000) - JAKARTA_OFFSET_SECONDS + 86_400 - 1;
}

/** Format tanggal+tanggal untuk tampilan: 2026-10-16 17:00 WIB. */
export function formatJakarta(epochSeconds: number): string {
  const shifted = new Date((epochSeconds + JAKARTA_OFFSET_SECONDS) * 1000);
  const iso = shifted.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} WIB`;
}

const MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/** Format ringkas notifikasi: 17 Okt 2026 08:31 WIB. */
export function formatJakartaNotification(value: Date | number): string {
  const epochSeconds =
    typeof value === "number" ? value : Math.floor(value.getTime() / 1000);
  const shifted = new Date((epochSeconds + JAKARTA_OFFSET_SECONDS) * 1000);
  const date = shifted.getUTCDate();
  const month = MONTH_NAMES_SHORT[shifted.getUTCMonth()];
  const year = shifted.getUTCFullYear();
  const hours = String(shifted.getUTCHours()).padStart(2, "0");
  const minutes = String(shifted.getUTCMinutes()).padStart(2, "0");
  return `${date} ${month} ${year} ${hours}:${minutes} WIB`;
}

export type DeadlineInput = {
  dueAt: number;
  status: string;
  now?: number;
};

/** Terlambat: melewati tenggat dan belum selesai/dibatalkan (§3.3). */
export function isOverdue({ dueAt, status, now = nowSeconds() }: DeadlineInput): boolean {
  if (status === "SELESAI" || status === "DIBATALKAN") return false;
  return now > dueAt;
}

/** Tenggat dekat: ≤ 3 hari lagi dan masih dikerjakan/belum dimulai (§3.3). */
export function isDueSoon({ dueAt, status, now = nowSeconds() }: DeadlineInput): boolean {
  if (status !== "BELUM_DIKERJAKAN" && status !== "SEDANG_DIKERJAKAN") return false;
  return dueAt - now <= DUE_SOON_WINDOW_SECONDS;
}

/** Durasi ringkas: "4 jam", "1 hari 3 jam". */
export function humanizeElapsed(seconds: number): string {
  const hours = Math.floor(Math.max(0, seconds) / 3600);
  if (hours < 24) return `${Math.max(1, hours)} jam`;
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours === 0 ? `${days} hari` : `${days} hari ${restHours} jam`;
}

/** Sisa waktu ringkas untuk dashboard: "4 jam", "1 hari 3 jam". */
export function humanizeRemaining(dueAt: number, now = nowSeconds()): string {
  const diff = dueAt - now;
  if (diff <= 0) return "lewat tenggat";
  return humanizeElapsed(diff);
}
