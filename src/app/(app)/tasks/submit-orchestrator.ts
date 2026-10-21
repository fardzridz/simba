"use client";

import { newId } from "@/lib/ids";

export type SubmitActionResult = {
  success: boolean;
  version?: number;
  error?: string;
};

type OrchestratorInput = {
  assignmentId: string;
  notes: string;
  files: File[];
  onProgress: (fileIndex: number, percent: number) => void;
};

/**
 * Menjembatani SubmitModal dengan dua endpoint server: unggah per berkas
 * (`PENDING`) lalu commit atomik. Idempotency key dibuat sekali per pengumpulan
 * dan dipakai ulang saat "Coba Lagi" (§8.3).
 */
export function createSubmissionOrchestrator(assignmentId: string) {
  let idempotencyKey: string | null = null;
  let lastFileCount = 0;

  function getKey(): string {
    if (!idempotencyKey) {
      idempotencyKey = `sub_${newId("submission", 32)}`;
    }
    return idempotencyKey;
  }

  return async function submitAction(
    input: OrchestratorInput,
  ): Promise<SubmitActionResult> {
    // Files baru setelah rollback berarti pengumpulan baru; key harus baru.
    if (lastFileCount > 0 && input.files.length !== lastFileCount) {
      lastFileCount = 0;
    }
    lastFileCount = input.files.length;
    const key = getKey();

    for (let index = 0; index < input.files.length; index += 1) {
      const file = input.files[index]!;
      const form = new FormData();
      form.set("file", file);
      form.set("idempotencyKey", key);

      await new Promise<boolean>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(
          "POST",
          `/api/submissions/${encodeURIComponent(assignmentId)}/files`,
        );
        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const percent = Math.min(
            99,
            Math.round((event.loaded / event.total) * 100),
          );
          input.onProgress(index, percent);
        };
        xhr.onerror = () => reject(new Error("Koneksi unggah terputus."));
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            input.onProgress(index, 100);
            resolve(true);
            return;
          }
          let message = "Berkas gagal diunggah.";
          try {
            const parsed = JSON.parse(xhr.responseText) as { error?: string };
            if (parsed.error) message = parsed.error;
          } catch {
            // respons bukan JSON; pakai pesan umum
          }
          reject(new Error(message));
        };
        xhr.send(form);
      });
    }

    const response = await fetch(
      `/api/submissions/${encodeURIComponent(assignmentId)}/commit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: key,
          notes: input.notes,
        }),
      },
    );

    const payload = (await response.json().catch(() => null)) as
      | { version?: number; error?: string }
      | null;

    if (!response.ok) {
      return {
        success: false,
        error: payload?.error ?? "Pengumpulan gagal disimpan.",
      };
    }

    // Setelah sukses, key tidak boleh dipakai untuk pengumpulan berikutnya.
    idempotencyKey = null;
    lastFileCount = 0;

    return { success: true, version: payload?.version };
  };
}
