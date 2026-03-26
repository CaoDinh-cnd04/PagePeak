function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-slate-200" />
      <div className="p-3.5 space-y-2">
        <div className="h-4 bg-slate-200 rounded w-4/5" />
        <div className="h-3 bg-slate-100 rounded w-full" />
        <div className="flex justify-between pt-1">
          <div className="h-5 bg-slate-100 rounded-full w-24" />
          <div className="h-3 bg-slate-100 rounded w-16" />
        </div>
      </div>
    </div>
  );
}

function ListRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-200 animate-pulse">
      <div className="w-32 h-20 rounded-lg bg-slate-200 flex-shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <div className="h-4 bg-slate-200 rounded w-2/3" />
        <div className="h-3 bg-slate-100 rounded w-full" />
        <div className="flex gap-2">
          <div className="h-5 bg-slate-100 rounded-full w-20" />
          <div className="h-3 bg-slate-100 rounded w-24" />
        </div>
      </div>
      <div className="hidden sm:flex gap-2 flex-shrink-0">
        <div className="w-16 h-8 bg-slate-100 rounded-lg" />
        <div className="w-14 h-8 bg-slate-200 rounded-lg" />
      </div>
    </div>
  );
}

type Props = {
  layout: "grid" | "list";
};

export function TemplateLibrarySkeleton({ layout }: Props) {
  if (layout === "list") {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <ListRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Full-page skeleton: header strip + promo + tabs + chips + filters + grid/list */
export function TemplateLibraryFullSkeleton({ layout }: Props) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="h-36 bg-gradient-to-b from-slate-800 to-slate-900 animate-pulse" />
      <div className="bg-slate-900/80 border-b border-slate-700/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex justify-between gap-3">
          <div className="h-4 bg-slate-700/80 rounded w-64 flex-1 max-w-md animate-pulse" />
          <div className="h-8 w-28 bg-primary-600/40 rounded-lg animate-pulse shrink-0" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4">
        <div className="h-28 rounded-xl bg-slate-200 animate-pulse" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
        <div className="h-12 bg-white rounded-t-lg border border-slate-200 border-b-0 animate-pulse" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4 flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-24 rounded-full bg-slate-200 animate-pulse" />
        ))}
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4 flex flex-col sm:flex-row gap-3">
        <div className="h-10 flex-1 bg-slate-200 rounded-lg animate-pulse" />
        <div className="h-10 w-full sm:w-48 bg-slate-200 rounded-lg animate-pulse" />
        <div className="h-10 w-full sm:w-44 bg-slate-200 rounded-lg animate-pulse" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 pb-12">
        <TemplateLibrarySkeleton layout={layout} />
      </div>
    </div>
  );
}
