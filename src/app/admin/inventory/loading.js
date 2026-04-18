export default function InventoryLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="h-10 w-2/3 max-w-md animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-card border border-border" />
        ))}
      </div>
      <div className="min-h-[400px] animate-pulse rounded-2xl bg-card border border-border" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl bg-card border border-border" />
        ))}
      </div>
    </div>
  );
}
