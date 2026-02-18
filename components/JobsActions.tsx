'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Brain, Rss, Loader2 } from 'lucide-react'

export function AnalyseAllButton({ unanalyzed }: { unanalyzed: number }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const run = async () => {
    if (!unanalyzed) return
    setLoading(true)
    try {
      const res = await fetch('/api/jobs/analyze-all', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const { analyzed, remaining, total_cost } = data
      if (analyzed === 0) {
        toast.info('All jobs are already analysed.')
      } else {
        toast.success(
          `Analysed ${analyzed} job${analyzed !== 1 ? 's' : ''} ($${total_cost.toFixed(3)})${remaining > 0 ? ` · ${remaining} remaining` : ' · all done!'}`
        )
      }
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={run}
      disabled={loading || !unanalyzed}
      title={unanalyzed ? `${unanalyzed} unanalysed job${unanalyzed !== 1 ? 's' : ''}` : 'All jobs analysed'}
      className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
      {loading ? 'Analysing…' : unanalyzed ? `Analyse All (${unanalyzed})` : 'All Analysed'}
    </button>
  )
}

export function DiscoverButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const run = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/jobs/discover', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const { new_jobs, feeds_processed } = data
      if (new_jobs === 0) {
        toast.info(`No new jobs found across ${feeds_processed} feed${feeds_processed !== 1 ? 's' : ''}.`)
      } else {
        toast.success(`Found ${new_jobs} new job${new_jobs !== 1 ? 's' : ''} from ${feeds_processed} feed${feeds_processed !== 1 ? 's' : ''}!`)
      }
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Discovery failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={run}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rss className="h-4 w-4" />}
      {loading ? 'Discovering…' : 'Discover'}
    </button>
  )
}
