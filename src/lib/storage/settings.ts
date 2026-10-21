import { eq } from "drizzle-orm";
import { appSettings } from "@/db/schema";
import type { Db } from "@/env";

/** Batas atas aplikasi; setelan tidak boleh melewati nilai ini (§8.2). */
export const MAX_FILE_BYTES_LIMIT = 10 * 1024 * 1024;
export const MAX_FILES_PER_SUBMISSION_LIMIT = 5;

/** Tipe kanonik yang dikenal aplikasi. Ekstensi → MIME yang diterima. */
export const CANONICAL_TYPES = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "jpg",
  "jpeg",
  "png",
] as const;

export type CanonicalType = (typeof CANONICAL_TYPES)[number];

export type UploadSettings = {
  maxFileBytes: number;
  maxFilesPerSubmission: number;
  allowedTypes: CanonicalType[];
  dueSoonDays: number;
};

const DEFAULT_SETTINGS: UploadSettings = {
  maxFileBytes: MAX_FILE_BYTES_LIMIT,
  maxFilesPerSubmission: MAX_FILES_PER_SUBMISSION_LIMIT,
  allowedTypes: [...CANONICAL_TYPES],
  dueSoonDays: 3,
};

function isCanonicalType(value: string): value is CanonicalType {
  return (CANONICAL_TYPES as readonly string[]).includes(value);
}

/**
 * Baca setelan satu baris. Setelan dibaca per permintaan (§6.4), tanpa cache.
 * Nilai rusak/melewati batas atas dikembalikan ke default yang aman, bukan
 * dipakai apa adanya.
 */
export async function getUploadSettings(db: Db): Promise<UploadSettings> {
  const [row] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.id, 1))
    .limit(1);

  if (!row) return DEFAULT_SETTINGS;

  let allowedTypes: CanonicalType[] = DEFAULT_SETTINGS.allowedTypes;
  try {
    const parsed: unknown = JSON.parse(row.allowedTypes);
    if (Array.isArray(parsed)) {
      const filtered = parsed.filter(
        (item): item is CanonicalType =>
          typeof item === "string" && isCanonicalType(item),
      );
      if (filtered.length > 0) allowedTypes = filtered;
    }
  } catch {
    // JSON rusak → pakai allowlist default.
  }

  const maxFileBytes =
    row.maxFileBytes >= 1024 * 1024 &&
    row.maxFileBytes <= MAX_FILE_BYTES_LIMIT
      ? row.maxFileBytes
      : DEFAULT_SETTINGS.maxFileBytes;
  const maxFilesPerSubmission =
    row.maxFilesPerSubmission >= 1 &&
    row.maxFilesPerSubmission <= MAX_FILES_PER_SUBMISSION_LIMIT
      ? row.maxFilesPerSubmission
      : DEFAULT_SETTINGS.maxFilesPerSubmission;
  const dueSoonDays =
    row.dueSoonDays >= 1 && row.dueSoonDays <= 30
      ? row.dueSoonDays
      : DEFAULT_SETTINGS.dueSoonDays;

  return { maxFileBytes, maxFilesPerSubmission, allowedTypes, dueSoonDays };
}

export function extensionOf(fileName: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(fileName);
  return match ? match[1]!.toLowerCase() : "";
}

const MIME_BY_TYPE: Record<CanonicalType, readonly string[]> = {
  pdf: ["application/pdf"],
  doc: ["application/msword"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  xls: ["application/vnd.ms-excel"],
  xlsx: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
};

/**
 * Cek signature isi berkas. Ini bukan pengganti parser dokumen, tetapi cukup
 * untuk menolak berkas yang ekstensinya dipalsukan tanpa menambah dependency.
 */
export function signatureMatches(type: CanonicalType, bytes: Uint8Array): boolean {
  const startsWith = (signature: number[]) =>
    signature.every((value, index) => bytes[index] === value);

  switch (type) {
    case "pdf":
      return startsWith([0x25, 0x50, 0x44, 0x46]); // %PDF
    case "png":
      return startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "jpg":
    case "jpeg":
      return startsWith([0xff, 0xd8, 0xff]);
    case "doc":
    case "xls":
      return startsWith([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    case "docx":
    case "xlsx":
      return startsWith([0x50, 0x4b, 0x03, 0x04]); // ZIP container
  }
}

const GENERIC_MIMES = new Set([
  "application/octet-stream",
  "binary/octet-stream",
  "application/zip",
]);

export function mimeMatches(type: CanonicalType, reportedMime: string): boolean {
  if (!reportedMime) return true;
  const normalized = reportedMime.split(";")[0]!.trim().toLowerCase();
  // Browser kadang mengirim octet-stream untuk DOC/XLS/DOCX/XLSX.
  if (GENERIC_MIMES.has(normalized)) return true;
  return MIME_BY_TYPE[type].includes(normalized);
}
