"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Icon } from "@/app/icons";
import { ASSIGNMENT_STATUSES, type AssignmentStatus } from "@/db/schema";
import { STATUS_LABEL } from "@/lib/status-view";
import type { TaskFilterFlag } from "@/db/queries/tasks";

export default function TaskFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentQ = searchParams.get("q") ?? "";
  const currentStatus = searchParams.get("status") as AssignmentStatus | null;
  const currentFlag = searchParams.get("flag") as TaskFilterFlag | null;

  const hasActiveFilters = Boolean(currentQ || currentStatus || currentFlag);

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    // Reset ke halaman 1 saat filter berubah
    params.delete("page");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleFlagToggle(flag: TaskFilterFlag) {
    if (currentFlag === flag) {
      updateParams({ flag: null });
    } else {
      updateParams({ flag });
    }
  }

  return (
    <div
      className={`rounded-lg border border-border bg-surface-sunken p-3 transition-opacity ${
        isPending ? "opacity-70" : "opacity-100"
      }`}
    >
      <div className="flex flex-col gap-3 desktop:flex-row desktop:items-center desktop:justify-between">
        {/* Kolom Kiri: Pencarian & Dropdown Status */}
        <div className="flex flex-1 flex-col gap-2.5 tablet:flex-row tablet:items-center">
          {/* Kotak Cari Nomor / Judul */}
          <div className="relative flex-1 tablet:max-w-[280px]">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">
              <Icon name="cari" size={16} />
            </span>
            <input
              type="search"
              placeholder="Cari nomor atau judul..."
              defaultValue={currentQ}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  updateParams({ q: e.currentTarget.value.trim() });
                }
              }}
              onBlur={(e) => {
                if (e.currentTarget.value.trim() !== currentQ) {
                  updateParams({ q: e.currentTarget.value.trim() });
                }
              }}
              className="h-9 w-full rounded-md border border-border-strong bg-surface pl-9 pr-3 text-body-sm text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
            />
          </div>

          {/* Pemilih Status Kanonik */}
          <div className="relative tablet:w-48">
            <select
              value={currentStatus ?? ""}
              onChange={(e) => updateParams({ status: e.target.value || null })}
              aria-label="Filter status tugas"
              className="h-9 w-full appearance-none rounded-md border border-border-strong bg-surface px-3 pr-8 text-body-sm text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
            >
              <option value="">Status: semua</option>
              {ASSIGNMENT_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {STATUS_LABEL[st]}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3">
              <Icon name="filter" size={14} />
            </span>
          </div>
        </div>

        {/* Kolom Kanan: Tombol Flag Penanda & Hapus Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Flag: Terlambat */}
          <button
            type="button"
            onClick={() => handleFlagToggle("terlambat")}
            aria-pressed={currentFlag === "terlambat"}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-body-sm font-medium transition-colors ${
              currentFlag === "terlambat"
                ? "border-error bg-error text-on-dark"
                : "border-border-strong bg-surface text-ink-2 hover:bg-neutral-surface"
            }`}
          >
            <Icon name="terlambat" size={13} />
            Terlambat
          </button>

          {/* Flag: Perlu Revisi */}
          <button
            type="button"
            onClick={() => handleFlagToggle("revisi")}
            aria-pressed={currentFlag === "revisi"}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-body-sm font-medium transition-colors ${
              currentFlag === "revisi"
                ? "border-warning bg-warning text-on-dark"
                : "border-border-strong bg-surface text-ink-2 hover:bg-neutral-surface"
            }`}
          >
            <Icon name="revisi" size={13} />
            Perlu Revisi
          </button>

          {/* Flag: Terarsip */}
          <button
            type="button"
            onClick={() => handleFlagToggle("terarsip")}
            aria-pressed={currentFlag === "terarsip"}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-body-sm font-medium transition-colors ${
              currentFlag === "terarsip"
                ? "border-primary bg-primary text-on-dark"
                : "border-border-strong bg-surface text-ink-2 hover:bg-neutral-surface"
            }`}
          >
            <Icon name="terarsip" size={13} />
            Terarsip
          </button>

          {/* Tombol Hapus Filter */}
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => {
                startTransition(() => {
                  router.push(pathname);
                });
              }}
              className="ml-1 text-body-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
            >
              Hapus filter
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
