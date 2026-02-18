import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

// How many jobs to analyse per batch run (keep well within timeout)
const BATCH_LIMIT = 10

function buildPrompt(profile: Record<string, unknown>, job: Record<string, unknown>): string {
  return `You are an expert job match analyst. Evaluate how well this job fits the candidate and return a JSON object.

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
Salary: ${job.salary_min || job.salary_max ? `$${(((job.salary_min as number) ?? 0) / 1000).toFixed(0)}k – $${(((job.salary_max as number) ?? 0) / 1000).toFixed(0)}k` : 'Not specified'}
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
}

export async function GET() {
  const supabase = createSupabaseServerClient()
  const { count } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .is('match_quality', null)
  return NextResponse.json({ unanalyzed: count ?? 0 })
}

export async function POST() {
  const supabase = createSupabaseServerClient()

  // Fetch unanalyzed jobs
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('*')
    .is('match_quality', null)
    .order('discovered_date', { ascending: false })
    .limit(BATCH_LIMIT)

  if (jobsError) {
    return NextResponse.json({ error: jobsError.message }, { status: 500 })
  }

  if (!jobs?.length) {
    return NextResponse.json({ analyzed: 0, remaining: 0, total_cost: 0, message: 'All jobs already analysed' })
  }

  // Fetch user profile
  const { data: profileSetting } = await supabase
    .from('bot_settings')
    .select('setting_value')
    .eq('setting_key', 'user_profile')
    .single()

  const profile = (profileSetting?.setting_value ?? {}) as Record<string, unknown>

  let analyzed = 0
  let totalCost = 0
  const results: { id: string; match_quality: string; match_confidence: number }[] = []

  for (const job of jobs) {
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: buildPrompt(profile, job as Record<string, unknown>) }],
      })

      const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) continue

      let analysis: { match_quality: string; match_confidence: number; match_reasoning: string }
      try {
        analysis = JSON.parse(jsonMatch[0])
      } catch {
        continue
      }

      const validQualities = ['perfect', 'wider_net', 'no_match']
      if (!validQualities.includes(analysis.match_quality)) analysis.match_quality = 'wider_net'

      await supabase
        .from('jobs')
        .update({
          match_quality: analysis.match_quality as 'perfect' | 'wider_net' | 'no_match',
          match_confidence: Math.min(100, Math.max(0, Math.round(analysis.match_confidence))),
          match_reasoning: analysis.match_reasoning,
        })
        .eq('id', job.id)

      const inputTokens = message.usage.input_tokens
      const outputTokens = message.usage.output_tokens
      const cost = inputTokens * 0.000003 + outputTokens * 0.000015
      totalCost += cost

      await supabase.from('ai_usage_logs').insert({
        job_id: job.id,
        operation: 'job_scoring',
        model: 'claude-sonnet-4-6',
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost: cost,
      })

      results.push({ id: job.id, match_quality: analysis.match_quality, match_confidence: analysis.match_confidence })
      analyzed++
    } catch {
      // Skip jobs that fail — don't abort the whole batch
    }
  }

  // Count remaining unanalyzed
  const { count: remaining } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .is('match_quality', null)

  return NextResponse.json({
    analyzed,
    remaining: remaining ?? 0,
    total_cost: parseFloat(totalCost.toFixed(4)),
    results,
  })
}
