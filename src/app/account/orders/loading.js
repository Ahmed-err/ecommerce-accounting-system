export default function AccountOrdersLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6" aria-busy="true">
      <div className="mb-6 h-8 w-40 animate-pulse rounded-lg bg-muted" />
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="h-5 w-32 animate-pulse rounded bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="mt-4 flex gap-3">
              {[1, 2].map((j) => (
                <div key={j} className="flex items-center gap-2">
                  <div className="h-10 w-10 animate-pulse rounded-xl bg-muted" />
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between">
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="h-9 w-24 animate-pulse rounded-xl bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
