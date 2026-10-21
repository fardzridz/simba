import type { Role } from "@/db/schema";

/**
 * Cakupan data per peran (§2). Semua query wajib lewat sini: pemeriksaan di
 * komponen tabel tidak dihitung sebagai pengamanan.
 */
export type Actor = {
  id: string;
  role: Role;
  divisionId: string;
};

export type Scope = {
  userId: string;
  role: Role;
  divisionId: string;
  allDivisions: boolean;
};

export type Denial = {
  ok: false;
  status: 403;
  reason: string;
};

export type AccessDecision = { ok: true } | Denial;

export function resolveScope(actor: Actor): Scope {
  return {
    userId: actor.id,
    role: actor.role,
    divisionId: actor.divisionId,
    allDivisions: actor.role === "SUPER_ADMIN",
  };
}

/** Super Admin bersifat baca-saja untuk data tugas (§2 aturan 3). */
export function canMutateTasks(scope: Scope): boolean {
  return scope.role === "ADMIN";
}

export function canVerify(scope: Scope): boolean {
  return scope.role === "ADMIN";
}

export function canManageMasterData(scope: Scope): boolean {
  return scope.role === "SUPER_ADMIN";
}

export function canSubmitWork(scope: Scope): boolean {
  return scope.role === "USER";
}

export function assertDivisionAccess(scope: Scope, divisionId: string): AccessDecision {
  if (scope.allDivisions) return { ok: true };
  if (scope.divisionId !== divisionId) {
    return { ok: false, status: 403, reason: "Data di luar divisi Anda." };
  }
  return { ok: true };
}

/** Pelaksana hanya boleh menyentuh penugasan miliknya sendiri (§2 aturan 1). */
export function assertAssignmentAccess(scope: Scope, assignment: { userId: string; divisionId: string }): AccessDecision {
  if (scope.role === "USER") {
    return scope.userId === assignment.userId
      ? { ok: true }
      : { ok: false, status: 403, reason: "Data di luar penugasan Anda." };
  }
  return assertDivisionAccess(scope, assignment.divisionId);
}

export function assertRole(scope: Scope, allowed: readonly Role[]): AccessDecision {
  return allowed.includes(scope.role) ? { ok: true } : { ok: false, status: 403, reason: "Peran Anda tidak berwenang." };
}
