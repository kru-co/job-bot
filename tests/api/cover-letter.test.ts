import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/jobs/[id]/cover-letter/route'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createMockSupabase } from '../helpers/mock-supabase'
import { MOCK_COVER_LETTER_TEXT, mockAnthropicResponse } from '../helpers/mock-anthropic'

vi.mock('@/lib/supabase')

const mockCreate = vi.hoisted(() => vi.fn())
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate }
  },
}))

const JOB_ID = 'job-cl-1'
const mockJob = {
  id: JOB_ID,
  title: 'Head of Product',
  company: 'GrowthCo',
  location: 'Remote',
  remote: true,
  description: 'Drive product vision.',
  requirements: '7+ years PM experience.',
}
const mockCoverLetter = {
  id: 'cl-1',
  job_id: JOB_ID,
  content: MOCK_COVER_LETTER_TEXT,
  template_used: 'claude-sonnet-4-6',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCreate.mockResolvedValue(mockAnthropicResponse(MOCK_COVER_LETTER_TEXT))
})

// ── POST ──────────────────────────────────────────────────────────────────────
describe('POST /api/jobs/[id]/cover-letter', () => {
  it('generates a cover letter and returns it', async () => {
    const { from } = createMockSupabase([
      { data: mockJob, error: null },                  // jobs.select
      { data: { setting_value: { name: 'Alice' } }, error: null }, // bot_settings
      { data: null, error: null },                     // cover_letters.delete (old)
      { data: mockCoverLetter, error: null },           // cover_letters.insert.select.single
      { data: null, error: null },                     // ai_usage_logs.insert
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const req = new Request(`http://localhost/api/jobs/${JOB_ID}/cover-letter`, { method: 'POST' })
    const res = await POST(req, { params: { id: JOB_ID } })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('cl-1')
    expect(body.content).toBe(MOCK_COVER_LETTER_TEXT)
  })

  it('passes job details and profile to Claude', async () => {
    const { from } = createMockSupabase([
      { data: mockJob, error: null },
      { data: { setting_value: { name: 'Bob', target_title: 'VP Product', skills: ['roadmapping'] } }, error: null },
      { data: null, error: null },
      { data: mockCoverLetter, error: null },
      { data: null, error: null },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const req = new Request(`http://localhost/api/jobs/${JOB_ID}/cover-letter`, { method: 'POST' })
    await POST(req, { params: { id: JOB_ID } })

    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.messages[0].content).toContain('Head of Product') // job title
    expect(callArgs.messages[0].content).toContain('GrowthCo')        // company
    expect(callArgs.messages[0].content).toContain('Bob')             // profile name
    expect(callArgs.messages[0].content).toContain('roadmapping')     // skill
  })

  it('deletes existing cover letter before creating new one', async () => {
    const { from } = createMockSupabase([
      { data: mockJob, error: null },
      { data: { setting_value: {} }, error: null },
      { data: null, error: null }, // delete
      { data: mockCoverLetter, error: null },
      { data: null, error: null },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const req = new Request(`http://localhost/api/jobs/${JOB_ID}/cover-letter`, { method: 'POST' })
    await POST(req, { params: { id: JOB_ID } })

    // 3rd from() call should be the delete
    const deleteChain = (from as ReturnType<typeof vi.fn>).mock.results[2].value
    expect(deleteChain.delete).toHaveBeenCalled()
    expect(deleteChain.eq).toHaveBeenCalledWith('job_id', JOB_ID)
  })

  it('returns 404 when job is not found', async () => {
    const { from } = createMockSupabase([
      { data: null, error: { message: 'not found' } },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const req = new Request(`http://localhost/api/jobs/ghost/cover-letter`, { method: 'POST' })
    const res = await POST(req, { params: { id: 'ghost' } })
    expect(res.status).toBe(404)
  })

  it('uses "The Candidate" fallback when profile has no name', async () => {
    const { from } = createMockSupabase([
      { data: mockJob, error: null },
      { data: { setting_value: {} }, error: null },  // empty profile
      { data: null, error: null },
      { data: mockCoverLetter, error: null },
      { data: null, error: null },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const req = new Request(`http://localhost/api/jobs/${JOB_ID}/cover-letter`, { method: 'POST' })
    await POST(req, { params: { id: JOB_ID } })

    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.messages[0].content).toContain('The Candidate')
  })
})

// ── GET ───────────────────────────────────────────────────────────────────────
describe('GET /api/jobs/[id]/cover-letter', () => {
  it('returns the most recent cover letter for a job', async () => {
    const { from } = createMockSupabase([
      { data: mockCoverLetter, error: null },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const req = new Request(`http://localhost/api/jobs/${JOB_ID}/cover-letter`)
    const res = await GET(req, { params: { id: JOB_ID } })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('cl-1')
  })

  it('returns null when no cover letter exists', async () => {
    const { from } = createMockSupabase([
      { data: null, error: { code: 'PGRST116' } },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const req = new Request(`http://localhost/api/jobs/${JOB_ID}/cover-letter`)
    const res = await GET(req, { params: { id: JOB_ID } })

    expect(res.status).toBe(200)
    expect(await res.json()).toBeNull()
  })
})
