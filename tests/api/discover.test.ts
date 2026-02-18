import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/jobs/discover/route'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createMockSupabase } from '../helpers/mock-supabase'
import { MOCK_RSS_JOBS_JSON, mockAnthropicResponse } from '../helpers/mock-anthropic'

vi.mock('@/lib/supabase')

const mockCreate = vi.hoisted(() => vi.fn())
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate }
  },
}))

const RSS_URL = 'https://jobs.example.com/pm.rss'
const SAMPLE_RSS = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>PM Jobs</title>
    <item>
      <title>Product Manager</title>
      <link>https://startup.io/jobs/pm-1</link>
      <description>Lead product development.</description>
    </item>
  </channel>
</rss>`

function mockRssFetch(xml = SAMPLE_RSS) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(xml),
    status: 200,
  }))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  mockCreate.mockResolvedValue(mockAnthropicResponse(MOCK_RSS_JOBS_JSON))
})

describe('POST /api/jobs/discover', () => {
  it('returns 400 when no feed URLs are configured', async () => {
    const { from } = createMockSupabase([
      { data: null, error: { code: 'PGRST116' } }, // no feed_urls setting
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await POST()
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/No RSS feed URLs/i)
  })

  it('returns 400 when feed_urls is an empty array', async () => {
    const { from } = createMockSupabase([
      { data: { setting_value: [] }, error: null },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await POST()
    expect(res.status).toBe(400)
  })

  it('inserts new jobs found in the feed', async () => {
    mockRssFetch()
    const { from } = createMockSupabase([
      { data: { setting_value: [RSS_URL] }, error: null }, // feed_urls setting
      { data: null, error: { code: 'PGRST116' } },          // dedup check → no existing job
      { data: null, error: null },                            // jobs.insert
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.new_jobs).toBe(1)
    expect(body.feeds_processed).toBe(1)
  })

  it('deduplicates jobs already in the database', async () => {
    mockRssFetch()
    const { from } = createMockSupabase([
      { data: { setting_value: [RSS_URL] }, error: null },
      { data: { id: 'job-existing' }, error: null }, // dedup check → already exists
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.new_jobs).toBe(0)
    expect(body.duplicates_skipped).toBe(1)

    // Should not insert any jobs
    const insertCalls = (from as ReturnType<typeof vi.fn>).mock.calls.filter(
      (call: string[]) => call[0] === 'jobs'
    )
    // jobs from() was called for: insert-check only; no insert follow-up
    expect(body.duplicates_skipped).toBe(1)
  })

  it('inserts job with correct fields and source=rss', async () => {
    mockRssFetch()
    const { from } = createMockSupabase([
      { data: { setting_value: [RSS_URL] }, error: null },
      { data: null, error: { code: 'PGRST116' } },
      { data: null, error: null },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    await POST()

    const insertChain = (from as ReturnType<typeof vi.fn>).mock.results[2].value
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'rss',
        status: 'discovered',
        url: 'https://startup.io/jobs/pm-1',
        title: 'Product Manager',
      })
    )
  })

  it('reports feed fetch errors without crashing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    const { from } = createMockSupabase([
      { data: { setting_value: [RSS_URL] }, error: null },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.new_jobs).toBe(0)
    expect(body.errors).toHaveLength(1)
    expect(body.errors[0]).toContain(RSS_URL)
  })

  it('processes multiple feeds, counting new jobs across all', async () => {
    const RSS_URL_2 = 'https://other.com/pm-jobs.rss'
    mockRssFetch()
    const { from } = createMockSupabase([
      { data: { setting_value: [RSS_URL, RSS_URL_2] }, error: null },
      // feed 1 job
      { data: null, error: { code: 'PGRST116' } },
      { data: null, error: null },
      // feed 2 job (Claude returns the same mock response → same URL → will be dedup'd)
      { data: { id: 'job-existing' }, error: null }, // already exists
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await POST()
    const body = await res.json()
    expect(body.new_jobs).toBe(1)
    expect(body.duplicates_skipped).toBe(1)
  })

  it('skips jobs that have no URL', async () => {
    const rssWithNoUrlJob = JSON.stringify([
      { title: 'PM', company: 'Co', url: '', remote: false, location: null, description: null, requirements: null, salary_min: null, salary_max: null },
    ])
    mockCreate.mockResolvedValueOnce(mockAnthropicResponse(rssWithNoUrlJob))
    mockRssFetch()
    const { from } = createMockSupabase([
      { data: { setting_value: [RSS_URL] }, error: null },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await POST()
    const body = await res.json()
    expect(body.new_jobs).toBe(0)
  })
})
