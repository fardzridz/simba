import { beforeEach, describe, expect, it, vi } from "vitest";
import { processDeliveries } from "./deliveries";

vi.mock("@/lib/channels/mail", async () => {
  const actual = await vi.importActual<typeof import("@/lib/channels/mail")>(
    "@/lib/channels/mail",
  );
  return {
    ...actual,
    isEmailConfigured: vi.fn(() => true),
    sendEmail: vi.fn(async () => undefined),
  };
});

vi.mock("@/lib/channels/fonnte", () => ({
  isWhatsAppConfigured: vi.fn(() => true),
  sendWhatsAppMessage: vi.fn(async () => "req-1"),
}));

const PROD = { APP_ENV: "production" } as never;
const { isEmailConfigured, sendEmail } = await import("@/lib/channels/mail");
const { isWhatsAppConfigured, sendWhatsAppMessage } = await import(
  "@/lib/channels/fonnte"
);

type Delivery = {
  id: string;
  channel: "EMAIL" | "WHATSAPP";
  attempts: number;
  email: string | null;
  emailVerifiedAt: Date | null;
  waNumber: string | null;
  waVerifiedAt: Date | null;
};

function makeDb(due: Delivery[]) {
  const updates: Array<Record<string, unknown>> = [];
  const db = {
    select: () => {
      const limit = async () =>
        due.map((row) => ({
          ...row,
          message: "Catatan admin: lampiran belum ditandatangani.",
          type: "REVISION_REQUESTED" as const,
          entityType: "assignment",
          entityId: "asg_1",
          taskId: "tsk_1",
          taskNumber: "HUK/2026/10/001",
          taskTitle: "Laporan A",
          dueAt: new Date(1_800_000_000_000),
        }));
      const where = () => ({ limit });
      return {
        from: () => ({
          innerJoin: () => ({
            innerJoin: () => ({
              leftJoin: () => ({ leftJoin: () => ({ where }) }),
            }),
          }),
        }),
      };
    },
    update: () => ({
      set: (values: Record<string, unknown>) => {
        updates.push(values);
        return { where: async () => undefined };
      },
    }),
  };
  return { db, updates };
}

describe("processDeliveries", () => {
  beforeEach(() => {
    vi.mocked(sendEmail).mockClear();
    vi.mocked(sendWhatsAppMessage).mockClear();
    vi.mocked(isEmailConfigured).mockReturnValue(true);
    vi.mocked(isWhatsAppConfigured).mockReturnValue(true);
  });

  it("tidak memakai jatah percobaan saat kanal belum dikonfigurasi", async () => {
    vi.mocked(isEmailConfigured).mockReturnValue(false);
    const { db, updates } = makeDb([
      {
        id: "dlv_0",
        channel: "EMAIL",
        attempts: 0,
        email: "staf@example.test",
        emailVerifiedAt: new Date(),
        waNumber: null,
        waVerifiedAt: null,
      },
    ]);

    const summary = await processDeliveries(PROD, db as never, 1_800_000_000);

    expect(sendEmail).not.toHaveBeenCalled();
    expect(summary.retrying).toBe(1);
    const held = updates.find((u) => u.status === "PENDING");
    expect(held?.lastError).toBe("Kanal belum dikonfigurasi.");
  });

  it("menandai SENT untuk kanal email yang terverifikasi", async () => {
    const { db, updates } = makeDb([
      {
        id: "dlv_1",
        channel: "EMAIL",
        attempts: 0,
        email: "staf@example.test",
        emailVerifiedAt: new Date(),
        waNumber: null,
        waVerifiedAt: null,
      },
    ]);

    const summary = await processDeliveries(PROD, db as never, 1_800_000_000);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const sent = vi.mocked(sendEmail).mock.calls[0]?.[1];
    expect(sent?.subject).toBe(
      "[Portal Penugasan] Perlu revisi · HUK/2026/10/001",
    );
    expect(sent?.text).toContain("Portal Penugasan · Bawaslu Kota Pasuruan");
    expect(sent?.text).toContain("*HUK/2026/10/001*");
    expect(summary.sent).toBe(1);
    expect(updates.some((u) => u.status === "SENT")).toBe(true);
  });

  it("menjadwalkan ulang saat penyedia gagal", async () => {
    vi.mocked(sendWhatsAppMessage).mockRejectedValueOnce(new Error("timeout"));

    const { db, updates } = makeDb([
      {
        id: "dlv_2",
        channel: "WHATSAPP",
        attempts: 1,
        email: null,
        emailVerifiedAt: null,
        waNumber: "+628123456789",
        waVerifiedAt: new Date(),
      },
    ]);

    const summary = await processDeliveries(PROD, db as never, 1_800_000_000);

    expect(summary.retrying).toBe(1);
    const retry = updates.find((u) => u.status === "PENDING" && u.attempts === 2);
    expect(retry).toBeTruthy();
    expect(retry?.lastError).toBe("Error");
  });

  it("gagal permanen bila alamat tidak lagi terverifikasi", async () => {
    const { db, updates } = makeDb([
      {
        id: "dlv_3",
        channel: "EMAIL",
        attempts: 0,
        email: "lama@example.test",
        emailVerifiedAt: null,
        waNumber: null,
        waVerifiedAt: null,
      },
    ]);

    const summary = await processDeliveries(PROD, db as never, 1_800_000_000);

    expect(sendEmail).not.toHaveBeenCalled();
    expect(summary.failed).toBe(1);
    expect(updates.some((u) => u.status === "FAILED")).toBe(true);
  });
});

describe("processDeliveries di luar produksi", () => {
  it("menahan pengiriman walau kredensial tersedia", async () => {
    vi.mocked(sendEmail).mockClear();
    const { db, updates } = makeDb([
      {
        id: "dlv_9",
        channel: "EMAIL",
        attempts: 0,
        email: "staf@example.test",
        emailVerifiedAt: new Date(),
        waNumber: null,
        waVerifiedAt: null,
      },
    ]);

    const summary = await processDeliveries({} as never, db as never, 1_800_000_000);

    expect(sendEmail).not.toHaveBeenCalled();
    expect(summary.retrying).toBe(1);
    expect(updates.find((u) => u.status === "PENDING")?.lastError).toContain(
      "dinonaktifkan",
    );
  });
});
