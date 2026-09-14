import type { UserRole } from "@/lib/types";

export function isStaffRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "manager";
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin";
}

export function parseUserRole(raw: string | null | undefined): UserRole {
  if (raw === "admin" || raw === "manager") return raw;
  return "user";
}
