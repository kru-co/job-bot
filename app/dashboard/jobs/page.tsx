import { createSupabaseServerClient } from '@/lib/supabase'
import { JobCard, type Job } from '@/components/JobCard'
import { FilterTabs } from '@/components/FilterTabs'
import { SearchForm } from '@/components/SearchForm'
import { Briefcase } from 'lucide-react'

async function getJobCounts(supabase: ReturnType<typeof createSupabaseServerClient>) {
  const [all, perfect, wider, queued, applied, skipped] = await Promise.all([
    supabase.from('jobs').select('*', { count: 'exact', head: true }),
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('match_quality', 'perfect')
      .not('status', 'in', '(applied,skipped)'),
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('match_quality', 'wider_net')
      .not('status', 'in', '(applied,skipped)'),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'queued'),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'applied'),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'skipped'),
  ])
  return {
    all: all.count ?? 0,
    perfect: perfect.count ?? 0,
    wider: wider.count ?? 0,
    queued: queued.count ?? 0,
    applied: applied.count ?? 0,
    skipped: skipped.count ?? 0,
  }
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: { filter?: string; q?: string }
}) {
  const supabase = createSupabaseServerClient()
  const filter = searchParams.filter ?? 'all'
  const query = searchParams.q?.trim() ?? ''

  let q = supabase
    .from('jobs')
    .select(
      'id, title, company, location, remote, url, salary_min, salary_max, source, match_quality, match_confidence, status, discovered_date'
    )
    .order('discovered_date', { ascending: false })
    .limit(60)

  if (filter === 'perfect') q = q.eq('match_quality', 'perfect').not('status', 'in', '(applied,skipped)')
  else if (filter === 'wider') q = q.eq('match_quality', 'wider_net').not('status', 'in', '(applied,skipped)')
  else if (filter === 'queued') q = q.eq('status', 'queued')
  else if (filter === 'applied') q = q.eq('status', 'applied')
  else if (filter === 'skipped') q = q.eq('status', 'skipped')

  if (query) q = q.or(`title.ilike.%${query}%,company.ilike.%${query}%`)

  const [{ data: jobs }, counts] = await Promise.all([q, getJobCounts(supabase)])

  const tabs = [
    { label: 'All', value: 'all', count: counts.all },
    { label: 'Perfect Match', value: 'perfect', count: counts.perfect },
    { label: 'Wider Net', value: 'wider', count: counts.wider },
    { label: 'Queued', value: 'queued', count: counts.queued },
    { label: 'Applied', value: 'applied', count: counts.applied },
    { label: 'Skipped', value: 'skipped', count: counts.skipped },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 animate-fade-in-up">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Briefcase className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-serif font-bold">Jobs</h1>
          <p className="text-sm text-muted-foreground">Discovered opportunities</p>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex items-center gap-3 flex-wrap animate-fade-in-up delay-100">
        <FilterTabs
          tabs={tabs}
          currentFilter={filter}
          currentQuery={query}
          baseUrl="/dashboard/jobs"
        />
        <SearchForm currentQuery={query} currentFilter={filter} baseUrl="/dashboard/jobs" />
      </div>

      {/* Results */}
      <div className="animate-fade-in-up delay-200">
        {!jobs?.length ? (
          <div className="card-organic p-16 text-center">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <p className="font-semibold">No jobs found</p>
            <p className="text-muted-foreground text-sm mt-1">
              {query
                ? `No results for "${query}". Try a different search.`
                : 'Jobs will appear here once the bot discovers them.'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              {jobs.length} job{jobs.length !== 1 ? 's' : ''}
              {query ? ` matching "${query}"` : ''}
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job as Job} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
