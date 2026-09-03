import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { AccountShell } from "@/components/account-shell";
import { AdminReplyForm } from "@/components/admin-reply-form";
import { createComplaintAction } from "@/lib/actions/complaints";
import { getCurrentProfile } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { accountDisplayName, formatPersonName } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const profile = await getCurrentProfile();
  const { locale, t } = await getI18n();
  const { error, saved } = await searchParams;

  if (!profile) return null;

  const isAdmin = profile.role === "admin";
  const supabase = await createClient();

  // Admin sees all complaints; regular users see only their own.
  const query = isAdmin
    ? supabase
        .from("complaints")
        .select(
          "id, subject, body, status, admin_reply, replied_at, created_at, resolved_at, user:profiles!complaints_user_id_fkey(email, full_name, nickname)",
        )
        .order("created_at", { ascending: false })
        .limit(50)
    : supabase
        .from("complaints")
        .select("id, subject, body, status, admin_reply, replied_at, created_at, resolved_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20);

  const { data: complaints } = await query;

  return (
    <AccountShell
      title={t.account.title}
      subtitle={`${accountDisplayName(profile)} · ${t.account.complaint}`}
      active="complaints"
    >
      {error ? (
        <p className="mb-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {saved === "complaint" ? (
        <p className="mb-6 rounded-md border border-brand/20 bg-brand/5 px-3 py-2 text-sm text-brand">
          {t.account.complaintSubmitted}
        </p>
      ) : null}
      {saved === "replied" ? (
        <p className="mb-6 rounded-md border border-brand/20 bg-brand/5 px-3 py-2 text-sm text-brand">
          {t.account.complaintReplied}
        </p>
      ) : null}

      <section className="rounded-lg border border-brand/10 bg-white/70 p-5">
        <h2 className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl text-foreground">
          <ChatBubbleLeftRightIcon className="size-6" aria-hidden />
          {isAdmin ? t.account.complaintAdminTitle : t.account.complaint}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          {isAdmin ? t.account.complaintAdminHint : t.account.complaintHint}
        </p>

        {/* Regular users can submit new complaints */}
        {!isAdmin ? (
          <form action={createComplaintAction} className="mt-5 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground">
                {t.account.complaintSubject}
              </span>
              <input
                name="subject"
                required
                maxLength={120}
                placeholder={t.account.complaintSubjectPlaceholder}
                className="w-full rounded-md border border-brand/15 bg-white px-3 py-2"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground">
                {t.account.complaintBody}
              </span>
              <textarea
                name="body"
                required
                rows={4}
                placeholder={t.account.complaintBodyPlaceholder}
                className="w-full rounded-md border border-brand/15 bg-white px-3 py-2"
              />
            </label>
            <button
              type="submit"
              className="rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-soft"
            >
              {t.account.complaintSubmit}
            </button>
          </form>
        ) : null}

        <ul
          className={`space-y-3 ${
            isAdmin ? "mt-5" : "mt-6 border-t border-brand/10 pt-5"
          }`}
        >
          {(complaints || []).length ? (
            (complaints as unknown[]).map((raw) => {
              const item = raw as {
                id: string;
                subject: string;
                body: string;
                status: string;
                admin_reply?: string | null;
                replied_at?: string | null;
                created_at: string;
                resolved_at?: string | null;
                user?:
                  | { email?: string; full_name?: string; nickname?: string }
                  | { email?: string; full_name?: string; nickname?: string }[]
                  | null;
              };
              const author = isAdmin
                ? Array.isArray(item.user)
                  ? item.user[0]
                  : item.user
                : null;
              const isOpen = item.status === "open";
              return (
                <li
                  key={item.id}
                  className={`rounded-md border px-4 py-3 ${
                    isOpen
                      ? "border-amber-200 bg-amber-50/60"
                      : "border-brand/10 bg-white/70"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{item.subject}</p>
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                        isOpen
                          ? "bg-amber-200/80 text-amber-950"
                          : "bg-brand/15 text-brand"
                      }`}
                    >
                      {isOpen
                        ? t.account.statusOpen
                        : t.account.statusResolved}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    {isAdmin && author
                      ? `${formatPersonName(author, "—")} · `
                      : ""}
                    {new Date(item.created_at).toLocaleString(
                      locale === "en" ? "en-US" : "ko-KR",
                    )}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                    {item.body}
                  </p>

                  {/* Show existing reply */}
                  {item.admin_reply ? (
                    <div className="mt-3 rounded-md border border-brand/15 bg-brand/5 px-3 py-2">
                      <p className="text-[11px] font-semibold text-brand uppercase">
                        {t.account.complaintReplyLabel}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                        {item.admin_reply}
                      </p>
                      {item.replied_at ? (
                        <p className="mt-1 text-xs text-ink-muted">
                          {new Date(item.replied_at).toLocaleString(
                            locale === "en" ? "en-US" : "ko-KR",
                          )}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Admin can reply to open complaints */}
                  {isAdmin && isOpen ? (
                    <AdminReplyForm complaintId={item.id} />
                  ) : null}
                </li>
              );
            })
          ) : (
            <li className="text-sm text-ink-muted">
              {isAdmin
                ? t.account.complaintAdminEmpty
                : t.account.complaintEmpty}
            </li>
          )}
        </ul>
      </section>
    </AccountShell>
  );
}
