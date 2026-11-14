import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Penyambungan `retry` ke komponen keadaan galat.
 *
 * `RouteError` memanggil `useEffect`, jadi ia harus dirender sebagai elemen
 * React, bukan dipanggil sebagai fungsi biasa. Komponen keadaan galat diganti
 * tiruan supaya props yang diterima bisa diperiksa langsung.
 */
const captured = vi.hoisted(() => ({
  props: null as null | {
    onRetry?: () => void;
    retryLabel?: string;
    title: string;
    actionHref?: string;
  },
}));

vi.mock("./error-state", () => ({
  default: (props: {
    onRetry?: () => void;
    retryLabel?: string;
    title: string;
    actionHref?: string;
  }) => {
    captured.props = props;
    return <div data-testid="error-state-tiruan">{props.title}</div>;
  },
}));

const { default: RouteError } = await import("./route-error");

describe("Penyambungan aksi pemulihan (route-error)", () => {
  it("meneruskan retry dari Next.js ke onRetry komponen keadaan galat", () => {
    const retry = vi.fn();

    renderToStaticMarkup(
      <RouteError
        moduleName="Modul Uji"
        title="Gagal memuat"
        description="Data tidak dapat diambil saat ini."
        error={new Error("boom")}
        retry={retry}
      />,
    );

    expect(captured.props).not.toBeNull();
    expect(captured.props!.onRetry).toBe(retry);
  });

  it("memakai label pemulihan bawaan yang menyebut tindakannya", () => {
    renderToStaticMarkup(
      <RouteError
        moduleName="Modul Uji"
        title="Gagal memuat"
        description="Data tidak dapat diambil saat ini."
        error={new Error("boom")}
        retry={vi.fn()}
      />,
    );

    expect(captured.props!.retryLabel).toBe("Coba muat ulang");
  });

  it("meneruskan aksi keluar khusus modul ke komponen keadaan galat", () => {
    renderToStaticMarkup(
      <RouteError
        moduleName="Modul Uji"
        title="Gagal memuat"
        description="Data tidak dapat diambil saat ini."
        error={new Error("boom")}
        retry={vi.fn()}
        actionHref="/tasks"
      />,
    );

    expect(captured.props!.actionHref).toBe("/tasks");
  });
});
