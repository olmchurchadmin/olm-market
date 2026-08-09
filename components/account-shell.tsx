import Link from "next/link";
import type { ReactNode } from "react";

const links = [
  { href: "/account/profile", label: "My Profile" },
  { href: "/account/transactions", label: "내 거래" },
] as const;

export function AccountNav({ active }: { active: "profile" | "transactions" }) {
  return (
    <nav className="flex flex-wrap gap-2 border-b border-brand/10 pb-4">
      {links.map((link) => {
        const isActive =
          (active === "profile" && link.href === "/account/profile") ||
          (active === "transactions" && link.href === "/account/transactions");
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              isActive
                ? "bg-brand text-white"
                : "bg-white/70 text-foreground hover:bg-white"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AccountShell({
  title,
  subtitle,
  active,
  children,
}: {
  title: string;
  subtitle?: string;
  active: "profile" | "transactions";
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-brand sm:text-4xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 break-words text-sm text-ink-muted sm:text-base">
          {subtitle}
        </p>
      ) : null}
      <div className="mt-8">
        <AccountNav active={active} />
      </div>
      <div className="mt-8">{children}</div>
    </main>
  );
}
