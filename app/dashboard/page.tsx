import { createSupabaseServerClient } from '@/lib/supabase'
import { StatCard } from '@/components/StatCard'
import {
  Send,
  Briefcase,
  CheckCircle,
  Zap,
  Bot,
  Clock,
} from 'lucide-react'

async function getDashboardData() {
  const supabase = createSupabaseServerClient()

  const now = new Date()

  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const weekStart = new Date(now)
  const day = weekStart.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  weekStart.setDate(weekStart.getDate() + diffToMonday)
  weekStart.setHours(0, 0, 0, 0)

  const [
    { count: todayCount },
    { count: weekCount },
    { count: totalSubmitted },
    { count: queuedJobs },
    { count: perfectMatchJobs },
    { data: settings },
    { data: recentApps },
  ] = await Promise.all([
    supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .gte('application_date', todayStart.toISOString()),
    supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .gte('application_date', weekStart.toISOString()),
    supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'submitted'),
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'queued'),
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('match_quality', 'perfect')
      .eq('status', 'discovered'),
    supabase.from('bot_settings').select('setting_key, setting_value'),
    supabase
      .from('applications')
      .select('id, status, application_date, application_type, jobs(title, company, location)')
      .order('application_date', { ascending: false })
      .limit(8),
  ])

  const dailyQuota =
    (settings?.find((s) => s.setting_key === 'daily_quota')?.setting_value as { total?: number } | null)?.total ?? 8
  const botEnabled =
    (settings?.find((s) => s.setting_key === 'bot_enabled')?.setting_value as { enabled?: boolean } | null)?.enabled ?? true

  return {
    todayCount: todayCount ?? 0,
    weekCount: weekCount ?? 0,
    totalSubmitted: totalSubmitted ?? 0,
    queuedJobs: queuedJobs ?? 0,
    perfectMatchJobs: perfectMatchJobs ?? 0,
    dailyQuota,
    botEnabled,
    recentApps: recentApps ?? [],
  }
}

const statusStyles: Record<string, string> = {
  submitted: 'bg-sage/15 text-sage border-sage/25',
  pending: 'bg-clay/15 text-clay border-clay/25',
  processing: 'bg-primary/15 text-primary border-primary/25',
  failed: 'bg-destructive/15 text-destructive border-destructive/25',
  manual_review: 'bg-terracotta/15 text-terracotta border-terracotta/25',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1 animate-fade-in-up">
          <h1 className="text-3xl font-serif font-bold">{greeting()}, Josh</h1>
          <p className="text-muted-foreground text-sm">{today}</p>
        </div>

        {/* Bot status badge */}
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium animate-fade-in-up ${
            data.botEnabled
              ? 'bg-sage/10 text-sage border-sage/25'
              : 'bg-muted text-muted-foreground border-border'
          }`}
        >
          <Bot className="h-4 w-4" />
          <span>Bot {data.botEnabled ? 'Active' : 'Paused'}</span>
          <div
            className={`h-1.5 w-1.5 rounded-full ${data.botEnabled ? 'bg-sage animate-pulse' : 'bg-muted-foreground'}`}
          />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="animate-fade-in-up delay-100">
          <StatCard
            title="Today's Applications"
            value={`${data.todayCount} / ${data.dailyQuota}`}
            subtitle="Daily quota progress"
            icon={<Send className="h-5 w-5" />}
            accent="primary"
            badge={
              data.todayCount >= data.dailyQuota
                ? { label: 'Quota met', variant: 'success' }
                : undefined
            }
          />
        </div>

        <div className="animate-fade-in-up delay-200">
          <StatCard
            title="This Week"
            value={data.weekCount}
            subtitle="Applications submitted"
            icon={<CheckCircle className="h-5 w-5" />}
            accent="sage"
          />
        </div>

        <div className="animate-fade-in-up delay-300">
          <StatCard
            title="Jobs in Queue"
            value={data.queuedJobs}
            subtitle={`${data.perfectMatchJobs} perfect matches pending`}
            icon={<Briefcase className="h-5 w-5" />}
            accent="terracotta"
            badge={
              data.perfectMatchJobs > 0
                ? { label: `${data.perfectMatchJobs} perfect`, variant: 'warning' }
                : undefined
            }
          />
        </div>

        <div className="animate-fade-in-up delay-400">
          <StatCard
            title="Total Submitted"
            value={data.totalSubmitted}
            subtitle="All-time applications"
            icon={<Zap className="h-5 w-5" />}
            accent="clay"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="animate-fade-in-up delay-500">
        <div className="card-organic overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-border/50">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-serif font-bold text-lg">Recent Activity</h2>
          </div>

          {data.recentApps.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-muted-foreground text-sm">No applications yet.</p>
              <p className="text-muted-foreground text-xs mt-1">
                Add jobs to the queue to get started.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {data.recentApps.map((app: any) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {app.jobs?.title ?? 'Unknown Role'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {app.jobs?.company ?? '—'}
                      {app.jobs?.location ? ` · ${app.jobs.location}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${
                        statusStyles[app.status] ?? statusStyles.pending
                      }`}
                    >
                      {app.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(app.application_date)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
