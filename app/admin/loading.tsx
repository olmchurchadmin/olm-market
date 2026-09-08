export default function AdminLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="h-9 w-40 animate-pulse rounded-md bg-black/8" />
      <div className="mt-2 h-4 w-64 animate-pulse rounded bg-black/6" />
      <div className="mt-8 flex flex-wrap gap-2 border-b border-brand/10 pb-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-24 animate-pulse rounded-md bg-black/8"
          />
        ))}
      </div>
      <div className="mt-8 space-y-4">
        <div className="h-7 w-48 animate-pulse rounded bg-black/8" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-lg border border-brand/10 bg-white/70"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
