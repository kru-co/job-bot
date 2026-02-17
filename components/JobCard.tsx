import Link from 'next/link'
import { MapPin, DollarSign, Globe, Wifi } from 'lucide-react'

export interface Job {
  id: string
  title: string
  company: string
  location: string | null
  remote: boolean
  url: string
  salary_min: number | null
  salary_max: number | null
  source: string | null
  match_quality: 'perfect' | 'wider_net' | 'no_match' | null
  match_confidence: number | null
  status: 'discovered' | 'queued' | 'applied' | 'skipped'
  discovered_date: string
}

const matchBadge: Record<string, { label: string; style: string }> = {
  perfect: { label: 'Perfect', style: 'bg-sage/15 text-sage border-sage/25' },
  wider_net: { label: 'Wider Net', style: 'bg-primary/15 text-primary border-primary/25' },
  no_match: { label: 'No Match', style: 'bg-muted text-muted-foreground border-border' },
}

const statusStyle: Record<string, string> = {
  discovered: 'bg-muted text-muted-foreground border-border',
  queued: 'bg-clay/15 text-clay border-clay/25',
  applied: 'bg-sage/15 text-sage border-sage/25',
  skipped: 'bg-destructive/10 text-destructive/70 border-destructive/20',
}

export function JobCard({ job }: { job: Job }) {
  const salary = (() => {
    const fmt = (n: number) => `$${(n / 1000).toFixed(0)}k`
    if (job.salary_min && job.salary_max) return `${fmt(job.salary_min)} – ${fmt(job.salary_max)}`
    if (job.salary_min) return `${fmt(job.salary_min)}+`
    if (job.salary_max) return `Up to ${fmt(job.salary_max)}`
    return null
  })()

  const daysAgo = Math.floor((Date.now() - new Date(job.discovered_date).getTime()) / 86400000)
  const timeLabel =
    daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`

  const match = job.match_quality ? matchBadge[job.match_quality] : null

  return (
    <Link href={`/dashboard/jobs/${job.id}`} className="block group">
      <div className="card-organic p-5 space-y-3 group-hover:border-primary/30">
        {/* Title + badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm leading-snug truncate">{job.title}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">{job.company}</p>
          </div>
          <div className="flex flex-wrap gap-1.5 shrink-0 justify-end">
            {match && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${match.style}`}>
                {match.label}
                {job.match_confidence ? ` ${job.match_confidence}%` : ''}
              </span>
            )}
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${
                statusStyle[job.status] ?? statusStyle.discovered
              }`}
            >
              {job.status}
            </span>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {(job.location || job.remote) && (
            <span className="flex items-center gap-1">
              {job.remote ? <Wifi className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
              {job.remote && job.location
                ? `${job.location} · Remote`
                : job.remote
                ? 'Remote'
                : job.location}
            </span>
          )}
          {salary && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {salary}
            </span>
          )}
          {job.source && (
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {job.source}
            </span>
          )}
          <span className="ml-auto">{timeLabel}</span>
        </div>
      </div>
    </Link>
  )
}
