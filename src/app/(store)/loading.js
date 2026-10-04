// Static skeleton inside the store shell; no data fetching so it can never slow or break a page.
export default function StoreLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-10" aria-busy="true">
      <div className="h-8 w-1/3 animate-pulse rounded-lg bg-muted" />
      <div className="h-4 w-1/2 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-56 animate-pulse rounded-[10px] bg-muted" />
        ))}
      </div>
    </div>
  );
}
