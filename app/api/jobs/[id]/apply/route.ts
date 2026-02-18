import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient()

  let body: { notes?: string; submission_method?: string } = {}
  try {
    body = await request.json()
  } catch {
    // body is optional
  }

  // Verify job exists
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, status, title, company')
    .eq('id', params.id)
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // Find cover letter for this job if one exists
  const { data: coverLetter } = await supabase
    .from('cover_letters')
    .select('id')
    .eq('job_id', params.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Create application record
  const { data: application, error: appError } = await supabase
    .from('applications')
    .insert({
      job_id: params.id,
      cover_letter_id: coverLetter?.id ?? null,
      status: 'submitted',
      application_type: 'manual',
      submission_method: body.submission_method ?? 'manual',
      user_notes: body.notes ?? null,
    })
    .select()
    .single()

  if (appError) {
    return NextResponse.json({ error: appError.message }, { status: 500 })
  }

  // Update job status to applied
  await supabase.from('jobs').update({ status: 'applied' }).eq('id', params.id)

  return NextResponse.json(application, { status: 201 })
}
