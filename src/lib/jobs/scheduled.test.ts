import { describe, expect, it, vi } from "vitest";
import { DAILY_CRON, runScheduledJobs } from "./scheduled";

vi.mock("./sweep", () => ({
  sweepPendingAttachments: vi.fn(async () => ({
    attachmentsDeleted: 2,
    objectsDeleted: 2,
    objectsFailed: 0,
    submissionsDeleted: 1,
    pendingRemaining: 0,
  })),
  notifyDueSoon: vi.fn(async () => ({ created: 3 })),
}));

vi.mock("./deliveries", () => ({
  processDeliveries: vi.fn(async () => ({
    processed: 4,
    sent: 4,
    failed: 0,
    retrying: 0,
  })),
}));

const { sweepPendingAttachments, notifyDueSoon } = await import("./sweep");
const { processDeliveries } = await import("./deliveries");

describe("runScheduledJobs", () => {
  it("cron harian menjalankan sweep, tenggat dekat, dan antrean", async () => {
    vi.mocked(sweepPendingAttachments).mockClear();
    vi.mocked(notifyDueSoon).mockClear();
    vi.mocked(processDeliveries).mockClear();

    const summary = await runScheduledJobs(
      {} as never,
      {} as never,
      DAILY_CRON,
      1_800_000_000,
    );

    expect(summary.daily).toBe(true);
    expect(sweepPendingAttachments).toHaveBeenCalledTimes(1);
    expect(notifyDueSoon).toHaveBeenCalledTimes(1);
    expect(processDeliveries).toHaveBeenCalledTimes(1);
    expect(summary.dueSoonCreated).toBe(3);
    expect(summary.deliveries.sent).toBe(4);
  });

  it("cron per menit hanya memproses antrean pengiriman", async () => {
    vi.mocked(sweepPendingAttachments).mockClear();
    vi.mocked(processDeliveries).mockClear();

    const summary = await runScheduledJobs(
      {} as never,
      {} as never,
      "* * * * *",
      1_800_000_000,
    );

    expect(summary.daily).toBe(false);
    expect(sweepPendingAttachments).not.toHaveBeenCalled();
    expect(processDeliveries).toHaveBeenCalledTimes(1);
  });
});
