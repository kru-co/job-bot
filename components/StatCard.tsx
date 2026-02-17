interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  accent?: 'primary' | 'sage' | 'terracotta' | 'clay'
  badge?: {
    label: string
    variant: 'success' | 'warning' | 'neutral'
  }
}

const accentStyles = {
  primary: 'bg-primary/10 text-primary',
  sage: 'bg-sage/10 text-sage',
  terracotta: 'bg-terracotta/10 text-terracotta',
  clay: 'bg-clay/10 text-clay',
}

const badgeStyles = {
  success: 'bg-sage/15 text-sage border-sage/25',
  warning: 'bg-terracotta/15 text-terracotta border-terracotta/25',
  neutral: 'bg-muted text-muted-foreground border-border',
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  accent = 'primary',
  badge,
}: StatCardProps) {
  return (
    <div className="card-organic p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${accentStyles[accent]}`}>
          {icon}
        </div>
        {badge && (
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${badgeStyles[badge.variant]}`}>
            {badge.label}
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-serif font-bold tracking-tight">{value}</p>
        <p className="text-sm font-medium text-foreground mt-0.5">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  )
}
