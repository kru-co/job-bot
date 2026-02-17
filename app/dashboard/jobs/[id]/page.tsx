import { createSupabaseServerClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  MapPin,
  DollarSign,
  Globe,
  ExternalLink,
  Calendar,
  Wifi,
  Brain,
} from 'lucide-react'
import { JobActions } from './JobActions'

const matchBadge: Record<string, { label: string; style: string }> = {
  perfect: { label: 'Perfect Match', style: 'bg-sage/15 text-sage border-sage/25' },
  wider_net: { label: 'Wider Net', style: 'bg-primary/15 text-primary border-primary/25' },
  no_match: { label: 'No Match', style: 'bg-muted text-muted-foreground border-border' },
}

const statusStyle: Record<string, string> = {
  discovered: 'bg-muted text-muted-foreground border-border',
  queued: 'bg-clay/15 text-clay border-clay/25',
  applied: 'bg-sage/15 text-sage border-sage/25',
  skipped: 'bg-destructive/10 text-destructive/70 border-destructive/20',
}

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient()

  const { data: job, error } = await supabase.from('jobs').select('*').eq('id', params.id).single()

  if (error || !job) notFound()

  const match = job.match_quality ? matchBadge[job.match_quality] : null

  const salary = (() => {
    const fmt = (n: number) => `$${(n / 1000).toFixed(0)}k`
    if (job.salary_min && job.salary_max) return `${fmt(job.salary_min)} – ${fmt(job.salary_max)}`
    if (job.salary_min) return `${fmt(job.salary_min)}+`
    if (job.salary_max) return `Up to ${fmt(job.salary_max)}`
    return null
  })()

  const discoveredDate = new Date(job.discovered_date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors animate-fade-in-up"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Jobs
      </Link>

      {/* Header card */}
      <div className="card-organic p-8 space-y-6 animate-scale-in">
        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          {match && (
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${match.style}`}>
              {match.label}
              {job.match_confidence ? ` — ${job.match_confidence}% confidence` : ''}
            </span>
          )}
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${
              statusStyle[job.status] ?? statusStyle.discovered
            }`}
          >
            {job.status}
          </span>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-3xl font-serif font-bold">{job.title}</h1>
          <p className="text-xl text-muted-foreground mt-1">{job.company}</p>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {(job.location || job.remote) && (
            <span className="flex items-center gap-1.5">
              {job.remote ? <Wifi className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
              {job.remote && job.location
                ? `${job.location} · Remote`
                : job.remote
                ? 'Remote'
                : job.location}
            </span>
          )}
          {salary && (
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" />
              {salary}
            </span>
          )}
          {job.source && (
            <span className="flex items-center gap-1.5">
              <Globe className="h-4 w-4" />
              via {job.source}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            Discovered {discoveredDate}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50 flex-wrap gap-4">
          <JobActions jobId={job.id} currentStatus={job.status} />
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View Original Posting
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* AI Match Analysis */}
      {job.match_reasoning && (
        <div className="card-organic p-6 space-y-3 animate-fade-in-up delay-100">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-serif font-bold">AI Match Analysis</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{job.match_reasoning}</p>
        </div>
      )}

      {/* Job Description */}
      {job.description && (
        <div className="card-organic p-6 space-y-3 animate-fade-in-up delay-200">
          <h2 className="text-lg font-serif font-bold">Job Description</h2>
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {job.description}
          </div>
        </div>
      )}

      {/* Requirements */}
      {job.requirements && (
        <div className="card-organic p-6 space-y-3 animate-fade-in-up delay-300">
          <h2 className="text-lg font-serif font-bold">Requirements</h2>
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {job.requirements}
          </div>
        </div>
      )}
    </div>
  )
}
