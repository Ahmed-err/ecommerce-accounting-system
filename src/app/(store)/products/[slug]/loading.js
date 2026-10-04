export default function ProductDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8" aria-busy="true">
      <div className="flex flex-col gap-10 lg:flex-row">
        {/* Image gallery skeleton */}
        <div className="w-full lg:w-1/2">
          <div className="aspect-square animate-pulse rounded-3xl bg-muted" />
          <div className="mt-3 flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 w-16 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        </div>

        {/* Info skeleton */}
        <div className="w-full space-y-5 lg:w-1/2">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="space-y-2">
            <div className="h-8 w-3/4 animate-pulse rounded-lg bg-muted" />
            <div className="h-6 w-1/2 animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="h-10 w-36 animate-pulse rounded-xl bg-muted" />
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
            <div className="h-4 w-4/6 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex gap-3 pt-2">
            <div className="h-12 flex-1 animate-pulse rounded-2xl bg-muted" />
            <div className="h-12 w-12 animate-pulse rounded-2xl bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
