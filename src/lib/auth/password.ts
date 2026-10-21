/**
 * Hash kata sandi memakai PBKDF2-SHA256 lewat WebCrypto (§9.2).
 * Argon2/bcrypt tidak tersedia di runtime Workers, jadi format dan iterasi
 * disimpan di dalam string hasil supaya bisa dinaikkan tanpa migrasi data.
 */
export const PBKDF2_ITERATIONS = 600_000;
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
