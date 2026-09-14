"use client";

import Link from "next/link";
import {
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { useI18n } from "@/components/locale-provider";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { SelectField } from "@/components/ui/select-field";
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
  const roleValue = member.role === "admin" ? "admin" : "user";

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

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          <span>{t.account.displayName}</span>
          <input
            name="display_name"
            defaultValue={member.nickname || ""}
            maxLength={40}
            placeholder={t.account.displayNamePlaceholder}
            className="w-full rounded-md border border-brand/15 bg-white px-3 py-2 font-normal"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          <span>{t.account.legalName}</span>
          <input
            name="full_name"
            defaultValue={member.full_name || ""}
            maxLength={80}
            placeholder={t.account.legalNamePlaceholder}
            className="w-full rounded-md border border-brand/15 bg-white px-3 py-2 font-normal"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          <span className="inline-flex items-center gap-1.5">
            <DevicePhoneMobileIcon className="size-4" aria-hidden />
            {t.account.phone}
          </span>
          <input
            name="phone"
            defaultValue={member.phone || ""}
            placeholder="01012345678"
            className="w-full rounded-md border border-brand/15 bg-white px-3 py-2 font-normal"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          <span className="inline-flex items-center gap-1.5">
            <EnvelopeIcon className="size-4" aria-hidden />
            {t.account.notificationEmail}
          </span>
          <input
            type="email"
            name="notification_email"
            defaultValue={member.notification_email || member.email || ""}
            placeholder="you@example.com"
            className="w-full rounded-md border border-brand/15 bg-white px-3 py-2 font-normal"
          />
          <span className="text-xs font-normal text-ink-muted">
            {t.account.notificationEmailHint}
          </span>
        </label>

        <SelectField
          label={t.admin.role}
          name="role"
          defaultValue={roleValue}
          disabled={isSelf}
          selectClassName="max-w-xs"
          options={[
            { value: "user", label: t.admin.roleUser },
            { value: "admin", label: t.admin.roleAdmin },
          ]}
          hint={isSelf ? t.errors.cannotDemoteSelf : t.admin.roleHint}
        />
        {isSelf ? <input type="hidden" name="role" value={roleValue} /> : null}

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
