import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient()

  // Fetch the job
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', params.id)
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // Fetch user profile
  const { data: profileSetting } = await supabase
    .from('bot_settings')
    .select('setting_value')
    .eq('setting_key', 'user_profile')
    .single()

  const profile = (profileSetting?.setting_value ?? {}) as Record<string, unknown>

  const candidateName = (profile.name as string) || 'The Candidate'
  const targetTitle = (profile.target_title as string) || 'Product Manager'

  const prompt = `You are an expert cover letter writer specialising in product management roles. Write a compelling, tailored cover letter for the following job application.

CANDIDATE PROFILE:
Name: ${candidateName}
Target Title: ${targetTitle}
Years of Experience: ${profile.years_experience ?? 'several years'}
Location: ${profile.location ?? ''}
Target Salary: ${profile.target_salary ? `$${Number(profile.target_salary).toLocaleString()}` : 'competitive'}
Key Skills: ${profile.skills ?? ''}
Background: ${profile.background ?? 'Experienced product manager'}

JOB TO APPLY FOR:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location ?? ''} ${job.remote ? '(Remote)' : ''}
Description: ${job.description ?? ''}
Requirements: ${job.requirements ?? ''}

Write a professional cover letter that:
1. Opens with a strong, specific hook that references the company and role
2. Highlights 2-3 of the candidate's most relevant achievements or skills for this specific job
3. Shows genuine interest in and knowledge of the company/role
4. Closes with a confident call to action
5. Keeps a warm, professional tone — not overly formal or stuffy
6. Is 3-4 paragraphs, approximately 300-400 words

Format the letter in markdown. Start directly with "Dear Hiring Manager," (no subject line or date).
Do not include a signature block — end after the closing paragraph.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = message.content[0].type === 'text' ? message.content[0].text : ''

  if (!content) {
    return NextResponse.json({ error: 'Empty response from AI' }, { status: 500 })
  }

  // Delete existing cover letter for this job if one exists (upsert by job_id)
  await supabase.from('cover_letters').delete().eq('job_id', params.id)

  // Save the new cover letter
  const { data: coverLetter, error: insertError } = await supabase
    .from('cover_letters')
    .insert({
      job_id: params.id,
      content,
      template_used: 'claude-sonnet-4-6',
      customization_notes: {
        generated_at: new Date().toISOString(),
        model: 'claude-sonnet-4-6',
      },
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Log AI usage
  const inputTokens = message.usage.input_tokens
  const outputTokens = message.usage.output_tokens
  const cost = inputTokens * 0.000003 + outputTokens * 0.000015

  await supabase.from('ai_usage_logs').insert({
    job_id: params.id,
    operation: 'cover_letter_generation',
    model: 'claude-sonnet-4-6',
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost: cost,
  })

  return NextResponse.json(coverLetter)
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient()

  const { data, error } = await supabase
    .from('cover_letters')
    .select('*')
    .eq('job_id', params.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    return NextResponse.json(null)
  }

  return NextResponse.json(data)
}
