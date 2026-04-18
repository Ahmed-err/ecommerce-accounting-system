export default function OrdersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-72 bg-muted rounded-xl" />
        <div className="h-4 w-48 bg-muted rounded mt-2" />
      </div>
      <div className="flex gap-1 bg-muted/50 border border-border rounded-xl p-1 w-fit">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-24 bg-muted rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 h-20" />
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl h-16" />
      <div className="bg-card border border-border rounded-xl h-96" />
    </div>
  );
}
