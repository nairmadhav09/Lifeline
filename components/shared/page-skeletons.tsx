import { Skeleton } from "@/components/ui/skeleton";

/** Page title + subtitle (+ optional actions), matching <PageHeader>. */
function HeaderSkeleton({ actions = true }: { actions?: boolean }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2.5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {actions && <Skeleton className="h-9 w-32 rounded-xl" />}
    </div>
  );
}

function Rows({ count = 6 }: { count?: number }) {
  return (
    <div className="divide-y divide-border surface">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 sm:px-5">
          <Skeleton className="size-9 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-44 max-w-full" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" aria-label="Loading">
      {children}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function ListPageSkeleton() {
  return (
    <Wrapper>
      <HeaderSkeleton />
      <div className="mb-4 flex gap-2">
        <Skeleton className="h-9 w-44 rounded-xl" />
        <Skeleton className="h-9 w-64 rounded-xl" />
      </div>
      <Rows count={8} />
    </Wrapper>
  );
}

export function CalendarPageSkeleton() {
  return (
    <Wrapper>
      <HeaderSkeleton />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="grid grid-cols-7 gap-1.5 surface p-3 sm:p-5">
          {Array.from({ length: 35 }, (_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl sm:h-16" />
          ))}
        </div>
        <Rows count={3} />
      </div>
    </Wrapper>
  );
}

export function DocumentsPageSkeleton() {
  return (
    <Wrapper>
      <HeaderSkeleton actions={false} />
      <Skeleton className="mb-6 h-40 rounded-2xl" />
      <Rows count={4} />
    </Wrapper>
  );
}

export function SettingsPageSkeleton() {
  return (
    <Wrapper>
      <HeaderSkeleton actions={false} />
      <div className="space-y-6">
        {[4, 6, 1].map((fields, i) => (
          <div key={i} className="grid gap-6 surface p-5 sm:p-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-52" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: fields }, (_, j) => (
                <Skeleton key={j} className="h-10 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Wrapper>
  );
}
