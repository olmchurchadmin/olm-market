function SalesDonationRing({
  salesCents,
  donationCents,
  salesLabel,
  donationLabel,
  formatMoney,
}: {
  salesCents: number;
  donationCents: number;
  salesLabel: string;
  donationLabel: string;
  formatMoney: (cents: number) => string;
}) {
  const size = 220;
  const stroke = 22;
  const radius = (size - stroke) / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  const sales = Math.max(0, salesCents);
  const donation = Math.max(0, Math.min(donationCents, sales || donationCents));
  const total = Math.max(sales, donation, 1);
  const donationRatio = Math.min(1, donation / total);
  const salesOnlyRatio = Math.min(1, Math.max(0, (sales - donation) / total));
  const donationLength = circumference * donationRatio;
  const salesOnlyLength = circumference * salesOnlyRatio;
  const gap = sales > 0 || donation > 0 ? 2 : 0;

  return (
    <div className="flex h-full flex-col items-center justify-center rounded-lg border border-brand/10 bg-white/70 p-5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-black/8"
          />
          {donation > 0 ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              strokeLinecap="butt"
              strokeDasharray={`${Math.max(0, donationLength - gap)} ${circumference}`}
              strokeDashoffset={0}
              className="text-teal-700"
            />
          ) : null}
          {sales > donation ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              strokeLinecap="butt"
              strokeDasharray={`${Math.max(0, salesOnlyLength - gap)} ${circumference}`}
              strokeDashoffset={-(donationLength + gap)}
              className="text-brand"
            />
          ) : null}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-[11px] font-medium tracking-wide text-ink-muted uppercase">
            {donationLabel}
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl text-foreground">
            {formatMoney(donation)}
          </p>
          <p className="mt-3 text-[11px] font-medium tracking-wide text-ink-muted uppercase">
            {salesLabel}
          </p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {formatMoney(sales)}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-teal-700" aria-hidden />
          {donationLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-brand" aria-hidden />
          {salesLabel}
        </span>
      </div>
    </div>
  );
}

export { SalesDonationRing };
