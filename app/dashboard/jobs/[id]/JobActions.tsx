'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ListPlus, XCircle, RotateCcw, CheckCircle2 } from 'lucide-react'

export function JobActions({
  jobId,
  currentStatus,
}: {
  jobId: string
  currentStatus: string
}) {
  const [status, setStatus] = useState(currentStatus)
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  const update = async (newStatus: string, message: string) => {
    setLoading(newStatus)
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error()
      setStatus(newStatus)
      toast.success(message)
      router.refresh()
    } catch {
      toast.error('Failed to update job. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  if (status === 'applied') {
    return (
      <div className="flex items-center gap-2 text-sm text-sage font-medium">
        <CheckCircle2 className="h-4 w-4" />
        Applied
      </div>
    )
  }

  if (status === 'queued') {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-clay font-medium">
          <div className="h-2 w-2 rounded-full bg-clay animate-pulse" />
          Queued for application
        </div>
        <button
          onClick={() => update('discovered', 'Moved back to discovered')}
          disabled={loading !== null}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Undo
        </button>
      </div>
    )
  }

  if (status === 'skipped') {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
          <XCircle className="h-4 w-4" />
          Skipped
        </div>
        <button
          onClick={() => update('discovered', 'Job restored to discovered')}
          disabled={loading !== null}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restore
        </button>
      </div>
    )
  }

  // discovered state — show Queue + Skip
  return (
    <div className="flex gap-3 flex-wrap">
      <button
        onClick={() => update('queued', 'Job queued for application!')}
        disabled={loading !== null}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ListPlus className="h-4 w-4" />
        {loading === 'queued' ? 'Queuing…' : 'Queue for Application'}
      </button>
      <button
        onClick={() => update('skipped', 'Job skipped')}
        disabled={loading !== null}
        className="flex items-center gap-2 px-5 py-2.5 border border-border rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <XCircle className="h-4 w-4" />
        {loading === 'skipped' ? 'Skipping…' : 'Skip'}
      </button>
    </div>
  )
}
