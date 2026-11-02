/**
 * Nomor tugas (§12 #4): `<KODE>/<YYYY>/<MM>/<NNN>`, NNN nomor urut per divisi
 * per bulan. Bulan dan tahun mengikuti Asia/Jakarta supaya nomor cocok dengan
 * tanggal yang terbaca pegawai, bukan tanggal UTC.
 */
import { JAKARTA_OFFSET_SECONDS } from "@/lib/time";

const MONTH_WIDTH = 3;

function jakartaParts(createdAtEpochSeconds: number): {
  yyyy: number;
  mm: string;
} {
  const shifted = new Date(
    (createdAtEpochSeconds + JAKARTA_OFFSET_SECONDS) * 1000,
  );
  return {
    yyyy: shifted.getUTCFullYear(),
    mm: String(shifted.getUTCMonth() + 1).padStart(2, "0"),
  };
}

/** Bangun nomor tugas lengkap dari kode divisi, waktu simpan, dan nomor urut. */
export function taskNumber(
  divisionCode: string,
  createdAtEpochSeconds: number,
  sequence: number,
): string {
  const { yyyy, mm } = jakartaParts(createdAtEpochSeconds);
  const code = divisionCode.trim().toUpperCase();
  const nnn = String(Math.max(1, sequence)).padStart(MONTH_WIDTH, "0");
  return `${code}/${yyyy}/${mm}/${nnn}`;
}

/**
 * Awalan nomor bulan berjalan untuk satu divisi, dipakai dalam klausa LIKE
 * saat menghitung nomor urut berikutnya; tabrakan tetap dijaga constraint UNIQUE.
 */
export function taskNumberPrefix(
  divisionCode: string,
  createdAtEpochSeconds: number,
): string {
  const { yyyy, mm } = jakartaParts(createdAtEpochSeconds);
  return `${divisionCode.trim().toUpperCase()}/${yyyy}/${mm}/`;
}
