import { describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/db/schema";
import type { Db } from "@/env";
import type { Scope } from "@/lib/auth/scope";
import { archiveCountQuery, dashboardRowsQuery, taskCountQuery } from "./dashboard";

/** Koneksi dummy: pembangun query hanya dipakai untuk memeriksa SQL, tidak dieksekusi. */
function testDb(): Db {
  const binding = {
    prepare: () => {
      throw new Error("Query tidak boleh dieksekusi dalam uji SQL.");
    },
  } as unknown as D1Database;
  return drizzle(binding, { schema });
}

const scopeWith = (role: Scope["role"]): Scope => ({
  userId: "u1",
  role,
  divisionId: "d1",
  allDivisions: role === "SUPER_ADMIN",
});

describe("Cakupan dashboard per peran (§2)", () => {
  const db = testDb();

  it("baris penugasan USER hanya miliknya sendiri di divisinya", () => {
    const { sql, params } = dashboardRowsQuery(db, scopeWith("USER")).toSQL();
    expect(sql).toContain('"tasks"."division_id" = ?');
    expect(sql).toContain('"task_assignments"."user_id" = ?');
    expect(params).toEqual(["d1", "u1"]);
  });

  it("baris penugasan ADMIN memuat seluruh divisi tanpa filter user", () => {
    const { sql, params } = dashboardRowsQuery(db, scopeWith("ADMIN")).toSQL();
    expect(sql).toContain('"tasks"."division_id" = ?');
    expect(sql).not.toContain("user_id");
    expect(params).toEqual(["d1"]);
  });

  it("baris penugasan SUPER_ADMIN lintas divisi tanpa filter", () => {
    const { sql, params } = dashboardRowsQuery(db, scopeWith("SUPER_ADMIN")).toSQL();
    expect(sql).not.toContain("division_id");
    expect(sql).not.toContain("user_id");
    expect(params).toEqual([]);
  });

  it("jumlah judul tugas USER dari penugasannya sendiri", () => {
    const { sql, params } = taskCountQuery(db, scopeWith("USER")).toSQL();
    expect(sql).toContain('"tasks"."id" in (');
    expect(sql).toContain('"task_assignments"."user_id" = ?');
    expect(params).toEqual(["u1"]);
  });

  it("jumlah judul tugas ADMIN dari divisinya", () => {
    const { sql, params } = taskCountQuery(db, scopeWith("ADMIN")).toSQL();
    expect(sql).toContain('"tasks"."division_id" = ?');
    expect(sql).not.toContain("task_assignments");
    expect(params).toEqual(["d1"]);
  });

  it("jumlah judul tugas SUPER_ADMIN tanpa filter", () => {
    const { sql, params } = taskCountQuery(db, scopeWith("SUPER_ADMIN")).toSQL();
    expect(sql).not.toContain("division_id");
    expect(sql).not.toContain("task_assignments");
    expect(params).toEqual([]);
  });

  it("dokumen final USER hanya dari penugasannya sendiri", () => {
    const { sql, params } = archiveCountQuery(db, scopeWith("USER")).toSQL();
    expect(sql).toContain('"document_archive"."assignment_id" in (');
    expect(sql).toContain('"task_assignments"."user_id" = ?');
    expect(params).toEqual(["u1"]);
  });

  it("dokumen final ADMIN dari divisinya", () => {
    const { sql, params } = archiveCountQuery(db, scopeWith("ADMIN")).toSQL();
    expect(sql).toContain('"document_archive"."division_id" = ?');
    expect(sql).not.toContain("task_assignments");
    expect(params).toEqual(["d1"]);
  });

  it("dokumen final SUPER_ADMIN lintas divisi tanpa filter", () => {
    const { sql, params } = archiveCountQuery(db, scopeWith("SUPER_ADMIN")).toSQL();
    expect(sql).not.toContain("division_id");
    expect(sql).not.toContain("task_assignments");
    expect(params).toEqual([]);
  });
});
