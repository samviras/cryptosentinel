export function SkeletonCard({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-800 rounded"
          style={{ width: `${75 + (i % 3) * 10}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-center gap-4 py-3">
      <div className="h-4 bg-gray-800 rounded w-12" />
      <div className="h-4 bg-gray-800 rounded w-24 ml-auto" />
      <div className="h-4 bg-gray-800 rounded w-16" />
      <div className="h-4 bg-gray-800 rounded w-16" />
    </div>
  );
}
