"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/app/icons";
import { EmptyState } from "../states";
import {
  MOCK_ACTIVITY_LOGS,
  type MockActivityLog,
} from "@/lib/mock-logs";

export interface LogsClientProps {
  userRole?: "ADMIN" | "SUPER_ADMIN";
  userDivisionName?: string;
}

export default function LogsClient({
  userRole = "ADMIN",
  userDivisionName = "Hukum & Sengketa",
}: LogsClientProps) {
  const [selectedActor, setSelectedActor] = useState("semua");
  const [selectedAction, setSelectedAction] = useState("semua");
  const [selectedEntity, setSelectedEntity] = useState("semua");
  const [selectedPeriod, setSelectedPeriod] = useState<number | "semua">("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filter log aktivitas
  const filteredLogs: MockActivityLog[] = useMemo(() => {
    return MOCK_ACTIVITY_LOGS.filter((log) => {
      // Scope divisi untuk Admin Divisi
      if (userRole !== "SUPER_ADMIN") {
        if (
          log.divisionName.toLowerCase() !== userDivisionName.toLowerCase() &&
          log.actorRole !== "Super Admin"
        ) {
          return false;
        }
      }

      // Filter Pencarian kata kunci
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSummary = log.summary.toLowerCase().includes(q);
        const matchActor = log.actorName.toLowerCase().includes(q);
        const matchAction = log.actionCode.toLowerCase().includes(q);
        const matchEntity = log.entityId.toLowerCase().includes(q);
        if (!matchSummary && !matchActor && !matchAction && !matchEntity) {
          return false;
        }
      }

      // Filter Aktor
      if (selectedActor !== "semua") {
        if (selectedActor === "admin" && !log.actorRole.includes("Admin Divisi")) return false;
        if (selectedActor === "staf" && !log.actorRole.includes("Staf")) return false;
        if (selectedActor === "super_admin" && !log.actorRole.includes("Super Admin")) return false;
      }

      // Filter Aksi
      if (selectedAction !== "semua" && log.actionCode !== selectedAction) {
        return false;
      }

      // Filter Entitas
      if (selectedEntity !== "semua" && log.entityType !== selectedEntity) {
        return false;
      }

      // Filter Rentang Periode
      if (selectedPeriod !== "semua" && log.daysAgo > selectedPeriod) {
        return false;
      }

      return true;
    });
  }, [
    userRole,
    userDivisionName,
    searchQuery,
    selectedActor,
    selectedAction,
    selectedEntity,
    selectedPeriod,
  ]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      selectedActor !== "semua" ||
      selectedAction !== "semua" ||
      selectedEntity !== "semua" ||
      selectedPeriod !== "semua",
  );

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedActor("semua");
    setSelectedAction("semua");
    setSelectedEntity("semua");
    setSelectedPeriod("semua");
    setCurrentPage(1);
  };

  const totalLogs = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalLogs / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const startRecord = totalLogs === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalLogs);

  return (
    <div className="flex flex-col gap-6">
      {/* Header Halaman */}
      <div>
        <h1 className="text-h1 font-semibold text-ink">Log Aktivitas</h1>
        <p className="mt-1 text-body text-ink-3">
          Rekam jejak audit trail seluruh operasi data dan mutasi status di sistem.
        </p>
      </div>

      {/* Banner Immutability Log Sesuai Wireframe L15 */}
      <div className="rounded-lg border border-border bg-surface-sunken p-3 text-body-sm text-ink-2">
        <p>
          Log tidak dapat diubah atau dihapus lewat antarmuka. Hanya Admin divisi dan Super Admin yang dapat membukanya.
        </p>
      </div>

      {/* Baris Filter Audit Trail */}
      <div className="card p-3 flex flex-wrap items-center gap-3 bg-surface">
        {/* Kotak Cari Cepat */}
        <div className="relative flex-1 min-w-[200px] tablet:max-w-[240px]">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">
            <Icon name="cari" size={15} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari log atau nomor..."
            className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-body-sm text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
          />
        </div>

        {/* Pemilih Aktor */}
        <select
          value={selectedActor}
          onChange={(e) => {
            setSelectedActor(e.target.value);
            setCurrentPage(1);
          }}
          aria-label="Filter aktor log"
          className="h-8 rounded-md border border-border bg-surface px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
        >
          <option value="semua">Aktor: semua</option>
          <option value="admin">Admin Divisi</option>
          <option value="staf">Staf Pelaksana</option>
          <option value="super_admin">Super Admin</option>
        </select>

        {/* Pemilih Aksi */}
        <select
          value={selectedAction}
          onChange={(e) => {
            setSelectedAction(e.target.value);
            setCurrentPage(1);
          }}
          aria-label="Filter aksi log"
          className="h-8 rounded-md border border-border bg-surface px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
        >
          <option value="semua">Aksi: semua</option>
          <option value="submission.created">submission.created</option>
          <option value="due_date.extended">due_date.extended</option>
          <option value="assignment.reviewed">assignment.reviewed</option>
          <option value="task.created">task.created</option>
          <option value="task.cancelled">task.cancelled</option>
          <option value="user.division_changed">user.division_changed</option>
          <option value="session.login">session.login</option>
        </select>

        {/* Pemilih Entitas */}
        <select
          value={selectedEntity}
          onChange={(e) => {
            setSelectedEntity(e.target.value);
            setCurrentPage(1);
          }}
          aria-label="Filter entitas log"
          className="h-8 rounded-md border border-border bg-surface px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
        >
          <option value="semua">Entitas: semua</option>
          <option value="Penugasan">Penugasan</option>
          <option value="Tugas">Tugas</option>
          <option value="Pengguna">Pengguna</option>
          <option value="Sesi">Sesi</option>
        </select>

        {/* Pemilih Periode */}
        <select
          value={String(selectedPeriod)}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedPeriod(val === "semua" ? "semua" : Number(val));
            setCurrentPage(1);
          }}
          aria-label="Filter periode log"
          className="h-8 rounded-md border border-border bg-surface px-2.5 text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
        >
          <option value="semua">Periode: semua</option>
          <option value="7">Periode: 7 hari</option>
          <option value="30">Periode: 30 hari</option>
          <option value="90">Periode: 90 hari</option>
        </select>

        {/* Tombol Hapus Filter */}
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={resetFilters}
            className="ml-auto text-body-sm font-semibold text-primary hover:underline"
          >
            Hapus filter
          </button>
        ) : null}
      </div>

      {/* Tabel Log Aktivitas */}
      {totalLogs === 0 ? (
        <EmptyState
          title={
            hasActiveFilters
              ? "Belum ada log aktivitas pada filter ini"
              : "Belum ada aktivitas tercatat"
          }
          description={
            hasActiveFilters
              ? "Hapus filter untuk melihat rekaman audit trail sistem lainnya."
              : "Setiap aktivitas penugasan dan perubahan data akan tercatat otomatis di sini."
          }
          reason="rekaman aktivitas ada, namun tersaring habis oleh kombinasi filter yang aktif."
          illustration="rak"
          action={
            hasActiveFilters
              ? {
                  type: "button",
                  label: "Hapus filter",
                  variant: "secondary",
                  onClick: resetFilters,
                }
              : undefined
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body">
              <thead>
                <tr className="border-b border-border bg-neutral-surface/60 text-body-sm font-semibold text-ink-2">
                  <th scope="col" className="px-4 py-3">
                    Waktu
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Aktor
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Aksi
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Entitas
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Ringkasan perubahan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-surface/40 transition-colors">
                    {/* Kolom 1: Waktu */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-body-sm text-ink-2">
                      {log.timestampFormatted}
                    </td>

                    {/* Kolom 2: Aktor */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-ink text-body-sm">
                          {log.actorName}
                        </span>
                        <span className="text-[11px] text-ink-3">
                          {log.actorRole}
                        </span>
                      </div>
                    </td>

                    {/* Kolom 3: Kode Aksi Monospasi */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-mono text-body-sm font-medium text-ink bg-neutral-surface/80 px-2 py-0.5 rounded border border-border">
                        {log.actionCode}
                      </span>
                    </td>

                    {/* Kolom 4: Entitas */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="text-body-sm text-ink font-medium">
                          {log.entityType}
                        </span>
                        <span className="font-mono text-[11px] text-ink-3">
                          {log.entityId}
                        </span>
                      </div>
                    </td>

                    {/* Kolom 5: Ringkasan Perubahan */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="text-body-sm text-ink">
                          {log.summary}
                        </span>
                        {log.detailNote ? (
                          <span className="text-[11px] text-ink-3 mt-0.5">
                            {log.detailNote}
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Baris Informasi Paginasi & Edukasi Audit Trail */}
          <div className="flex flex-col gap-3 border-t border-border p-4 tablet:flex-row tablet:items-center tablet:justify-between text-body-sm text-ink-3">
            <span>
              Menampilkan {startRecord} sampai {endRecord} dari {totalLogs} aktivitas
            </span>

            {totalPages > 1 ? (
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => setCurrentPage(pg)}
                    className={`flex h-7 w-7 items-center justify-center rounded-md border text-body-sm font-semibold transition-colors ${
                      pg === currentPage
                        ? "border-primary bg-primary text-on-dark"
                        : "border-border bg-surface text-ink hover:bg-neutral-surface"
                    }`}
                  >
                    {pg}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Catatan Kaki Integritas Audit Trail */}
      <p className="text-body-sm text-ink-3">
        Nilai sebelum dan sesudah disimpan, sehingga perubahan dapat diperiksa tanpa membuka data aslinya.
      </p>
    </div>
  );
}
