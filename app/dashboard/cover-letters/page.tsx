import { createSupabaseServerClient } from '@/lib/supabase'
import { MarkdownContent } from '@/components/MarkdownContent'
import { CoverLetterCard } from './CoverLetterCard'
import { FileText, Brain } from 'lucide-react'
import Link from 'next/link'

export default async function CoverLettersPage() {
  const supabase = createSupabaseServerClient()

  const { data: coverLetters } = await supabase
    .from('cover_letters')
    .select(
      `
      id,
      content,
      created_at,
      job_id,
      jobs (
        id,
        title,
        company,
        match_quality,
        status
      )
    `
    )
    .order('created_at', { ascending: false })

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-serif font-bold">Cover Letters</h1>
            <p className="text-sm text-muted-foreground">AI-generated letters for each job</p>
          </div>
        </div>
        <span className="text-sm text-muted-foreground">{coverLetters?.length ?? 0} generated</span>
      </div>

      {/* Empty state */}
      {!coverLetters?.length && (
        <div className="card-organic p-16 text-center animate-fade-in-up delay-100">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <p className="font-semibold">No cover letters yet</p>
          <p className="text-muted-foreground text-sm mt-1 mb-4">
            Open any job and click &ldquo;Generate Cover Letter&rdquo; to create one with Claude.
          </p>
          <Link
            href="/dashboard/jobs"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Browse Jobs
          </Link>
        </div>
      )}

      {/* List */}
      <div className="space-y-4">
        {coverLetters?.map((letter) => {
          const job = letter.jobs as { id: string; title: string; company: string; match_quality: string | null; status: string } | null
          return (
            <CoverLetterCard
              key={letter.id}
              id={letter.id}
              content={letter.content}
              createdAt={letter.created_at}
              jobId={letter.job_id}
              jobTitle={job?.title ?? 'Unknown Job'}
              jobCompany={job?.company ?? ''}
              matchQuality={job?.match_quality ?? null}
            />
          )
        })}
      </div>
    </div>
  )
}
