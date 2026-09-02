import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { NotificationDetails } from "@/lib/i18n/notifications";

export function NotificationDetailRows({
  details,
  t,
  compact = false,
}: {
  details: NotificationDetails;
  t: Dictionary;
  compact?: boolean;
}) {
  const rows = [
    details.item
      ? {
          label: t.notify.detailItem,
          value: details.price
            ? `${details.item} (${details.price})`
            : details.item,
        }
      : null,
    details.seller
      ? { label: t.notify.detailSeller, value: details.seller }
      : null,
    details.buyer
      ? { label: t.notify.detailBuyer, value: details.buyer }
      : null,
    details.pickup
      ? { label: t.notify.detailPickup, value: details.pickup }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  if (!rows.length) return null;

  return (
    <dl
      className={`mt-2 grid gap-1 ${compact ? "text-xs" : "text-sm"} text-ink-muted`}
    >
      {rows.map((row) => (
        <div key={row.label} className="flex flex-wrap gap-x-2">
          <dt className="shrink-0 font-medium text-foreground/80">
            {row.label}:
          </dt>
          <dd className="min-w-0 break-words">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
