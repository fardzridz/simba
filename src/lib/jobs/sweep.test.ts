import { describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { PENDING_TTL_SECONDS, sweepPendingAttachments } from "./sweep";

type Row = {
  id: string;
  storedKey: string;
  submissionId: string;
};

function makeDb(stale: Row[], orphanSubmissions: Array<{ id: string }>) {
  const deleteAttachment = vi.fn(async () => undefined);
  const deleteSubmission = vi.fn(async () => undefined);
  let selectCall = 0;

  const db = {
    select: () => {
      const call = selectCall++;
      if (call >= 2) {
        return {
          from: () => ({
            where: async () => [{ total: 0 }],
          }),
        };
      }
      return {
        from: () => ({
          where: () => ({
            limit: async () => (call === 0 ? stale : orphanSubmissions),
          }),
        }),
      };
    },
    delete: (table: object) => {
      if (getTableName(table as never) === "attachments") {
        return { where: deleteAttachment };
      }
      return { where: deleteSubmission };
    },
  };

  return { db, deleteAttachment, deleteSubmission };
}

describe("sweepPendingAttachments", () => {
  it("menghapus objek lebih dulu lalu barisnya", async () => {
    const { db, deleteAttachment } = makeDb(
      [{ id: "att_1", storedKey: "uploads/a.pdf", submissionId: "sub_1" }],
      [],
    );
    const bucket = { delete: vi.fn(async () => undefined) };

    const summary = await sweepPendingAttachments(
      { BUCKET: bucket } as never,
      db as never,
      1_800_000_000,
    );

    expect(bucket.delete).toHaveBeenCalledWith("uploads/a.pdf");
    expect(deleteAttachment).toHaveBeenCalledTimes(1);
    expect(summary.attachmentsDeleted).toBe(1);
    expect(summary.objectsDeleted).toBe(1);
    expect(summary.objectsFailed).toBe(0);
  });

  it("menghitung kegagalan R2 tanpa menghapus metadatanya", async () => {
    const { db, deleteAttachment } = makeDb(
      [{ id: "att_1", storedKey: "uploads/a.pdf", submissionId: "sub_1" }],
      [],
    );
    const bucket = {
      delete: vi.fn(async () => {
        throw new Error("R2 down");
      }),
    };

    const summary = await sweepPendingAttachments(
      { BUCKET: bucket } as never,
      db as never,
      1_800_000_000,
    );

    expect(deleteAttachment).not.toHaveBeenCalled();
    expect(summary.objectsFailed).toBe(1);
    expect(summary.attachmentsDeleted).toBe(0);
  });

  it("memakai ambang 24 jam", () => {
    expect(PENDING_TTL_SECONDS).toBe(86_400);
  });
});
