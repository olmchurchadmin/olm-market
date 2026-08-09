import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";

export default async function Home() {
  const { t } = await getI18n();

  return (
    <div className="min-h-full">
      <section className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden text-white">
        <div
          aria-hidden
          className="hero-media absolute inset-0 -z-20 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1488459716988-2ea21651ce1b?auto=format&fit=crop&w=2400&q=80)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(18,38,28,0.25)_0%,rgba(18,38,28,0.45)_45%,rgba(14,28,20,0.88)_100%)]"
        />
        <div
          aria-hidden
          className="sun-glow pointer-events-none absolute -left-16 top-10 -z-10 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(232,184,74,0.45)_0%,transparent_70%)] blur-2xl"
        />

        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16 pt-40 sm:px-10 sm:pb-20">
          <p className="animate-rise font-[family-name:var(--font-display)] text-5xl leading-none tracking-tight sm:text-7xl md:text-8xl">
            {t.brand}
          </p>
          <h1 className="animate-rise-delay-1 mt-5 max-w-2xl font-[family-name:var(--font-display)] text-2xl leading-snug font-medium text-white/95 sm:text-4xl">
            {t.home.subtitle}
          </h1>
          <p className="animate-rise-delay-2 mt-4 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
            {t.home.blurb}
          </p>
          <div className="animate-rise-delay-3 mt-8 flex flex-wrap gap-3">
            <Link
              href="/market"
              className="inline-flex items-center justify-center rounded-md bg-sun px-5 py-3 text-sm font-semibold text-[#1c2a1f] transition duration-300 hover:-translate-y-0.5 hover:bg-[#f0c65d]"
            >
              {t.home.browse}
            </Link>
            <Link
              href="/sell"
              className="inline-flex items-center justify-center rounded-md border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white/20"
            >
              {t.home.listItem}
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 sm:px-10">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-3">
          {[
            { title: t.home.stepList, body: t.home.stepListBody },
            { title: t.home.stepBuy, body: t.home.stepBuyBody },
            { title: t.home.stepPickup, body: t.home.stepPickupBody },
          ].map((item) => (
            <div key={item.title}>
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-brand">
                {item.title}
              </h2>
              <p className="mt-2 text-ink-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-6 py-8 text-center text-sm text-ink-muted sm:px-10">
        <p>{t.home.footer}</p>
      </footer>
    </div>
  );
}
