import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()
const MAX_FEED_TEXT = 20000 // chars sent to Claude per feed

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max) + '\n[truncated]' : text
}

// Light HTML/XML cleanup — keep enough structure for Claude to parse job fields
function cleanXml(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')  // unwrap CDATA
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchFeed(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 job-bot RSS reader' },
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  return truncate(cleanXml(text), MAX_FEED_TEXT)
}

async function extractJobsFromFeed(
  feedText: string,
  feedUrl: string
): Promise<
  {
    title: string
    company: string
    url: string
    location: string | null
    remote: boolean
    description: string | null
    requirements: string | null
    salary_min: number | null
    salary_max: number | null
  }[]
> {
  const prompt = `Parse this RSS/XML job feed and extract all job listings. Return ONLY a valid JSON array (no markdown, no explanation).

FEED URL: ${feedUrl}
FEED CONTENT:
${feedText}

Return a JSON array where each element has:
{
  "title": "<job title>",
  "company": "<company name or infer from feed if possible>",
  "url": "<direct link to job posting>",
  "location": "<city/state/country or null if fully remote>",
  "remote": <true | false>,
  "description": "<job description in plain text, max 1000 chars>",
  "requirements": "<requirements section in plain text, or null>",
  "salary_min": <annual USD integer or null>,
  "salary_max": <annual USD integer or null>
}

Rules:
- Only include product management, product owner, or closely related roles
- Skip engineering, design, sales, or unrelated roles
- If salary is hourly, multiply by 2080 for annual
- If the feed only lists job titles with links and no description, that's fine — use null for missing fields
- Return an empty array [] if no relevant jobs are found`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

  // Extract JSON array from response
  const arrayMatch = responseText.match(/\[[\s\S]*\]/)
  if (!arrayMatch) return []

  try {
    const parsed = JSON.parse(arrayMatch[0])
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function POST() {
  const supabase = createSupabaseServerClient()

  // Get feed URLs from bot_settings
  const { data: feedSetting } = await supabase
    .from('bot_settings')
    .select('setting_value')
    .eq('setting_key', 'feed_urls')
    .single()

  const feedUrls: string[] = Array.isArray(feedSetting?.setting_value)
    ? (feedSetting.setting_value as string[])
    : []

  if (!feedUrls.length) {
    return NextResponse.json(
      { error: 'No RSS feed URLs configured. Add them in Settings.' },
      { status: 400 }
    )
  }

  let totalNew = 0
  let totalSkipped = 0
  const errors: string[] = []

  for (const feedUrl of feedUrls) {
    try {
      const feedText = await fetchFeed(feedUrl)
      const jobs = await extractJobsFromFeed(feedText, feedUrl)

      for (const job of jobs) {
        if (!job.url || !job.title) continue

        // Deduplicate by URL
        const { data: existing } = await supabase
          .from('jobs')
          .select('id')
          .eq('url', job.url)
          .single()

        if (existing) {
          totalSkipped++
          continue
        }

        // Insert new job
        const { error: insertError } = await supabase.from('jobs').insert({
          title: job.title,
          company: job.company ?? 'Unknown',
          location: job.location ?? null,
          remote: job.remote ?? false,
          url: job.url,
          description: job.description ?? null,
          requirements: job.requirements ?? null,
          salary_min: job.salary_min ?? null,
          salary_max: job.salary_max ?? null,
          source: 'rss',
          status: 'discovered',
          fingerprint: job.url,
        })

        if (!insertError) totalNew++
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      errors.push(`${feedUrl}: ${msg}`)
    }
  }

  return NextResponse.json({
    feeds_processed: feedUrls.length - errors.length,
    new_jobs: totalNew,
    duplicates_skipped: totalSkipped,
    errors: errors.length ? errors : undefined,
  })
}
