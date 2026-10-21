"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/app/icons";
import { EmptyState } from "../states";
import type { NotificationListItem } from "@/db/queries/notifications";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "./actions";

export interface NotificationsClientProps {
  initialNotifications: NotificationListItem[];
  initialUnreadCount: number;
}

export default function NotificationsClient({
  initialNotifications,
  initialUnreadCount,
}: NotificationsClientProps) {
  const [notifications, setNotifications] =
    useState<NotificationListItem[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [filterMode, setFilterMode] = useState<"semua" | "belum_dibaca">("semua");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const unreadList = useMemo(
    () => notifications.filter((item) => !item.isRead),
    [notifications],
  );
  const readList = useMemo(
    () => notifications.filter((item) => item.isRead),
    [notifications],
  );

  function handleMarkAllAsRead() {
    if (unreadCount === 0 || isPending) return;

    const previousItems = notifications;
    const previousUnread = unreadCount;

    setNotifications((prev) =>
      prev.map((item) => (item.isRead ? item : { ...item, isRead: true })),
    );
    setUnreadCount(0);
    setError(null);

    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (result.error) {
        setNotifications(previousItems);
        setUnreadCount(previousUnread);
        setError(result.error);
      }
    });
  }

  async function handleOpen(
    event: React.MouseEvent<HTMLAnchorElement>,
    item: NotificationListItem,
  ) {
    if (item.isRead) return;
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();
    setNotifications((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, isRead: true } : row)),
    );
    setUnreadCount((current) => Math.max(0, current - 1));

    try {
      await markNotificationRead(item.id);
    } finally {
      window.location.assign(item.targetUrl);
    }
  }

  function renderRow(item: NotificationListItem) {
    const messageClass =
      item.tone === "error"
        ? "text-error"
        : item.tone === "warning"
          ? "text-warning"
          : "text-ink-3";

    return (
      <li
        key={item.id}
        className="flex flex-col gap-1.5 py-3.5 hover:bg-neutral-surface/40 px-2 rounded-md transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            {!item.isRead ? (
              <span
                aria-hidden="true"
                className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0"
              />
            ) : null}
            <div className="flex flex-col min-w-0">
              <span
                className={`text-body leading-snug ${
                  item.isRead ? "font-medium text-ink" : "font-semibold text-ink"
                }`}
              >
                {item.title}
              </span>
              <p className={`text-body-sm mt-0.5 ${messageClass}`}>
                {item.message}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="text-body-sm text-ink-3">{item.createdAtLabel}</span>
            <Link
              href={item.targetUrl}
              onClick={(event) => {
                void handleOpen(event, item);
              }}
              className="text-body-sm font-semibold text-primary hover:underline"
            >
              Buka tugas →
            </Link>
          </div>
        </div>
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-page">
      <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center tablet:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-h1 font-semibold text-ink">Notifikasi</h1>
            {unreadCount > 0 ? (
              <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-body-sm font-semibold text-on-dark">
                {unreadCount} baru
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-body text-ink-3">
            Pemberitahuan tugas, review, dan tenggat untuk akunmu.
          </p>
        </div>

        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={isPending}
            className="inline-flex h-9 items-center justify-center rounded-md border border-border-strong bg-surface px-3 text-body-sm font-semibold text-ink hover:bg-neutral-surface active:bg-border transition-colors self-start disabled:cursor-not-allowed disabled:opacity-60 tablet:self-auto"
          >
            {isPending ? "Menandai..." : "Tandai Semua Dibaca"}
          </button>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-error/30 bg-error-surface px-3 py-2 text-body-sm text-error"
        >
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2 border-b border-border pb-2 text-body-sm">
        <button
          type="button"
          onClick={() => setFilterMode("semua")}
          className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
            filterMode === "semua"
              ? "bg-neutral-surface text-ink"
              : "text-ink-3 hover:text-ink"
          }`}
        >
          Semua ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode("belum_dibaca")}
          className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
            filterMode === "belum_dibaca"
              ? "bg-neutral-surface text-ink"
              : "text-ink-3 hover:text-ink"
          }`}
        >
          Belum Dibaca ({unreadCount})
        </button>
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          title="Belum ada notifikasi"
          description="Pemberitahuan tugas baru, permintaan revisi, dan pengingat tenggat akan muncul di sini."
          reason="akun belum memiliki aktivitas atau pesan masuk."
          illustration="notifikasi"
        />
      ) : filterMode === "belum_dibaca" && unreadList.length === 0 ? (
        <div className="card p-8 text-center flex flex-col items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-surface text-ink-3">
            <Icon name="centang" size={24} />
          </span>
          <p className="mt-3 text-body font-semibold text-ink">
            Semua notifikasi telah dibaca
          </p>
          <p className="mt-1 text-body-sm text-ink-3 max-w-[280px]">
            Tidak ada pemberitahuan baru yang belum dibaca saat ini.
          </p>
        </div>
      ) : (
        <div className="card p-6 flex flex-col gap-6">
          {filterMode === "semua" && unreadList.length > 0 ? (
            <section aria-labelledby="heading-baru" className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span
                  id="heading-baru"
                  className="text-body-sm font-semibold tracking-wide text-ink-3"
                >
                  BARU
                </span>
                <span className="text-body-sm font-medium text-ink-3">
                  Belum Dibaca: {unreadCount}
                </span>
              </div>
              <ul className="divide-y divide-border">
                {unreadList.map(renderRow)}
              </ul>
            </section>
          ) : null}

          {filterMode === "belum_dibaca" ? (
            <ul className="divide-y divide-border">{unreadList.map(renderRow)}</ul>
          ) : null}

          {filterMode === "semua" && readList.length > 0 ? (
            <section
              aria-labelledby="heading-dibaca"
              className={`flex flex-col gap-3 ${
                unreadList.length > 0 ? "border-t border-border pt-4" : ""
              }`}
            >
              <div className="border-b border-border pb-2">
                <span
                  id="heading-dibaca"
                  className="text-body-sm font-semibold tracking-wide text-ink-3"
                >
                  SUDAH DIBACA
                </span>
              </div>
              <ul className="divide-y divide-border">
                {readList.map(renderRow)}
              </ul>
            </section>
          ) : null}

          <div className="border-t border-border pt-4 text-body-sm text-ink-3 space-y-1">
            <p>
              Jenis pemberitahuan mengikuti peran: staf menerima tugas, revisi,
              tenggat, dan pembatalan.
            </p>
            <p>
              Admin divisi menerima pemberitahuan pengumpulan masuk pada layar
              yang sama.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
