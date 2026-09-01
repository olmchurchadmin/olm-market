import Link from "next/link";
import type { LegalPage } from "@/lib/i18n/legal";

type LegalDocumentProps = {
  page: LegalPage;
  crossLink: { href: string; label: string };
};

export function LegalDocument({ page, crossLink }: LegalDocumentProps) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
        OLM Market
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-brand sm:text-4xl">
        {page.title}
      </h1>
      <p className="mt-2 text-sm text-ink-muted">Last updated · {page.updated}</p>
      <p className="mt-6 text-base leading-relaxed text-foreground">{page.intro}</p>

      <div className="mt-10 space-y-8">
        {page.sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-muted sm:text-base">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 48)}>{paragraph}</p>
              ))}
              {section.bullets ? (
                <ul className="list-disc space-y-2 pl-5">
                  {section.bullets.map((item) => (
                    <li key={item.slice(0, 48)}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-12 text-sm text-ink-muted">
        <Link href={crossLink.href} className="text-brand hover:underline">
          {crossLink.label}
        </Link>
      </p>
    </main>
  );
}
