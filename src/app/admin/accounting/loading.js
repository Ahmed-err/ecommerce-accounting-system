export default function AccountingLoading() {
  return (
    <div className="max-w-[1440px] mx-auto w-full space-y-6 animate-pulse">
      <div className="h-10 w-64 rounded-lg bg-white/5" />
      <div className="h-4 w-96 max-w-full rounded bg-white/5" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-9 w-24 rounded-lg bg-white/5" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-white/5" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-white/5" />
    </div>
  );
}
