import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero skeleton */}
      <div className="relative bg-brand-navy pt-20 sm:pt-24">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <div className="space-y-4">
            <Skeleton className="h-5 w-32 bg-white/10" />
            <Skeleton className="h-12 w-96 bg-white/10 sm:h-16" />
            <Skeleton className="h-5 w-64 bg-white/10" />
          </div>
          {/* Search bar skeleton */}
          <div className="mt-8 max-w-xl">
            <Skeleton className="h-14 w-full rounded-xl bg-white/10" />
          </div>
        </div>
      </div>
      {/* Content skeleton */}
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-white p-5 shadow-sm">
              <Skeleton className="mb-3 h-5 w-3/4" />
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
