"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/app/icons";
import type { Role } from "@/db/schema";
import { initialsOf, isActive, pageTitle, type NavItem } from "@/lib/nav";

const APP_NAME = "Portal Manajemen Penugasan & Dokumen Divisi";

/**
 * Kerangka aplikasi (DESIGN-SYSTEM.md §5): sidebar tetap 220px di desktop,
 * top bar + laci di ponsel dan tablet. Judul top bar mengikuti item aktif.
 */
export default function Shell({
  nav,
  role,
  roleLabel,
  accountName,
  divisionName,
  unreadNotificationCount,
  logout,
  children,
}: {
  nav: readonly NavItem[];
  role: Role;
  roleLabel: string;
  accountName: string;
  divisionName: string;
  unreadNotificationCount: number;
  logout: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const drawerId = useId();
  const accountId = useId();
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerButtonRef = useRef<HTMLButtonElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const title = pageTitle(pathname, role);

  useEffect(() => {
    setDrawerOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.title = `${title} · ${APP_NAME}`;
  }, [title]);

  useEffect(() => {
    if (!drawerOpen) return;
    const container = drawerRef.current;
    const previous = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(container?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []);
    focusables()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      const first = items.at(0);
      const last = items.at(-1);
      if (!first || !last) return;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !container?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.documentElement.style.overflow = "";
      previous?.focus();
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!accountOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountOpen(false);
        accountButtonRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (accountRef.current?.contains(target) || accountButtonRef.current?.contains(target)) return;
      setAccountOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [accountOpen]);

  function renderNav(onNavigate?: () => void) {
    return (
      <ul className="space-y-1">
        {nav.map((item) => {
          if (!item.available) {
            return (
              <li key={item.href}>
                <span
                  aria-disabled="true"
                  title="Belum dibangun pada sprint ini"
                  className="flex items-start gap-2 rounded-md px-4 py-2 text-on-dark-muted"
                >
                  <span className="mt-0.5 shrink-0">
                    <Icon name={item.icon} />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-body">{item.label}</span>
                    <span className="text-body-sm">(menyusul)</span>
                  </span>
                </span>
              </li>
            );
          }
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-body transition-colors duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-dark motion-reduce:transition-none ${
                  active
                    ? "bg-primary font-medium text-on-dark"
                    : "text-on-dark-muted hover:bg-sidebar-hover hover:text-on-dark"
                }`}
              >
                <Icon name={item.icon} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="min-h-screen bg-background desktop:pl-[220px]">
      <aside className="fixed inset-y-0 left-0 z-[var(--z-sidebar)] hidden w-[220px] flex-col bg-sidebar desktop:flex">
        <div className="flex h-14 items-center px-5">
          <span className="text-body-sm font-medium text-on-dark-muted">[LOGO]</span>
        </div>
        <nav aria-label="Navigasi utama" className="flex-1 overflow-y-auto px-3 pb-4">
          {renderNav()}
        </nav>
      </aside>

      <header className="sticky top-0 z-[var(--z-sticky-header)] flex h-14 items-center gap-2 border-b border-border bg-surface px-4 tablet:gap-3 tablet:px-6">
        <div className="flex w-24 shrink-0 items-center desktop:w-auto">
          <button
            ref={drawerButtonRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-expanded={drawerOpen}
            aria-controls={drawerId}
            className="-ml-1 flex items-center gap-2 rounded-md px-2 py-2 text-body font-medium text-ink-2 transition-colors duration-[120ms] hover:bg-neutral-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light motion-reduce:transition-none desktop:hidden"
          >
            <Icon name="menu" />
            Menu
          </button>
        </div>

        <h1 className="min-w-0 flex-1 truncate text-center text-body font-semibold desktop:text-left desktop:text-h1">
          {title}
        </h1>

        <div className="flex w-24 shrink-0 items-center justify-end gap-2 tablet:gap-3 desktop:w-auto">
          <Link
            href="/notifications"
            aria-label={
              unreadNotificationCount > 0
                ? `Notifikasi, ${unreadNotificationCount} belum dibaca`
                : "Notifikasi"
            }
            className="relative inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-2 transition-colors duration-[120ms] hover:bg-neutral-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light motion-reduce:transition-none"
          >
            <Icon name="notifikasi" />
            {unreadNotificationCount > 0 ? (
              <span
                aria-hidden="true"
                className="absolute -right-0.5 -top-0.5 inline-flex min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-on-dark"
              >
                {unreadNotificationCount > 99
                  ? "99+"
                  : unreadNotificationCount}
              </span>
            ) : null}
          </Link>

          <span className="hidden text-body-sm text-ink-3 desktop:inline">{roleLabel}</span>

          <div className="relative">
            <button
              ref={accountButtonRef}
              type="button"
              onClick={() => setAccountOpen((open) => !open)}
              aria-haspopup="true"
              aria-expanded={accountOpen}
              aria-controls={accountId}
              aria-label={`Menu akun ${accountName}`}
              className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-border-strong bg-neutral-surface text-body-sm font-semibold text-ink-2 transition-colors duration-[120ms] hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light motion-reduce:transition-none desktop:h-8 desktop:w-8"
            >
              {initialsOf(accountName)}
            </button>

            {accountOpen ? (
              <div
                ref={accountRef}
                id={accountId}
                className="absolute right-0 top-full z-[var(--z-dropdown)] mt-2 w-64 rounded-lg border border-border bg-surface p-2 shadow-dialog"
              >
                <p className="px-2 pt-1 text-body font-medium text-ink">{accountName}</p>
                <p className="px-2 pb-2 text-body-sm text-ink-3">
                  {divisionName} · {roleLabel}
                </p>
                <div className="border-t border-border pt-1">
                  <Link
                    href="/account"
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-body text-ink transition-colors duration-[120ms] hover:bg-neutral-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-light"
                  >
                    <Icon name="akun" />
                    Akun Saya
                  </Link>
                </div>
                <div className="mt-1 border-t border-border px-2 pt-2">{logout}</div>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-page px-4 py-6 tablet:px-6">{children}</main>

      {drawerOpen ? (
        <>
          <div
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-[var(--z-sidebar)] bg-[var(--overlay-surface)] backdrop-blur-[var(--overlay-blur)] desktop:hidden"
          />
          <div
            ref={drawerRef}
            id={drawerId}
            role="dialog"
            aria-modal="true"
            aria-label="Navigasi"
            className="fixed inset-y-0 left-0 z-[var(--z-sidebar)] flex w-[280px] max-w-[85vw] flex-col bg-sidebar desktop:hidden"
          >
            <div className="flex h-14 items-center justify-between px-5">
              <span className="text-body-sm font-medium text-on-dark-muted">[LOGO]</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Tutup navigasi"
                className="flex h-8 w-8 items-center justify-center rounded-md text-on-dark-muted transition-colors duration-[120ms] hover:bg-sidebar-hover hover:text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-dark motion-reduce:transition-none"
              >
                <Icon name="tutup" />
              </button>
            </div>
            <nav aria-label="Navigasi utama" className="flex-1 overflow-y-auto px-3 pb-4">
              {renderNav(() => setDrawerOpen(false))}
            </nav>
          </div>
        </>
      ) : null}
    </div>
  );
}
