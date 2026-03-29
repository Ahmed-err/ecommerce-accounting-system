export default function OrdersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-72 bg-white/5 rounded-xl" />
        <div className="h-4 w-48 bg-white/5 rounded mt-2" />
      </div>
      <div className="flex gap-1 bg-gray-900/50 border border-white/5 rounded-xl p-1 w-fit">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-24 bg-white/5 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-900 border border-white/5 rounded-xl p-4 h-20" />
        ))}
      </div>
      <div className="bg-gray-900 border border-white/5 rounded-xl h-16" />
      <div className="bg-gray-900 border border-white/5 rounded-xl h-96" />
    </div>
  );
}
