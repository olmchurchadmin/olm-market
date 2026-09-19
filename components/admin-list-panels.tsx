"use client";

import {
  ExclamationTriangleIcon,
  PencilSquareIcon,
  ShoppingBagIcon,
  TagIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminDeleteMemberButton } from "@/components/admin-delete-member-button";
import { AdminMemberEditForm } from "@/components/admin-member-edit-form";
import { AdminOrderActions } from "@/components/admin-order-actions";
import { AdminReplyForm } from "@/components/admin-reply-form";
import {
  AdminSearchableSection,
  matchesSearch,
} from "@/components/admin-searchable-section";
import { DeleteComplaintButton } from "@/components/delete-complaint-button";
import { DeleteCompletedOrderButton } from "@/components/delete-completed-order-button";
import { DeleteListingButton } from "@/components/delete-listing-button";
import { FeatureListingButton } from "@/components/feature-listing-button";
import { ResolveComplaintButton } from "@/components/resolve-complaint-button";
import { useI18n } from "@/components/locale-provider";
import { listingDescription, listingTitle } from "@/lib/i18n/listings";
import type { Listing } from "@/lib/types";
import {
  accountDisplayName,
  formatListingPublicId,
  formatPersonName,
  formatPrice,
  listingImageUrl,
  listingStatusLabel,
  orderStatusLabel,
} from "@/lib/utils";

type SellerInfo = {
  email?: string | null;
  full_name?: string | null;
  nickname?: string | null;
};

type ListingRow = Listing & {
  seller?: SellerInfo | SellerInfo[] | null;
};

type MemberRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  nickname: string | null;
  phone: string | null;
  notification_email?: string | null;
  role: string;
  created_at: string;
};

type ComplaintUser = {
  email: string | null;
  full_name: string | null;
  nickname: string | null;
};

type ComplaintRow = {
  id: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  admin_reply?: string | null;
  user?: ComplaintUser | ComplaintUser[] | null;
};

function firstPerson<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] || null : value;
}

function AdminFilterTabs<K extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: K; label: string }[];
  active: K;
  onChange: (key: K) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              isActive
                ? "bg-brand text-white shadow-sm"
                : "bg-white text-foreground ring-1 ring-brand/10 hover:bg-neutral-100"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function AdminListingsPanel({ listings }: { listings: ListingRow[] }) {
  const { locale, t } = useI18n();

  return (
    <AdminSearchableSection
      title={t.admin.listingsTab}
      icon={<TagIcon className="size-6" aria-hidden />}
      placeholder={t.admin.listingsSearchPlaceholder}
    >
      {(query) => {
        const filtered = listings.filter((listing) => {
          const seller = firstPerson(listing.seller);
          return matchesSearch(
            query,
            listingTitle(listing, locale),
            listingDescription(listing, locale),
            listing.title,
            listing.description,
            listing.status,
            formatListingPublicId(listing.id),
            listing.id,
            seller?.email,
            seller?.full_name,
            seller?.nickname,
            formatPersonName(seller, ""),
          );
        });

        if (!listings.length) {
          return <p className="text-sm text-ink-muted">{t.admin.noListings}</p>;
        }
        if (!filtered.length) {
          return (
            <p className="text-sm text-ink-muted">{t.admin.noSearchResults}</p>
          );
        }

        return (
          <ul className="space-y-3">
            {filtered.map((listing) => {
              const seller = firstPerson(listing.seller);
              const thumb = listingImageUrl(listing.cover_image_path);
              return (
                <li
                  key={listing.id}
                  className="flex gap-3 rounded-lg border border-brand/10 bg-white/70 p-3"
                >
                  <Link
                    href={`/market/${listing.id}`}
                    className="relative size-16 shrink-0 overflow-hidden rounded-md bg-[linear-gradient(135deg,#dfe8e2,#f7f3ea)] sm:size-20"
                  >
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover object-center"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] text-ink-muted">
                        {t.market.noImage}
                      </span>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] text-ink-muted">
                          {t.market.listingId} {formatListingPublicId(listing.id)}
                        </p>
                        <Link
                          href={`/market/${listing.id}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {listingTitle(listing, locale)}
                        </Link>
                        <p className="text-sm text-ink-muted">
                          {formatPrice(listing.price_cents, locale)} ·{" "}
                          {listingStatusLabel(listing.status, t.status)} ·{" "}
                          {listing.pickup_method === "seller_location"
                            ? t.market.pickupSeller
                            : t.market.pickupChurch}
                          {listing.is_featured ? ` · ${t.market.featured}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-ink-muted">
                          {t.admin.seller}: {formatPersonName(seller, "—")}
                          {seller?.email ? ` · ${seller.email}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <FeatureListingButton
                          listingId={listing.id}
                          featured={Boolean(listing.is_featured)}
                        />
                        <Link
                          href={`/sell/${listing.id}/edit`}
                          className="inline-flex items-center gap-1 rounded-md border border-brand/15 bg-white px-2.5 py-1 text-xs font-medium text-foreground hover:bg-brand/5"
                        >
                          <PencilSquareIcon className="size-3.5" aria-hidden />
                          {t.account.edit}
                        </Link>
                        <DeleteListingButton listingId={listing.id} />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        );
      }}
    </AdminSearchableSection>
  );
}

export function AdminMembersPanel({
  members,
  currentUserId,
  editingMemberId,
  canManageMembers = false,
}: {
  members: MemberRow[];
  currentUserId: string;
  editingMemberId?: string | null;
  canManageMembers?: boolean;
}) {
  const { locale, t } = useI18n();
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());

  // Fresh server payload wins after redirect/refresh.
  useEffect(() => {
    setHiddenIds(new Set());
  }, [members]);

  const visibleMembers = members.filter((member) => !hiddenIds.has(member.id));
  const editingMember =
    canManageMembers && editingMemberId
      ? members.find((member) => member.id === editingMemberId) || null
      : null;

  if (editingMember) {
    return (
      <AdminMemberEditForm
        currentUserId={currentUserId}
        member={{
          id: editingMember.id,
          email: editingMember.email,
          full_name: editingMember.full_name,
          nickname: editingMember.nickname,
          phone: editingMember.phone,
          notification_email: editingMember.notification_email ?? null,
          role: editingMember.role,
        }}
      />
    );
  }

  function roleLabel(role: string) {
    if (role === "admin") return t.admin.roleAdmin;
    if (role === "manager") return t.admin.roleManager;
    return t.admin.roleUser;
  }

  return (
    <AdminSearchableSection
      title={t.admin.members}
      icon={<UsersIcon className="size-6" aria-hidden />}
      placeholder={t.admin.membersSearchPlaceholder}
    >
      {(query) => {
        const filtered = visibleMembers.filter((member) =>
          matchesSearch(
            query,
            accountDisplayName(member),
            member.email,
            member.phone,
            member.role,
            member.full_name,
            member.nickname,
          ),
        );

        return (
          <>
            {!canManageMembers ? (
              <p className="mb-3 text-xs text-ink-muted">
                {t.admin.membersReadOnlyHint}
              </p>
            ) : null}

            {!visibleMembers.length ? (
              <p className="rounded-lg border border-brand/10 bg-white/70 px-4 py-6 text-sm text-ink-muted">
                {t.admin.noMembers}
              </p>
            ) : !filtered.length ? (
              <p className="rounded-lg border border-brand/10 bg-white/70 px-4 py-6 text-sm text-ink-muted">
                {t.admin.noSearchResults}
              </p>
            ) : (
              <>
                <ul className="space-y-3 sm:hidden">
                  {filtered.map((member) => {
                    const label = accountDisplayName(member);
                    const canDelete =
                      canManageMembers &&
                      member.id !== currentUserId &&
                      member.role !== "admin";
                    return (
                      <li
                        key={member.id}
                        className="rounded-lg border border-brand/10 bg-white/70 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">
                              {label}
                            </p>
                            <p className="mt-0.5 break-all text-sm text-ink-muted">
                              {member.email || "—"}
                            </p>
                          </div>
                          {member.role === "admin" ? (
                            <span className="shrink-0 rounded bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                              {roleLabel(member.role)}
                            </span>
                          ) : member.role === "manager" ? (
                            <span className="shrink-0 rounded bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-foreground">
                              {roleLabel(member.role)}
                            </span>
                          ) : (
                            <span className="shrink-0 text-xs font-medium text-ink-muted">
                              {roleLabel(member.role)}
                            </span>
                          )}
                        </div>
                        <dl className="mt-3 grid gap-1.5 text-sm">
                          <div className="flex justify-between gap-3">
                            <dt className="text-ink-muted">{t.admin.phone}</dt>
                            <dd className="text-right text-foreground">
                              {member.phone || "—"}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-3">
                            <dt className="text-ink-muted">{t.admin.joined}</dt>
                            <dd className="whitespace-nowrap text-right text-foreground">
                              {new Date(member.created_at).toLocaleDateString(
                                locale === "en" ? "en-US" : "ko-KR",
                              )}
                            </dd>
                          </div>
                        </dl>
                        {canManageMembers ? (
                          <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-brand/10 pt-3">
                            <Link
                              href={`/admin?tab=members&edit=${member.id}`}
                              title={t.admin.editMember}
                              aria-label={`${t.admin.editMember}: ${label}`}
                              className="inline-flex size-8 items-center justify-center rounded-md border border-brand/15 bg-white text-foreground hover:bg-brand/5"
                            >
                              <PencilSquareIcon
                                className="size-4"
                                aria-hidden
                              />
                            </Link>
                            {canDelete ? (
                              <AdminDeleteMemberButton
                                memberId={member.id}
                                memberLabel={label}
                                onDeleteStart={(id) =>
                                  setHiddenIds((prev) => new Set(prev).add(id))
                                }
                              />
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>

                <div className="hidden overflow-x-auto rounded-lg border border-brand/10 bg-white/70 sm:block">
                  <table className="w-full min-w-[40rem] text-left text-sm">
                    <thead className="border-b border-brand/10 text-ink-muted">
                      <tr>
                        <th className="px-4 py-3 font-medium">{t.admin.name}</th>
                        <th className="px-4 py-3 font-medium">
                          {t.admin.email}
                        </th>
                        <th className="px-4 py-3 font-medium">
                          {t.admin.phone}
                        </th>
                        <th className="px-4 py-3 font-medium">{t.admin.role}</th>
                        <th className="px-4 py-3 font-medium">
                          {t.admin.joined}
                        </th>
                        <th className="px-4 py-3 font-medium">
                          <span className="sr-only">{t.admin.editMember}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((member) => {
                        const label = accountDisplayName(member);
                        const canDelete =
                          canManageMembers &&
                          member.id !== currentUserId &&
                          member.role !== "admin";
                        return (
                          <tr
                            key={member.id}
                            className="border-t border-brand/5"
                          >
                            <td className="whitespace-nowrap px-4 py-3">
                              {label}
                            </td>
                            <td className="px-4 py-3">
                              <span className="block max-w-[16rem] truncate">
                                {member.email || "—"}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              {member.phone || "—"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              {member.role === "admin" ? (
                                <span className="rounded bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                                  {roleLabel(member.role)}
                                </span>
                              ) : member.role === "manager" ? (
                                <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-foreground">
                                  {roleLabel(member.role)}
                                </span>
                              ) : (
                                roleLabel(member.role)
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              {new Date(member.created_at).toLocaleDateString(
                                locale === "en" ? "en-US" : "ko-KR",
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {canManageMembers ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <Link
                                    href={`/admin?tab=members&edit=${member.id}`}
                                    title={t.admin.editMember}
                                    aria-label={`${t.admin.editMember}: ${label}`}
                                    className="inline-flex size-8 items-center justify-center rounded-md border border-brand/15 bg-white text-foreground hover:bg-brand/5"
                                  >
                                    <PencilSquareIcon
                                      className="size-4"
                                      aria-hidden
                                    />
                                  </Link>
                                  {canDelete ? (
                                    <AdminDeleteMemberButton
                                      memberId={member.id}
                                      memberLabel={label}
                                      onDeleteStart={(id) =>
                                        setHiddenIds((prev) =>
                                          new Set(prev).add(id),
                                        )
                                      }
                                    />
                                  ) : null}
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        );
      }}
    </AdminSearchableSection>
  );
}

export function AdminComplaintsPanel({
  complaints,
}: {
  complaints: ComplaintRow[];
}) {
  const { locale, t } = useI18n();
  const [statusTab, setStatusTab] = useState<"open" | "resolved">("open");
  const openItems = complaints.filter((c) => c.status === "open");
  const resolvedItems = complaints.filter((c) => c.status === "resolved");

  return (
    <AdminSearchableSection
      title={t.admin.complaints}
      icon={<ExclamationTriangleIcon className="size-6" aria-hidden />}
      placeholder={t.admin.complaintsSearchPlaceholder}
    >
      {(query) => {
        const matchesComplaint = (item: ComplaintRow) => {
          const user = firstPerson(item.user);
          return matchesSearch(
            query,
            item.subject,
            item.body,
            item.status,
            item.admin_reply,
            user?.email,
            user?.full_name,
            user?.nickname,
            user ? accountDisplayName(user) : "",
          );
        };
        const source = statusTab === "open" ? openItems : resolvedItems;
        const filtered = source.filter(matchesComplaint);

        return (
          <>
            <AdminFilterTabs
              active={statusTab}
              onChange={setStatusTab}
              tabs={[
                {
                  key: "open",
                  label: `${t.admin.unresolved} (${openItems.length})`,
                },
                {
                  key: "resolved",
                  label: `${t.admin.resolved} (${resolvedItems.length})`,
                },
              ]}
            />
            <ul className="mt-4 space-y-3">
              {filtered.length ? (
                filtered.map((item) => {
                  const user = firstPerson(item.user);
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
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground">
                              {item.subject}
                            </p>
                            <span
                              className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                                isOpen
                                  ? "bg-amber-200/80 text-amber-950"
                                  : "bg-brand/15 text-brand"
                              }`}
                            >
                              {isOpen ? t.admin.unresolved : t.admin.resolved}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-ink-muted">
                            {user
                              ? `${accountDisplayName(user)} · ${user.email || ""}`
                              : "—"}{" "}
                            ·{" "}
                            {new Date(item.created_at).toLocaleString(
                              locale === "en" ? "en-US" : "ko-KR",
                            )}
                            {!isOpen && item.resolved_at
                              ? ` · ${t.admin.resolved} ${new Date(
                                  item.resolved_at,
                                ).toLocaleString(
                                  locale === "en" ? "en-US" : "ko-KR",
                                )}`
                              : ""}
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                            {item.body}
                          </p>
                          {item.admin_reply ? (
                            <p className="mt-2 rounded-md bg-brand/5 px-3 py-2 text-sm text-foreground">
                              {item.admin_reply}
                            </p>
                          ) : null}
                          {isOpen ? (
                            <AdminReplyForm complaintId={item.id} />
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-wrap items-start gap-2">
                          {isOpen ? (
                            <ResolveComplaintButton complaintId={item.id} />
                          ) : null}
                          <DeleteComplaintButton
                            complaintId={item.id}
                            subject={item.subject}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="text-sm text-ink-muted">
                  {source.length && query
                    ? t.admin.noSearchResults
                    : t.admin.noComplaints}
                </li>
              )}
            </ul>
          </>
        );
      }}
    </AdminSearchableSection>
  );
}

type TradePerson = {
  email?: string | null;
  full_name?: string | null;
  nickname?: string | null;
  phone?: string | null;
};

export type AdminTradeRow = {
  order: {
    id: string;
    status: string;
    price_cents: number;
    created_at: string;
  };
  title: string;
  homePickup: boolean;
  buyer: TradePerson | null;
  seller: TradePerson | null;
};

export function AdminOrdersPanel({ trades }: { trades: AdminTradeRow[] }) {
  const { locale, t } = useI18n();
  const [pipelineTab, setPipelineTab] = useState<"active" | "completed">(
    "active",
  );

  const allActive = trades.filter((r) => r.order.status !== "completed");
  const allCompleted = trades.filter((r) => r.order.status === "completed");

  return (
    <AdminSearchableSection
      title={t.admin.orders}
      icon={<ShoppingBagIcon className="size-6" aria-hidden />}
      placeholder={t.admin.ordersSearchPlaceholder}
    >
      {(query) => {
        const matchesTrade = (row: AdminTradeRow) =>
          matchesSearch(
            query,
            row.title,
            row.order.status,
            orderStatusLabel(row.order.status, t.status),
            row.homePickup ? t.market.pickupSeller : t.market.pickupChurch,
            formatPrice(row.order.price_cents, locale),
            formatPersonName(row.seller, ""),
            row.seller?.email,
            row.seller?.phone,
            row.seller?.full_name,
            row.seller?.nickname,
            formatPersonName(row.buyer, ""),
            row.buyer?.email,
            row.buyer?.phone,
            row.buyer?.full_name,
            row.buyer?.nickname,
            row.order.id,
          );
        const activeTrades = allActive.filter(matchesTrade);
        const completedTrades = allCompleted.filter(matchesTrade);

        return (
          <>
            <AdminFilterTabs
              active={pipelineTab}
              onChange={setPipelineTab}
              tabs={[
                {
                  key: "active",
                  label: `${t.admin.activeTrades} (${allActive.length})`,
                },
                {
                  key: "completed",
                  label: `${t.admin.completedTrades} (${allCompleted.length})`,
                },
              ]}
            />

            {pipelineTab === "active" ? (
              <div className="mt-4 space-y-3">
                {activeTrades.length ? (
                  activeTrades.map(
                    ({ order, title, homePickup, buyer, seller }) => (
                      <div
                        key={order.id}
                        className="rounded-lg border border-brand/15 bg-white/70 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-foreground">
                                {title}
                              </p>
                              <span className="rounded bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                                {homePickup
                                  ? t.market.pickupSeller
                                  : t.market.pickupChurch}
                              </span>
                              <span className="rounded bg-sun px-2 py-0.5 text-[11px] font-semibold text-brand">
                                {orderStatusLabel(order.status, t.status)}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-ink-muted">
                              {formatPrice(order.price_cents, locale)} ·{" "}
                              {new Date(order.created_at).toLocaleString(
                                locale === "en" ? "en-US" : "ko-KR",
                              )}
                            </p>
                          </div>
                          <AdminOrderActions
                            orderId={order.id}
                            status={order.status}
                            homePickup={homePickup}
                          />
                        </div>

                        <dl className="mt-3 grid gap-2 border-t border-brand/10 pt-3 text-sm sm:grid-cols-2">
                          <div>
                            <dt className="text-xs text-ink-muted">
                              {t.admin.seller}
                            </dt>
                            <dd className="text-foreground">
                              {formatPersonName(seller, "—")}
                              {seller?.phone ? ` · ${seller.phone}` : ""}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-ink-muted">
                              {t.admin.buyer}
                            </dt>
                            <dd className="text-foreground">
                              {formatPersonName(buyer, "—")}
                              {buyer?.phone ? ` · ${buyer.phone}` : ""}
                            </dd>
                          </div>
                        </dl>

                        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                          {homePickup
                            ? t.admin.homePickupHint
                            : order.status === "awaiting_dropoff"
                              ? t.admin.churchDropoffHint
                              : t.admin.churchPickupHint}
                        </p>
                      </div>
                    ),
                  )
                ) : (
                  <p className="text-sm text-ink-muted">
                    {allActive.length && query
                      ? t.admin.noSearchResults
                      : t.admin.noActiveTrades}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border border-brand/10 bg-white/70">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead className="border-b border-brand/10 text-ink-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">{t.admin.item}</th>
                      <th className="px-4 py-3 font-medium">{t.admin.seller}</th>
                      <th className="px-4 py-3 font-medium">{t.admin.buyer}</th>
                      <th className="px-4 py-3 font-medium">{t.admin.pickup}</th>
                      <th className="px-4 py-3 font-medium">{t.admin.amount}</th>
                      <th className="px-4 py-3 font-medium">
                        <span className="sr-only">
                          {t.admin.deleteCompletedOrder}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedTrades.map(
                      ({ order, title, homePickup, buyer, seller }) => (
                        <tr key={order.id} className="border-t border-brand/5">
                          <td className="px-4 py-3">{title}</td>
                          <td className="px-4 py-3">
                            {formatPersonName(seller, "—")}
                          </td>
                          <td className="px-4 py-3">
                            {formatPersonName(buyer, "—")}
                          </td>
                          <td className="px-4 py-3">
                            {homePickup
                              ? t.market.pickupSeller
                              : t.market.pickupChurch}
                          </td>
                          <td className="px-4 py-3">
                            {formatPrice(order.price_cents, locale)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <DeleteCompletedOrderButton
                              orderId={order.id}
                              title={title}
                            />
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
                {!completedTrades.length ? (
                  <p className="px-4 py-6 text-sm text-ink-muted">
                    {allCompleted.length && query
                      ? t.admin.noSearchResults
                      : t.admin.noCompletedTrades}
                  </p>
                ) : null}
              </div>
            )}
          </>
        );
      }}
    </AdminSearchableSection>
  );
}
