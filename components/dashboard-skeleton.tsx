'use client'

export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Summary overview placeholder */}
      <div className="mb-8 grid grid-cols-1 gap-6 rounded-xl border border-zinc-800 bg-[#1a1b23] p-6 lg:grid-cols-[auto_1fr] lg:gap-10">
        <div className="flex justify-center">
          <div className="skeleton h-44 w-44 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3 p-5">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton h-7 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Cards grid placeholder */}
      <div className="skeleton mb-4 h-6 w-32" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-800 bg-[#1a1b23] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="skeleton h-11 w-11 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-5 w-32" />
                <div className="skeleton h-4 w-24" />
              </div>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="skeleton h-4 w-20" />
                <div className="skeleton h-6 w-16" />
              </div>
              <div className="space-y-2">
                <div className="skeleton h-4 w-20" />
                <div className="skeleton h-6 w-16" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-full" />
            </div>
            <div className="skeleton mt-4 h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
