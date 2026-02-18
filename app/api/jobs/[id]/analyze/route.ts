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

  // Fetch user profile from bot_settings
  const { data: profileSetting } = await supabase
    .from('bot_settings')
    .select('setting_value')
    .eq('setting_key', 'user_profile')
    .single()

  const profile = (profileSetting?.setting_value ?? {}) as Record<string, unknown>

  const prompt = `You are an expert job match analyst. Evaluate how well this job fits the candidate and return a JSON object.

CANDIDATE PROFILE:
Name: ${profile.name ?? 'Not set'}
Target Title: ${profile.target_title ?? 'Product Manager'}
Years of Experience: ${profile.years_experience ?? 'Not specified'}
Location: ${profile.location ?? 'Not specified'}
Remote Preference: ${profile.remote_preference ?? 'any'}
Target Salary: ${profile.target_salary ? `$${Number(profile.target_salary).toLocaleString()}` : 'Not specified'}
Target Industries: ${Array.isArray(profile.target_industries) ? profile.target_industries.join(', ') : (profile.target_industries ?? 'Not specified')}
Key Skills: ${Array.isArray(profile.skills) ? profile.skills.join(', ') : (profile.skills ?? 'Not specified')}
Background: ${profile.background ?? 'Not provided'}

JOB POSTING:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location ?? 'Not specified'}
Remote: ${job.remote ? 'Yes' : 'No'}
Salary: ${job.salary_min || job.salary_max ? `$${((job.salary_min ?? 0) / 1000).toFixed(0)}k – $${((job.salary_max ?? 0) / 1000).toFixed(0)}k` : 'Not specified'}
Description: ${job.description ?? 'Not provided'}
Requirements: ${job.requirements ?? 'Not provided'}

Return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "match_quality": "perfect" | "wider_net" | "no_match",
  "match_confidence": <integer 0-100>,
  "match_reasoning": "<detailed markdown analysis with ## sections>"
}

Definitions:
- "perfect": Direct match — correct title, experience level, industry, and compensation range
- "wider_net": Related but not ideal — slightly different title, minor over/under qualification, or secondary industry
- "no_match": Clearly unsuitable — wrong field, extreme level mismatch, or deal-breaking requirements

In match_reasoning, use markdown with sections like:
## Strengths
## Concerns
## Overall Assessment`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

  // Extract JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }

  let analysis: { match_quality: string; match_confidence: number; match_reasoning: string }
  try {
    analysis = JSON.parse(jsonMatch[0])
  } catch {
    return NextResponse.json({ error: 'Invalid JSON from AI' }, { status: 500 })
  }

  // Validate match_quality value
  const validQualities = ['perfect', 'wider_net', 'no_match']
  if (!validQualities.includes(analysis.match_quality)) {
    analysis.match_quality = 'wider_net'
  }

  // Update the job record
  const { data: updatedJob, error: updateError } = await supabase
    .from('jobs')
    .update({
      match_quality: analysis.match_quality as 'perfect' | 'wider_net' | 'no_match',
      match_confidence: Math.min(100, Math.max(0, Math.round(analysis.match_confidence))),
      match_reasoning: analysis.match_reasoning,
    })
    .eq('id', params.id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Log AI usage (Claude Sonnet 4.6: $3/1M input, $15/1M output)
  const inputTokens = message.usage.input_tokens
  const outputTokens = message.usage.output_tokens
  const cost = inputTokens * 0.000003 + outputTokens * 0.000015

  await supabase.from('ai_usage_logs').insert({
    job_id: params.id,
    operation: 'job_scoring',
    model: 'claude-sonnet-4-6',
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost: cost,
  })

  return NextResponse.json(updatedJob)
}
