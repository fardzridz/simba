/**
 * Instrumentasi server Next (diagnosis produksi, §9.8): galat permintaan yang
 * tidak tertangani, termasuk server action, dicatat sebagai satu baris JSON ke
 * log tail Workers supaya lapisan bawahnya terlihat tanpa sourcemap.
 * Tidak ada nilai rahasia yang ikut dicatat; hanya konteks permintaan umum.
 */
import type { Instrumentation } from "next";

export async function register(): Promise<void> {}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  let detail: Record<string, unknown>;
  if (error instanceof Error) {
    // Digest dilempar React/Next lewat properti tambahan yang tidak ada di
    // tipe `Error` standar, jadi dibaca lewat cast alih-alih `error.digest`.
    const maybeDigest = (error as { digest?: unknown }).digest;
    detail = {
      name: error.name,
      message: error.message,
      // Frame dipotong supaya satu baris log tetap terbaca di tail.
      stack: error.stack?.split("\n").slice(0, 14).join(" | "),
      cause: error.cause instanceof Error ? error.cause.message : undefined,
      digest: typeof maybeDigest === "string" ? maybeDigest : undefined,
    };
  } else {
    detail = { value: String(error) };
  }
  console.error(
    `[onRequestError] ${JSON.stringify({
      error: detail,
      request: { path: request.path, method: request.method },
      context,
    })}`,
  );
};
