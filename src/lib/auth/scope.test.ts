import { describe, expect, it } from "vitest";
import {
  assertAssignmentAccess,
  assertDivisionAccess,
  assertRole,
  canManageMasterData,
  canMutateTasks,
  canSubmitWork,
  canVerify,
  resolveScope,
} from "@/lib/auth/scope";

const staffA = resolveScope({ id: "usr_a", role: "USER", divisionId: "div_a" });
const staffB = resolveScope({ id: "usr_b", role: "USER", divisionId: "div_a" });
const adminA = resolveScope({ id: "usr_admin_a", role: "ADMIN", divisionId: "div_a" });
const adminB = resolveScope({ id: "usr_admin_b", role: "ADMIN", divisionId: "div_b" });
const superAdmin = resolveScope({ id: "usr_sa", role: "SUPER_ADMIN", divisionId: "div_a" });

describe("resolveScope", () => {
  it("hanya Super Admin yang mencakup seluruh divisi", () => {
    expect(superAdmin.allDivisions).toBe(true);
    expect(adminA.allDivisions).toBe(false);
    expect(staffA.allDivisions).toBe(false);
  });
});

describe("kewenangan per peran", () => {
  it("hanya Admin divisi yang boleh mengubah dan memverifikasi tugas", () => {
    expect(canMutateTasks(adminA)).toBe(true);
    expect(canMutateTasks(superAdmin)).toBe(false);
    expect(canMutateTasks(staffA)).toBe(false);
    expect(canVerify(adminA)).toBe(true);
    expect(canVerify(superAdmin)).toBe(false);
    expect(canVerify(staffA)).toBe(false);
  });

  it("hanya Super Admin yang mengelola master data, hanya staf yang mengumpulkan", () => {
    expect(canManageMasterData(superAdmin)).toBe(true);
    expect(canManageMasterData(adminA)).toBe(false);
    expect(canSubmitWork(staffA)).toBe(true);
    expect(canSubmitWork(adminA)).toBe(false);
  });
});

describe("isolasi data antar divisi", () => {
  it("menolak Admin divisi lain walau ID data diketahui", () => {
    expect(assertDivisionAccess(adminA, "div_a").ok).toBe(true);
    expect(assertDivisionAccess(adminB, "div_a")).toEqual({
      ok: false,
      status: 403,
      reason: expect.stringContaining("divisi"),
    });
  });

  it("mengizinkan Super Admin membaca lintas divisi", () => {
    expect(assertDivisionAccess(superAdmin, "div_b").ok).toBe(true);
  });

  it("membatasi pelaksana hanya pada penugasannya sendiri", () => {
    expect(assertAssignmentAccess(staffA, { userId: "usr_a", divisionId: "div_a" }).ok).toBe(true);
    expect(assertAssignmentAccess(staffB, { userId: "usr_a", divisionId: "div_a" })).toEqual({
      ok: false,
      status: 403,
      reason: expect.stringContaining("penugasan"),
    });
  });

  it("membatasi Admin pada divisinya, tanpa memandang pemilik penugasan", () => {
    expect(assertAssignmentAccess(adminA, { userId: "usr_a", divisionId: "div_a" }).ok).toBe(true);
    expect(assertAssignmentAccess(adminB, { userId: "usr_a", divisionId: "div_a" }).ok).toBe(false);
  });
});

describe("assertRole", () => {
  it("menerima peran yang diizinkan dan menolak sisanya", () => {
    expect(assertRole(adminA, ["ADMIN", "SUPER_ADMIN"]).ok).toBe(true);
    expect(assertRole(staffA, ["ADMIN", "SUPER_ADMIN"]).ok).toBe(false);
    expect(assertRole(superAdmin, ["SUPER_ADMIN"]).ok).toBe(true);
  });
});
