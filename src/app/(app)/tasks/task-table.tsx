"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import StatusChip from "../status-chip";
import { Icon } from "@/app/icons";
import { LoadingButton } from "../loading-state";
import { startTask, cancelTask } from "./actions";
import { CancelTaskModal } from "./[id]/task-admin-dialogs";
import type { TaskListItem } from "@/db/queries/tasks";
import type { Priority } from "@/db/schema";
import { humanizeRemaining, isDueSoon, isOverdue, nowSeconds } from "@/lib/time";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

function formatWibDateShort(date: Date): string {
  const d = new Date(date.getTime() + 7 * 3600 * 1000);
  const day = d.getUTCDate();
  const month = MONTH_NAMES[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

const PRIORITY_LABEL: Record<Priority, string> = {
  RENDAH: "Rendah",
  SEDANG: "Sedang",
  TINGGI: "Tinggi",
  MENDESAK: "Mendesak",
};

const PRIORITY_STYLE: Record<Priority, string> = {
  RENDAH: "text-ink-3",
  SEDANG: "text-ink-2",
  TINGGI: "font-medium text-warning",
  MENDESAK: "font-semibold text-error",
};

export default function TaskTable({
  items,
  role = "USER",
  isUserRole,
}: {
  items: TaskListItem[];
  role?: "USER" | "ADMIN" | "SUPER_ADMIN";
  isUserRole?: boolean;
}) {
  const effectiveRole =
    isUserRole !== undefined
      ? isUserRole
        ? "USER"
        : role === "SUPER_ADMIN"
          ? "SUPER_ADMIN"
          : "ADMIN"
      : role;
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState<TaskListItem[]>(items);
  const now = nowSeconds();
  const [cancellingTask, setCancellingTask] = useState<TaskListItem | null>(null);

  const detailHref = (item: TaskListItem) =>
    `/tasks/${item.taskId}?assignment=${encodeURIComponent(item.assignmentId)}`;

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  function handleStart(assignmentId: string) {
    startTransition(async () => {
      const result = await startTask(assignmentId);
      if (result.error) {
        setActionError(result.error);
        return;
      }
      setActionError(null);
      setLocalItems((prev) =>
        prev.map((it) =>
          it.assignmentId === assignmentId
            ? { ...it, status: "SEDANG_DIKERJAKAN" }
            : it,
        ),
      );
    });
  }

  return (
    <>
      {actionError ? (
        <div
          role="alert"
          className="mb-4 rounded-md border border-error/30 bg-error-surface p-3 text-body-sm font-medium text-error"
        >
          {actionError}
        </div>
      ) : null}
      <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-body">
          <thead>
            <tr className="border-b border-border bg-surface-sunken">
              <th scope="col" className="label px-4 py-3 font-medium">
                Judul Tugas
              </th>
              <th scope="col" className="label px-4 py-3 font-medium">
                Tenggat
              </th>
              <th scope="col" className="label px-4 py-3 font-medium">
                Prioritas
              </th>
              <th scope="col" className="label px-4 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="label px-4 py-3 text-right font-medium">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {localItems.map((item) => {
              const dueSeconds = Math.floor(item.dueAt.getTime() / 1000);
              const overdue = isOverdue({
                dueAt: dueSeconds,
                status: item.status,
                now,
              });
              const dueSoon = isDueSoon({
                dueAt: dueSeconds,
                status: item.status,
                now,
              });

              // Format catatan tenggat
              let deadlineNotice: { text: string; style: string };
              if (item.status === "SELESAI") {
                deadlineNotice = {
                  text: item.completedAt
                    ? `Disetujui ${formatWibDateShort(item.completedAt)}`
                    : "Selesai",
                  style: "text-ink-3",
                };
              } else if (overdue) {
                const diffDays = Math.max(
                  1,
                  Math.floor((now - dueSeconds) / 86400),
                );
                deadlineNotice = {
                  text: `Terlambat ${diffDays} hari`,
                  style: "text-error font-medium",
                };
              } else if (dueSoon) {
                deadlineNotice = {
                  text: `Sisa ${humanizeRemaining(dueSeconds, now)}`,
                  style: "text-warning font-medium",
                };
              } else {
                deadlineNotice = {
                  text: `Sisa ${humanizeRemaining(dueSeconds, now)}`,
                  style: "text-ink-3",
                };
              }

              const isUrgent = overdue || dueSoon || item.priority === "MENDESAK";

              return (
                <tr
                  key={item.assignmentId}
                  className="transition-colors hover:bg-neutral-surface/40"
                >
                  {/* Kolom 1: Judul Tugas + Nomor Mono + Kategori */}
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-0.5">
                      <Link
                        href={detailHref(item)}
                        className="font-medium text-ink hover:text-primary hover:underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
                      >
                        {item.title}
                      </Link>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-body-sm text-ink-3">
                          {item.taskNumber}
                        </span>
                        <span className="text-body-sm text-border-strong">·</span>
                        <span className="text-body-sm text-ink-3">
                          {item.categoryName}
                        </span>
                        {effectiveRole !== "USER" && item.assignedUserName ? (
                          <>
                            <span className="text-body-sm text-border-strong">·</span>
                            <span className="inline-flex items-center gap-1.5">
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-surface border border-border text-[10px] font-semibold text-ink-2">
                                {item.assignedUserName
                                  .split(" ")
                                  .map((p) => p[0])
                                  .slice(0, 2)
                                  .join("")}
                              </span>
                              <span className="text-body-sm text-ink-2 font-medium">
                                {item.assignedUserName}
                              </span>
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </td>

                  {/* Kolom 2: Tenggat & Sisa Waktu */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-body text-ink">
                        {formatWibDateShort(item.dueAt)}
                      </span>
                      <span className={`text-body-sm ${deadlineNotice.style}`}>
                        {deadlineNotice.text}
                      </span>
                    </div>
                  </td>

                  {/* Kolom 3: Prioritas */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className={`text-body-sm ${PRIORITY_STYLE[item.priority]}`}>
                      {PRIORITY_LABEL[item.priority]}
                    </span>
                  </td>

                  {/* Kolom 4: Status + Flags */}
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col items-start gap-1">
                      <StatusChip status={item.status} />

                      {/* Penanda Flag Tambahan */}
                      {item.needsRevision && item.status !== "SELESAI" ? (
                        <span className="inline-flex items-center gap-1 rounded bg-error-surface px-1.5 py-0.5 text-body-sm font-medium text-error">
                          <Icon name="revisi" size={11} />
                          Perlu Revisi
                        </span>
                      ) : null}

                      {overdue && item.status !== "SELESAI" ? (
                        <span className="inline-flex items-center gap-1 rounded bg-error px-1.5 py-0.5 text-body-sm font-medium text-on-dark">
                          <Icon name="terlambat" size={11} />
                          Terlambat
                        </span>
                      ) : null}

                      {item.isArchived ? (
                        <span className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-body-sm text-ink-3">
                          <Icon name="terarsip" size={11} />
                          Terarsip
                        </span>
                      ) : null}
                    </div>
                  </td>

                  {/* Kolom 5: Aksi */}
                  {/* Kolom 5: Aksi Berdasarkan Peran */}
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    {effectiveRole === "USER" ? (
                      item.status === "BELUM_DIKERJAKAN" ? (
                        <LoadingButton
                          type="button"
                          loading={isPending}
                          loadingText="Memulai..."
                          variant="secondary"
                          onClick={() => handleStart(item.assignmentId)}
                          className="h-8 text-body-sm"
                        >
                          Mulai Kerjakan
                        </LoadingButton>
                      ) : item.status === "SEDANG_DIKERJAKAN" || (item.needsRevision && item.status !== "SELESAI") ? (
                        <Link
                          href={detailHref(item)}
                          className={`inline-flex h-8 items-center justify-center rounded-md px-3 text-body-sm font-semibold transition-colors duration-[120ms] ${
                            isUrgent
                              ? "bg-primary text-on-dark hover:bg-primary-hover active:bg-primary-active"
                              : "border border-border-strong bg-surface text-ink hover:bg-neutral-surface"
                          }`}
                        >
                          Kumpulkan Tugas
                        </Link>
                      ) : item.status === "MENUNGGU_VERIFIKASI" ? (
                        <Link
                          href={detailHref(item)}
                          className="inline-flex h-8 items-center rounded-md border border-border px-3 text-body-sm text-ink-3 hover:text-ink hover:bg-neutral-surface"
                        >
                          Lihat Berkas
                        </Link>
                      ) : item.status === "SELESAI" ? (
                        <Link
                          href={detailHref(item)}
                          className="inline-flex items-center gap-1 text-body-sm font-medium text-primary hover:underline"
                        >
                          <Icon name="unduh" size={14} />
                          Lihat Bukti Terarsip
                        </Link>
                      ) : (
                        <span className="text-body-sm text-ink-3">-</span>
                      )
                    ) : effectiveRole === "ADMIN" ? (
                      item.status === "MENUNGGU_VERIFIKASI" ? (
                        <Link
                          href={detailHref(item)}
                          className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-body-sm font-semibold text-on-dark transition-colors hover:bg-primary-hover active:bg-primary-active shadow-sm"
                        >
                          Tinjau
                        </Link>
                      ) : item.status === "SELESAI" ? (
                        <Link
                          href={detailHref(item)}
                          className="text-body-sm font-semibold text-primary hover:underline"
                        >
                          Lihat
                        </Link>
                      ) : item.status === "DIBATALKAN" ? (
                        <span className="text-body-sm text-ink-3">Dibatalkan</span>
                      ) : (
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/tasks/${item.taskId}/edit`}
                            className="text-body-sm font-semibold text-primary hover:underline"
                          >
                            Ubah
                          </Link>
                          <span className="text-body-sm text-ink-3">·</span>
                          <button
                            type="button"
                            onClick={() => setCancellingTask(item)}
                            className="text-body-sm font-semibold text-error hover:underline cursor-pointer"
                          >
                            Batalkan
                          </button>
                        </div>
                      )
                    ) : (
                      /* SUPER_ADMIN: Hanya aksi Lihat (baca-saja sesuai wireframe L12) */
                      <Link
                        href={detailHref(item)}
                        className="text-body-sm font-semibold text-primary hover:underline"
                      >
                        Lihat
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {cancellingTask ? (
        <CancelTaskModal
          isOpen={Boolean(cancellingTask)}
          onClose={() => setCancellingTask(null)}
          taskNumber={cancellingTask.taskNumber}
          taskTitle={cancellingTask.title}
          onCancelTask={async (reason) => {
            const result = await cancelTask(cancellingTask.taskId, reason);
            if (result.success) {
              setLocalItems((prev) =>
                prev.map((it) =>
                  it.taskId === cancellingTask.taskId
                    ? { ...it, status: "DIBATALKAN" }
                    : it,
                ),
              );
            }
            return result;
          }}
        />
      ) : null}
    </>
  );
}
