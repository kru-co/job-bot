import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

// Strip HTML tags and collapse whitespace
function extractText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000) // Cap at 12k chars to keep tokens manageable
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient()

  let body: { url: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { url } = body

  if (!url || !url.startsWith('http')) {
    return NextResponse.json({ error: 'A valid URL is required' }, { status: 400 })
  }

  // Check for duplicate
  const { data: existing } = await supabase.from('jobs').select('id').eq('url', url).single()
  if (existing) {
    return NextResponse.json({ error: 'This job URL has already been imported', jobId: existing.id }, { status: 409 })
  }

  // Fetch the page
  let pageText: string
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch page: HTTP ${response.status}` },
        { status: 422 }
      )
    }
    const html = await response.text()
    pageText = extractText(html)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Could not fetch the URL: ${message}` }, { status: 422 })
  }

  if (pageText.length < 200) {
    return NextResponse.json(
      { error: 'Page content too short — the site may be blocking automated access' },
      { status: 422 }
    )
  }

  // Ask Claude to extract structured job data
  const prompt = `Extract job posting details from the following web page text and return a JSON object.

PAGE TEXT:
${pageText}

Return ONLY a valid JSON object (no markdown, no extra text) with this structure:
{
  "title": "<job title>",
  "company": "<company name>",
  "location": "<city, state or country, or null>",
  "remote": <true | false>,
  "description": "<full job description in markdown>",
  "requirements": "<requirements / qualifications section in markdown, or null>",
  "salary_min": <annual USD integer or null>,
  "salary_max": <annual USD integer or null>
}

Rules:
- If salary is hourly, convert to annual (×2080)
- If no salary is mentioned, use null for both salary fields
- location should be null if fully remote with no base location
- description should be comprehensive — include responsibilities, about the company, benefits etc.
- requirements should include education, experience, skills requirements`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = responseText.match(/\{[\s\S]*\}/)

  if (!jsonMatch) {
    return NextResponse.json({ error: 'Could not parse job data from page' }, { status: 500 })
  }

  let extracted: {
    title: string
    company: string
    location: string | null
    remote: boolean
    description: string | null
    requirements: string | null
    salary_min: number | null
    salary_max: number | null
  }

  try {
    extracted = JSON.parse(jsonMatch[0])
  } catch {
    return NextResponse.json({ error: 'Invalid JSON from AI extraction' }, { status: 500 })
  }

  if (!extracted.title || !extracted.company) {
    return NextResponse.json(
      { error: 'Could not identify job title or company from the page' },
      { status: 422 }
    )
  }

  // Insert the job
  const { data: job, error: insertError } = await supabase
    .from('jobs')
    .insert({
      title: extracted.title,
      company: extracted.company,
      location: extracted.location ?? null,
      remote: extracted.remote ?? false,
      url,
      description: extracted.description ?? null,
      requirements: extracted.requirements ?? null,
      salary_min: extracted.salary_min ?? null,
      salary_max: extracted.salary_max ?? null,
      source: 'url_import',
      status: 'discovered',
      fingerprint: url,
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
    job_id: job.id,
    operation: 'url_import',
    model: 'claude-sonnet-4-6',
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost: cost,
  })

  return NextResponse.json(job, { status: 201 })
}
