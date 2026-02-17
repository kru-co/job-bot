import Link from 'next/link'

interface Tab {
  label: string
  value: string
  count?: number
}

export function FilterTabs({
  tabs,
  currentFilter,
  currentQuery = '',
  baseUrl,
}: {
  tabs: Tab[]
  currentFilter: string
  currentQuery?: string
  baseUrl: string
}) {
  const buildHref = (filterValue: string) => {
    const params = new URLSearchParams()
    if (filterValue !== tabs[0].value) params.set('filter', filterValue)
    if (currentQuery) params.set('q', currentQuery)
    const qs = params.toString()
    return qs ? `${baseUrl}?${qs}` : baseUrl
  }

  return (
    <div className="flex gap-1 p-1 rounded-xl bg-muted/40 border border-border/40 flex-wrap">
      {tabs.map((tab) => {
        const isActive = currentFilter === tab.value
        return (
          <Link
            key={tab.value}
            href={buildHref(tab.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              isActive
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`ml-1.5 text-xs ${
                  isActive ? 'text-muted-foreground' : 'text-muted-foreground/60'
                }`}
              >
                {tab.count}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
