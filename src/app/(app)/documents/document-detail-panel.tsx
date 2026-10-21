"use client";

import Link from "next/link";
import { Icon } from "@/app/icons";
import type { FinalDocument } from "@/lib/mock-documents";

export interface DocumentDetailPanelProps {
  document: FinalDocument | null;
  onClose: () => void;
}

export default function DocumentDetailPanel({
  document,
  onClose,
}: DocumentDetailPanelProps) {
  if (!document) {
    return (
      <div className="card p-6 flex flex-col items-center justify-center text-center text-ink-3 min-h-[360px]">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-surface text-ink-3">
          <Icon name="dokumen" size={24} />
        </span>
        <p className="mt-3 text-body font-medium text-ink">
          Pilih salah satu dokumen
        </p>
        <p className="mt-1 text-body-sm text-ink-3 max-w-[240px]">
          Klik baris dokumen pada tabel untuk melihat pratinjau berkas dan metadata kearsipan.
        </p>
      </div>
    );
  }

  const handleDownloadAll = () => {
    // Simulasi unduhan gabungan seluruh berkas lampiran
    alert(
      `Memulai unduhan seluruh berkas lampiran (${document.files.length} berkas) untuk dokumen ${document.taskNumber}.`,
    );
  };

  return (
    <aside
      aria-label="Panel detail dokumen"
      className="card p-6 flex flex-col gap-5 sticky top-20 shadow-sm"
    >
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-h2 font-semibold text-ink">Detail Dokumen</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-body-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
        >
          Tutup
        </button>
      </div>

      {/* Informasi Pokok Dokumen */}
      <div className="flex flex-col gap-2">
        <span className="font-mono text-body-sm font-medium text-ink-3 tracking-wide">
          {document.taskNumber}
        </span>
        <h3 className="text-h3 font-semibold text-ink leading-snug">
          {document.title}
        </h3>

        <div className="mt-1 flex flex-col gap-1.5 text-body-sm text-ink-2">
          <div>
            <span className="text-ink-3">Kategori:</span>{" "}
            <span className="font-medium text-ink">{document.categoryName}</span>
          </div>
          <div>
            <span className="text-ink-3">Divisi:</span>{" "}
            <span className="font-medium text-ink">{document.divisionName}</span>
          </div>
          <div>
            <span className="text-ink-3">Penerima:</span>{" "}
            <span className="font-medium text-ink">{document.recipientName}</span>
          </div>
          <div>
            <span className="text-ink-3">Diarsipkan:</span>{" "}
            <span className="font-medium text-ink">
              {document.archivedDateTimeFormatted}
            </span>
          </div>
          <div>
            <span className="text-ink-3">Versi submission:</span>{" "}
            <span className="font-medium text-ink">
              Versi {document.submissionVersion} (disetujui)
            </span>
          </div>
        </div>
      </div>

      {/* Daftar Berkas */}
      <div className="border-t border-border pt-4 flex flex-col gap-2.5">
        <span className="text-body font-semibold text-ink">
          Berkas ({document.files.length})
        </span>

        <ul className="divide-y divide-border rounded-md border border-border bg-surface-sunken">
          {document.files.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between p-2.5 text-body-sm gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon name="dokumen" size={16} className="text-ink-3 shrink-0" />
                <span className="font-medium text-ink truncate" title={file.name}>
                  {file.name}
                </span>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <span className="font-mono text-[11px] text-ink-3">
                  {file.sizeFormatted} · {file.checksum}
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-body-sm font-semibold text-primary hover:underline"
                >
                  <Icon name="unduh" size={13} />
                  Unduh
                </button>
              </div>
            </li>
          ))}
        </ul>

        {/* Tombol Unduh Semua */}
        <button
          type="button"
          onClick={handleDownloadAll}
          className="mt-1 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-body-sm font-semibold text-on-dark transition-colors hover:bg-primary-hover active:bg-primary-active shadow-sm"
        >
          <Icon name="unduh" size={15} />
          Unduh Semua
        </button>
      </div>

      {/* Catatan Bisnis Kearsipan Sesuai Wireframe L13 */}
      <div className="border-t border-border pt-4 flex flex-col gap-2 text-body-sm text-ink-3">
        <p className="text-ink-2">
          Satu tugas punya satu baris arsip. Revisi tidak menambah baris baru, hanya menambah versi.
        </p>

        <div>
          <Link
            href={`/tasks/${document.taskId}`}
            className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            Lihat tugas asal →
          </Link>
        </div>

        <p className="mt-1 text-[11px] text-ink-3 border-t border-border pt-2">
          Cakupan unduhan diperiksa pada setiap permintaan di sisi server.
        </p>
      </div>
    </aside>
  );
}
