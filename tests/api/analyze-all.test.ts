import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/jobs/analyze-all/route'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createMockSupabase } from '../helpers/mock-supabase'
import { MOCK_ANALYSIS_JSON, mockAnthropicResponse } from '../helpers/mock-anthropic'

vi.mock('@/lib/supabase')

const mockCreate = vi.hoisted(() => vi.fn())
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate }
  },
}))

const mockJob = {
  id: 'job-1',
  title: 'Product Manager',
  company: 'Acme',
  location: 'NYC',
  remote: false,
  salary_min: 130000,
  salary_max: 170000,
  description: 'Lead product.',
  requirements: '5+ years PM.',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCreate.mockResolvedValue(mockAnthropicResponse(MOCK_ANALYSIS_JSON))
})

// ── GET ───────────────────────────────────────────────────────────────────────
describe('GET /api/jobs/analyze-all', () => {
  it('returns count of unanalyzed jobs', async () => {
    const { from } = createMockSupabase([{ count: 7, data: [], error: null }])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ unanalyzed: 7 })
  })

  it('returns 0 when all jobs are analysed', async () => {
    const { from } = createMockSupabase([{ count: 0, data: [], error: null }])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await GET()
    expect(await res.json()).toEqual({ unanalyzed: 0 })
  })
})

// ── POST ──────────────────────────────────────────────────────────────────────
describe('POST /api/jobs/analyze-all', () => {
  it('returns early with 0 analyzed when no unanalyzed jobs exist', async () => {
    const { from } = createMockSupabase([
      { data: [], error: null },  // jobs.select (empty)
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.analyzed).toBe(0)
    expect(body.message).toMatch(/already analysed/i)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('analyses one job and returns result summary', async () => {
    const { from } = createMockSupabase([
      { data: [mockJob], error: null },                                  // initial jobs fetch
      { data: { setting_value: { name: 'Alice' } }, error: null },       // bot_settings
      { data: null, error: null },                                        // jobs.update
      { data: null, error: null },                                        // ai_usage_logs.insert
      { count: 0, data: [], error: null },                               // remaining count
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.analyzed).toBe(1)
    expect(body.remaining).toBe(0)
    expect(body.total_cost).toBeTypeOf('number')
    expect(body.results).toHaveLength(1)
    expect(body.results[0].match_quality).toBe('perfect')
    expect(body.results[0].match_confidence).toBe(88)
  })

  it('updates job with match data from Claude response', async () => {
    const { from } = createMockSupabase([
      { data: [mockJob], error: null },
      { data: { setting_value: {} }, error: null },
      { data: null, error: null },
      { data: null, error: null },
      { count: 0, data: [], error: null },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    await POST()

    const updateChain = (from as ReturnType<typeof vi.fn>).mock.results[2].value
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        match_quality: 'perfect',
        match_confidence: 88,
        match_reasoning: expect.stringContaining('Strengths'),
      })
    )
  })

  it('skips a job that fails analysis and continues with next', async () => {
    const job2 = { ...mockJob, id: 'job-2', title: 'PM Lead' }
    // First Claude call throws, second succeeds
    mockCreate
      .mockRejectedValueOnce(new Error('API timeout'))
      .mockResolvedValueOnce(mockAnthropicResponse(MOCK_ANALYSIS_JSON))

    const { from } = createMockSupabase([
      { data: [mockJob, job2], error: null },  // initial fetch (2 jobs)
      { data: { setting_value: {} }, error: null }, // bot_settings
      // job-1 fails (throws before update), so only job-2 calls update/insert
      { data: null, error: null },             // jobs.update (job-2)
      { data: null, error: null },             // ai_usage_logs.insert (job-2)
      { count: 1, data: [], error: null },     // remaining count (job-1 still unanalyzed)
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await POST()
    expect(res.status).toBe(200)
    const body = await res.json()
    // Only job-2 succeeded
    expect(body.analyzed).toBe(1)
    expect(body.remaining).toBe(1)
  })

  it('calculates total_cost correctly across multiple jobs', async () => {
    const job2 = { ...mockJob, id: 'job-2' }
    const { from } = createMockSupabase([
      { data: [mockJob, job2], error: null },
      { data: { setting_value: {} }, error: null },
      { data: null, error: null },  // job-1 update
      { data: null, error: null },  // job-1 logs
      { data: null, error: null },  // job-2 update
      { data: null, error: null },  // job-2 logs
      { count: 0, data: [], error: null },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await POST()
    const body = await res.json()

    // Each job: 150 × 0.000003 + 80 × 0.000015 = 0.00165, two jobs = 0.0033
    expect(body.total_cost).toBeCloseTo(0.0033, 4)
  })

  it('reports database error gracefully when jobs fetch fails', async () => {
    const { from } = createMockSupabase([
      { data: null, error: { message: 'relation not found' } },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await POST()
    expect(res.status).toBe(500)
  })
})
