'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MarkdownContent } from '@/components/MarkdownContent'
import { ChevronDown, ChevronUp, Copy, Check, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

const matchBadge: Record<string, { label: string; style: string }> = {
  perfect: { label: 'Perfect Match', style: 'bg-sage/15 text-sage border-sage/25' },
  wider_net: { label: 'Wider Net', style: 'bg-primary/15 text-primary border-primary/25' },
  no_match: { label: 'No Match', style: 'bg-muted text-muted-foreground border-border' },
}

export function CoverLetterCard({
  id,
  content,
  createdAt,
  jobId,
  jobTitle,
  jobCompany,
  matchQuality,
}: {
  id: string
  content: string
  createdAt: string
  jobId: string
  jobTitle: string
  jobCompany: string
  matchQuality: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const match = matchQuality ? matchBadge[matchQuality] : null
  const date = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  // Show first ~300 chars as preview
  const preview = content.slice(0, 300).trim() + (content.length > 300 ? '…' : '')

  return (
    <div className="card-organic p-6 space-y-4 animate-fade-in-up">
      {/* Card header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{jobTitle}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{jobCompany}</span>
            {match && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${match.style}`}>
                {match.label}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Generated {date}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={copy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <Link
            href={`/dashboard/jobs/${jobId}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Job
          </Link>
        </div>
      </div>

      {/* Content preview / full */}
      <div className="text-sm text-muted-foreground">
        {expanded ? (
          <MarkdownContent content={content} />
        ) : (
          <p className="leading-relaxed">{preview}</p>
        )}
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? (
          <>
            <ChevronUp className="h-3.5 w-3.5" />
            Show less
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5" />
            Read full letter
          </>
        )}
      </button>
    </div>
  )
}
