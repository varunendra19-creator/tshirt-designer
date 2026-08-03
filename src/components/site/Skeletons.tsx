/** Instant loading skeletons shown by route-level loading.tsx while a page renders. */

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <section className="mx-auto max-w-full px-5 py-8 md:py-12">
      <div className="h-9 w-56 max-w-[70%] animate-pulse rounded-lg bg-black/5" />
      <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-black/5" />
      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i}>
            <div className="aspect-[4/5] w-full animate-pulse rounded-2xl bg-black/5" />
            <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-black/5" />
            <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-black/5" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProductDetailSkeleton() {
  return (
    <section className="mx-auto max-w-full px-5 py-8 md:py-12">
      <div className="mb-5 h-3 w-40 animate-pulse rounded bg-black/5" />
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="aspect-[4/5] w-full animate-pulse rounded-3xl bg-black/5" />
        <div className="space-y-4">
          <div className="h-9 w-3/4 animate-pulse rounded-lg bg-black/5" />
          <div className="h-5 w-1/3 animate-pulse rounded bg-black/5" />
          <div className="h-7 w-1/4 animate-pulse rounded bg-black/5" />
          <div className="h-20 w-full animate-pulse rounded-xl bg-black/5" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-9 w-9 animate-pulse rounded-full bg-black/5" />)}
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 w-12 animate-pulse rounded-lg bg-black/5" />)}
          </div>
          <div className="h-12 w-full animate-pulse rounded-full bg-black/5" />
        </div>
      </div>
    </section>
  );
}
