import { createSupabaseServerClient } from '@/lib/supabase'
import { FilterTabs } from '@/components/FilterTabs'
import { Send, ExternalLink } from 'lucide-react'
import Link from 'next/link'

const statusStyle: Record<string, string> = {
  submitted: 'bg-sage/15 text-sage border-sage/25',
  pending: 'bg-muted text-muted-foreground border-border',
  processing: 'bg-primary/15 text-primary border-primary/25',
  failed: 'bg-destructive/15 text-destructive border-destructive/25',
  manual_review: 'bg-terracotta/15 text-terracotta border-terracotta/25',
}

async function getCounts(supabase: ReturnType<typeof createSupabaseServerClient>) {
  const [all, submitted, processing, failed, manual] = await Promise.all([
    supabase.from('applications').select('*', { count: 'exact', head: true }),
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'manual_review'),
  ])
  return {
    all: all.count ?? 0,
    submitted: submitted.count ?? 0,
    processing: processing.count ?? 0,
    failed: failed.count ?? 0,
    manual_review: manual.count ?? 0,
  }
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: { filter?: string }
}) {
  const supabase = createSupabaseServerClient()
  const filter = searchParams.filter ?? 'all'

  let q = supabase
    .from('applications')
    .select(
      'id, status, application_date, application_type, submission_method, user_rating, failure_reason, jobs(id, title, company, location, url)'
    )
    .order('application_date', { ascending: false })
    .limit(100)

  if (filter !== 'all') q = q.eq('status', filter)

  const [{ data: applications }, counts] = await Promise.all([q, getCounts(supabase)])

  const tabs = [
    { label: 'All', value: 'all', count: counts.all },
    { label: 'Submitted', value: 'submitted', count: counts.submitted },
    { label: 'Processing', value: 'processing', count: counts.processing },
    { label: 'Failed', value: 'failed', count: counts.failed },
    { label: 'Review Needed', value: 'manual_review', count: counts.manual_review },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 animate-fade-in-up">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Send className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-serif font-bold">Applications</h1>
          <p className="text-sm text-muted-foreground">Submission history and status</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="animate-fade-in-up delay-100">
        <FilterTabs tabs={tabs} currentFilter={filter} baseUrl="/dashboard/applications" />
      </div>

      {/* Content */}
      <div className="animate-fade-in-up delay-200">
        {!applications?.length ? (
          <div className="card-organic p-16 text-center">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Send className="h-6 w-6 text-primary" />
            </div>
            <p className="font-semibold">No applications yet</p>
            <p className="text-muted-foreground text-sm mt-1">
              Queue jobs from the Jobs page and the bot will apply automatically.
            </p>
          </div>
        ) : (
          <div className="card-organic overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_120px_100px_80px] gap-4 px-6 py-3 border-b border-border/50 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>Role</span>
              <span>Status</span>
              <span>Method</span>
              <span>Date</span>
            </div>

            <div className="divide-y divide-border/40">
              {applications.map((app: any) => {
                const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs
                const date = new Date(app.application_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })

                return (
                  <div
                    key={app.id}
                    className="grid grid-cols-[1fr_120px_100px_80px] gap-4 px-6 py-4 items-center hover:bg-muted/20 transition-colors"
                  >
                    {/* Role + company */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {job?.id ? (
                          <Link
                            href={`/dashboard/jobs/${job.id}`}
                            className="text-sm font-medium hover:text-primary transition-colors truncate"
                          >
                            {job.title ?? 'Unknown Role'}
                          </Link>
                        ) : (
                          <span className="text-sm font-medium truncate">
                            {job?.title ?? 'Unknown Role'}
                          </span>
                        )}
                        {job?.url && (
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {job?.company ?? '—'}
                        {job?.location ? ` · ${job.location}` : ''}
                      </p>
                      {app.status === 'failed' && app.failure_reason && (
                        <p className="text-xs text-destructive mt-0.5 truncate">
                          {app.failure_reason}
                        </p>
                      )}
                    </div>

                    {/* Status */}
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize w-fit whitespace-nowrap ${
                        statusStyle[app.status] ?? statusStyle.pending
                      }`}
                    >
                      {app.status.replace('_', ' ')}
                    </span>

                    {/* Method */}
                    <span className="text-xs text-muted-foreground capitalize">
                      {app.submission_method ?? app.application_type ?? 'automated'}
                    </span>

                    {/* Date */}
                    <span className="text-xs text-muted-foreground">{date}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
