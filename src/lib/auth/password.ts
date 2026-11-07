/**
 * Hash kata sandi memakai PBKDF2-SHA256 lewat WebCrypto (§9.2).
 * Argon2/bcrypt tidak tersedia di runtime Workers, jadi format dan iterasi
 * disimpan di dalam string hasil supaya bisa dinaikkan tanpa migrasi data.
 */
/** workerd menolak PBKDF2 di atas 100.000 iterasi (NotSupportedError), jadi standar menempel batas runtime itu. */
export const PBKDF2_ITERATIONS = 100_000;

const KEY_BITS = 256;
const SALT_BYTES = 16;
const ALGORITHM = "PBKDF2-SHA256";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64(value: string): Uint8Array {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    key,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string, iterations = PBKDF2_ITERATIONS): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const derived = await derive(password, salt, iterations);
  return `${ALGORITHM}$${iterations}$${toBase64(salt)}$${toBase64(derived)}`;
}

/**
 * Sandi awal sekali pakai untuk akun baru dan reset (UC02): Super Admin
 * menampilkannya sekali di layar lalu pengguna menggantinya dari menu Akun.
 * Tidak ada kata sandi tetap di kode, log, atau versi kontrol; setiap akun
 * mendapat nilai berbeda. Abjad membuang karakter yang mudah tertukar
 * (0/O, 1/l/I) supaya aman dibaca bebas saat dikonfirmasi lewat kanal lain.
 */
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghjkmnpqrstuvwxyz";
const DIGIT = "23456789";
const ONE_TIME_ALPHABET = UPPER + LOWER + DIGIT;

/** Bilangan acak tanpa bias modulo untuk batas < 256. */
function randomInt(bound: number): number {
  const limit = 256 - (256 % bound);
  const buffer = new Uint8Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0]! >= limit);
  return buffer[0]! % bound;
}

export function generateOneTimePassword(length = 14): string {
  const chars: string[] = [
    UPPER[randomInt(UPPER.length)]!,
    LOWER[randomInt(LOWER.length)]!,
    DIGIT[randomInt(DIGIT.length)]!,
  ];
  while (chars.length < length) {
    chars.push(ONE_TIME_ALPHABET[randomInt(ONE_TIME_ALPHABET.length)]!);
  }
  // Fisher-Yates agar tiga kelas karakter di depan tidak membentuk pola.
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1);
    [chars[index], chars[swap]] = [chars[swap]!, chars[index]!];
  }
  return chars.join("");
}

type ParsedHash = { iterations: number; salt: Uint8Array; expected: Uint8Array };

function parseHash(encoded: string): ParsedHash | null {
  const [algorithm, iterationsRaw, saltRaw, hashRaw] = encoded.split("$");
  if (algorithm !== ALGORITHM || !iterationsRaw || !saltRaw || !hashRaw) return null;
  const iterations = Number(iterationsRaw);
  if (!Number.isInteger(iterations) || iterations < 100_000) return null;
  try {
    return { iterations, salt: fromBase64(saltRaw), expected: fromBase64(hashRaw) };
  } catch {
    return null;
  }
}

/** Perbandingan waktu-tetap: panjang dan isi tidak membocorkan informasi. */
function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= (left.at(index) ?? 0) ^ (right.at(index) ?? 0);
  }
  return diff === 0;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const parsed = parseHash(encoded);
  if (!parsed) return false;
  const derived = await derive(password, parsed.salt, parsed.iterations);
  return timingSafeEqual(derived, parsed.expected);
}

/** Hash lama dengan iterasi di bawah standar sekarang harus dibuat ulang saat login berhasil. */
export function needsRehash(encoded: string, iterations = PBKDF2_ITERATIONS): boolean {
  const parsed = parseHash(encoded);
  return parsed === null || parsed.iterations < iterations;
}
