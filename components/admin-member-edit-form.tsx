"use client";

import Link from "next/link";
import {
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { useI18n } from "@/components/locale-provider";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { adminUpdateMemberAction } from "@/lib/actions/auth";
import { accountDisplayName } from "@/lib/utils";

export type EditableMember = {
  id: string;
  email: string | null;
  full_name: string | null;
  nickname: string | null;
  phone: string | null;
  notification_email: string | null;
  role: string;
};

export function AdminMemberEditForm({
  member,
  currentUserId,
}: {
  member: EditableMember;
  currentUserId: string;
}) {
  const { t } = useI18n();
  const isSelf = member.id === currentUserId;

  return (
    <section className="mt-8 rounded-lg border border-brand/10 bg-white/70 p-5">
      <h2 className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl text-foreground">
        <UserIcon className="size-6" aria-hidden />
        {t.admin.editMemberTitle}
      </h2>
      <p className="mt-1 text-sm text-ink-muted">{t.admin.editMemberBlurb}</p>
      <p className="mt-2 text-xs text-ink-muted">
        {accountDisplayName(member)}
        {member.email ? ` · ${member.email}` : ""}
      </p>

      <form action={adminUpdateMemberAction} className="mt-5 space-y-4">
        <input type="hidden" name="user_id" value={member.id} />

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">
            {t.account.displayName}
          </span>
          <input
            name="display_name"
            defaultValue={member.nickname || ""}
            maxLength={40}
            placeholder={t.account.displayNamePlaceholder}
            className="w-full rounded-md border border-brand/15 bg-white px-3 py-2"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">
            {t.account.legalName}
          </span>
          <input
            name="full_name"
            defaultValue={member.full_name || ""}
            maxLength={80}
            placeholder={t.account.legalNamePlaceholder}
            className="w-full rounded-md border border-brand/15 bg-white px-3 py-2"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
            <DevicePhoneMobileIcon className="size-4" aria-hidden />
            {t.account.phone}
          </span>
          <input
            name="phone"
            defaultValue={member.phone || ""}
            placeholder="01012345678"
            className="w-full rounded-md border border-brand/15 bg-white px-3 py-2"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
            <EnvelopeIcon className="size-4" aria-hidden />
            {t.account.notificationEmail}
          </span>
          <input
            type="email"
            name="notification_email"
            defaultValue={member.notification_email || member.email || ""}
            placeholder="you@example.com"
            className="w-full rounded-md border border-brand/15 bg-white px-3 py-2"
          />
          <span className="text-xs text-ink-muted">
            {t.account.notificationEmailHint}
          </span>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-foreground">
            {t.admin.role}
          </span>
          <select
            name="role"
            defaultValue={member.role === "admin" ? "admin" : "user"}
            disabled={isSelf}
            className="w-full max-w-xs rounded-md border border-brand/15 bg-white px-3 py-2 text-sm outline-none focus:border-brand disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="user">{t.admin.roleUser}</option>
            <option value="admin">{t.admin.roleAdmin}</option>
          </select>
          {isSelf ? (
            <input
              type="hidden"
              name="role"
              value={member.role === "admin" ? "admin" : "user"}
            />
          ) : null}
          <span className="block text-xs text-ink-muted">
            {isSelf ? t.errors.cannotDemoteSelf : t.admin.roleHint}
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <PendingSubmitButton
            pendingLabel={t.common.loading}
            className="rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-soft disabled:cursor-wait disabled:opacity-70"
          >
            {t.admin.editMemberSave}
          </PendingSubmitButton>
          <Link
            href="/admin?tab=members"
            className="text-sm font-medium text-ink-muted hover:text-brand"
          >
            {t.admin.editMemberCancel}
          </Link>
        </div>
      </form>
    </section>
  );
}
