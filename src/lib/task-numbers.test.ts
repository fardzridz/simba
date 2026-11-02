import { describe, expect, it } from "vitest";
import { taskNumber, taskNumberPrefix } from "./task-numbers";

/** 31 Okt 2026 08:00 WIB. */
const OCT_2026 = Math.floor(Date.UTC(2026, 9, 31, 1, 0) / 1000);
/** 16 Jan 2027 00:00 WIB (masih 15 Jan menurut UTC). */
const JAN_2027 = Math.floor(Date.UTC(2027, 0, 15, 17, 0) / 1000);

describe("taskNumber (§12 #4)", () => {
  it("berformat <KODE>/<YYYY>/<MM>/<NNN>", () => {
    expect(taskNumber("HUK", OCT_2026, 7)).toBe("HUK/2026/10/007");
  });

  it("mengisi nomor urut dengan nol sampai tiga digit", () => {
    expect(taskNumber("PGS", OCT_2026, 1)).toBe("PGS/2026/10/001");
    expect(taskNumber("PGS", OCT_2026, 12)).toBe("PGS/2026/10/012");
    expect(taskNumber("PGS", OCT_2026, 123)).toBe("PGS/2026/10/123");
    expect(taskNumber("PGS", OCT_2026, 1234)).toBe("PGS/2026/10/1234");
  });

  it("menganggap bulan dan tahun menurut Asia/Jakarta, bukan UTC", () => {
    expect(taskNumber("SEK", JAN_2027, 3)).toBe("SEK/2027/01/003");
    expect(taskNumberPrefix("SEK", JAN_2027)).toBe("SEK/2027/01/");
  });

  it("merapikan kode divisi menjadi huruf kapital tanpa spasi", () => {
    expect(taskNumber(" huk ", OCT_2026, 1)).toBe("HUK/2026/10/001");
    expect(taskNumberPrefix(" pgs ", OCT_2026)).toBe("PGS/2026/10/");
  });

  it("tidak pernah memakai nomor urut kosong", () => {
    expect(taskNumber("TND", OCT_2026, 0)).toBe("TND/2026/10/001");
  });
});
