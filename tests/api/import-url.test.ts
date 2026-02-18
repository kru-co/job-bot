import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/jobs/import-url/route'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createMockSupabase } from '../helpers/mock-supabase'
import { MOCK_JOB_EXTRACTION_JSON, mockAnthropicResponse } from '../helpers/mock-anthropic'

vi.mock('@/lib/supabase')

const mockCreate = vi.hoisted(() => vi.fn())
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate }
  },
}))

const VALID_URL = 'https://jobs.example.com/pm-role-123'
const PAGE_HTML = '<html><body><h1>Senior PM</h1><p>'.padEnd(250, 'Join our team. ') + '</p></body></html>'

const mockInsertedJob = {
  id: 'job-new-1',
  title: 'Senior Product Manager',
  company: 'Acme Corp',
  url: VALID_URL,
  status: 'discovered',
}

function makeRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/jobs/import-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function mockFetchSuccess(html = PAGE_HTML) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(html),
  }))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  mockCreate.mockResolvedValue(mockAnthropicResponse(MOCK_JOB_EXTRACTION_JSON))
})

describe('POST /api/jobs/import-url', () => {
  it('imports a job from a URL and returns 201', async () => {
    mockFetchSuccess()
    const { from } = createMockSupabase([
      { data: null, error: { code: 'PGRST116' } },  // no duplicate
      { data: mockInsertedJob, error: null },          // insert
      { data: null, error: null },                    // ai_usage_logs
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await POST(makeRequest({ url: VALID_URL }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.title).toBe('Senior Product Manager')
    expect(body.company).toBe('Acme Corp')
  })

  it('inserts job with source=url_import and status=discovered', async () => {
    mockFetchSuccess()
    const { from } = createMockSupabase([
      { data: null, error: { code: 'PGRST116' } },
      { data: mockInsertedJob, error: null },
      { data: null, error: null },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    await POST(makeRequest({ url: VALID_URL }))

    const insertChain = (from as ReturnType<typeof vi.fn>).mock.results[1].value
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'url_import', status: 'discovered', url: VALID_URL })
    )
  })

  it('returns 409 when URL already exists', async () => {
    mockFetchSuccess()
    const { from } = createMockSupabase([
      { data: { id: 'job-existing' }, error: null }, // duplicate found
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await POST(makeRequest({ url: VALID_URL }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.jobId).toBe('job-existing')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('returns 400 for missing URL', async () => {
    const { from } = createMockSupabase([])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await POST(makeRequest({ url: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for non-HTTP URL', async () => {
    const { from } = createMockSupabase([])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await POST(makeRequest({ url: 'ftp://example.com/job' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid JSON body', async () => {
    const { from } = createMockSupabase([])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const req = new Request('http://localhost/api/jobs/import-url', {
      method: 'POST',
      body: 'not-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 422 when the page fetch fails with HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))
    const { from } = createMockSupabase([
      { data: null, error: { code: 'PGRST116' } },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await POST(makeRequest({ url: VALID_URL }))
    expect(res.status).toBe(422)
  })

  it('returns 422 when page content is too short', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<html><body>Short</body></html>'),
    }))
    const { from } = createMockSupabase([
      { data: null, error: { code: 'PGRST116' } },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await POST(makeRequest({ url: VALID_URL }))
    expect(res.status).toBe(422)
  })

  it('returns 422 when Claude cannot extract title or company', async () => {
    mockFetchSuccess()
    mockCreate.mockResolvedValueOnce(
      mockAnthropicResponse(JSON.stringify({ title: '', company: '', location: null, remote: false }))
    )
    const { from } = createMockSupabase([
      { data: null, error: { code: 'PGRST116' } },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await POST(makeRequest({ url: VALID_URL }))
    expect(res.status).toBe(422)
  })

  it('logs AI usage after successful import', async () => {
    mockFetchSuccess()
    const { from } = createMockSupabase([
      { data: null, error: { code: 'PGRST116' } },
      { data: mockInsertedJob, error: null },
      { data: null, error: null },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    await POST(makeRequest({ url: VALID_URL }))

    const logChain = (from as ReturnType<typeof vi.fn>).mock.results[2].value
    expect(logChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'url_import', model: 'claude-sonnet-4-6' })
    )
  })
})
