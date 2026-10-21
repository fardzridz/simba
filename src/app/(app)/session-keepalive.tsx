"use client";

import { useEffect, useRef } from "react";

const THROTTLE_MS = 5 * 60 * 1000;

/**
 * Titik perpanjangan sesi. Dikirim hanya saat ada interaksi pengguna, dengan
 * jeda 5 menit antarpermintaan, supaya tab yang dibiarkan terbuka tetap kedaluwarsa.
 */
export default function SessionKeepalive() {
  const last = useRef(0);

  useEffect(() => {
    const ping = () => {
      const now = Date.now();
      if (now - last.current < THROTTLE_MS) return;
      last.current = now;
      void fetch("/api/session/refresh", { method: "POST", keepalive: true }).catch(() => {});
    };

    window.addEventListener("pointerdown", ping);
    window.addEventListener("keydown", ping);
    return () => {
      window.removeEventListener("pointerdown", ping);
      window.removeEventListener("keydown", ping);
    };
  }, []);

  return null;
}
