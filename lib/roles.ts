import type { UserRole } from "@/lib/types";

/** Operational staff: admin console + notifications. */
export function isStaffRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "superadmin";
}

/** Top-level role: member edit/delete. */
export function isSuperAdminRole(role: string | null | undefined): boolean {
  return role === "superadmin";
}

/** @deprecated Use isSuperAdminRole — kept for call-site compatibility. */
export function isAdminRole(role: string | null | undefined): boolean {
  return isSuperAdminRole(role);
}

export function parseUserRole(raw: string | null | undefined): UserRole {
  if (raw === "superadmin" || raw === "admin") return raw;
  // Legacy values from before the rename.
  if (raw === "manager") return "admin";
  return "user";
}
