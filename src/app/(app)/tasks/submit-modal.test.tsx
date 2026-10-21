import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import SubmitModal, {
  ALLOWED_EXTENSIONS,
  MAX_FILE_COUNT,
  MAX_FILE_SIZE_BYTES,
  MAX_NOTES_LENGTH,
  formatFileSize,
} from "./submit-modal";

const MOCK_TASK = {
  assignmentId: "asg_test_1",
  taskId: "task_test_1",
  taskNumber: "HUK/2026/10/009",
  title: "Pemeriksaan Dokumen Pleno",
  version: 1,
};

describe("SubmitModal L08", () => {
  it("memiliki batasan bisnis sesuai RANCANGAN-SISTEM-v2.md §8 dan wireframe L08", () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);
    expect(MAX_FILE_COUNT).toBe(5);
    expect(MAX_NOTES_LENGTH).toBe(2000);
    expect(ALLOWED_EXTENSIONS).toContain(".pdf");
    expect(ALLOWED_EXTENSIONS).toContain(".docx");
    expect(ALLOWED_EXTENSIONS).toContain(".xlsx");
  });

  it("memformat ukuran berkas dengan desimal koma standar Indonesia", () => {
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(1024 * 512)).toBe("512,0 KB");
    expect(formatFileSize(1024 * 1024 * 14.2)).toBe("14,2 MB");
  });

  it("merender modal ketika isOpen bernilai true dengan atribut aksesibilitas dialog lengkap", () => {
    const html = renderToStaticMarkup(
      <SubmitModal
        isOpen={true}
        onClose={() => {}}
        task={MOCK_TASK}
      />,
    );

    expect(html).toContain("Kumpulkan Tugas");
    expect(html).toContain("HUK/2026/10/009");
    expect(html).toContain("Pemeriksaan Dokumen Pleno");
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("Catatan (opsional)");
    expect(html).toContain("Maksimal 5 berkas, 10 MB per berkas");
    expect(html).toContain("Batal");
    expect(html).toContain("Kirim Pengumpulan");
  });

  it("tidak merender apa pun ke DOM ketika isOpen bernilai false", () => {
    const html = renderToStaticMarkup(
      <SubmitModal
        isOpen={false}
        onClose={() => {}}
        task={MOCK_TASK}
      />,
    );

    expect(html).toBe("");
  });
});
