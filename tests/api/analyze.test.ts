import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/jobs/[id]/analyze/route'
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

const JOB_ID = 'job-xyz'
const mockJob = {
  id: JOB_ID,
  title: 'Product Manager',
  company: 'TechCo',
  location: 'New York',
  remote: false,
  salary_min: 130000,
  salary_max: 170000,
  description: 'Lead product strategy.',
  requirements: '5+ years PM experience.',
}
const mockUpdatedJob = { ...mockJob, match_quality: 'perfect', match_confidence: 88 }

beforeEach(() => {
  vi.clearAllMocks()
  mockCreate.mockResolvedValue(mockAnthropicResponse(MOCK_ANALYSIS_JSON))
})

describe('POST /api/jobs/[id]/analyze', () => {
  it('returns the updated job with match_quality and match_confidence', async () => {
    const { from } = createMockSupabase([
      { data: mockJob, error: null },         // jobs.select
      { data: { setting_value: { name: 'Alice', target_title: 'PM' } }, error: null }, // bot_settings
      { data: mockUpdatedJob, error: null },  // jobs.update.select.single
      { data: null, error: null },            // ai_usage_logs.insert
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const req = new Request(`http://localhost/api/jobs/${JOB_ID}/analyze`, { method: 'POST' })
    const res = await POST(req, { params: { id: JOB_ID } })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.match_quality).toBe('perfect')
    expect(body.match_confidence).toBe(88)
  })

  it('calls Claude with a prompt that includes job title and profile', async () => {
    const { from } = createMockSupabase([
      { data: mockJob, error: null },
      { data: { setting_value: { name: 'Bob', target_title: 'Senior PM' } }, error: null },
      { data: mockUpdatedJob, error: null },
      { data: null, error: null },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const req = new Request(`http://localhost/api/jobs/${JOB_ID}/analyze`, { method: 'POST' })
    await POST(req, { params: { id: JOB_ID } })

    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.model).toBe('claude-sonnet-4-6')
    expect(callArgs.messages[0].content).toContain('Product Manager')  // job title
    expect(callArgs.messages[0].content).toContain('Bob')               // profile name
  })

  it('normalises an invalid match_quality to wider_net', async () => {
    const badAnalysis = JSON.stringify({ match_quality: 'bogus_value', match_confidence: 50, match_reasoning: 'test' })
    mockCreate.mockResolvedValueOnce(mockAnthropicResponse(badAnalysis))

    const { from } = createMockSupabase([
      { data: mockJob, error: null },
      { data: { setting_value: {} }, error: null },
      { data: { ...mockUpdatedJob, match_quality: 'wider_net' }, error: null },
      { data: null, error: null },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const req = new Request(`http://localhost/api/jobs/${JOB_ID}/analyze`, { method: 'POST' })
    const res = await POST(req, { params: { id: JOB_ID } })

    expect(res.status).toBe(200)
    // The update should have been called with wider_net
    const updateChain = (from as ReturnType<typeof vi.fn>).mock.results[2].value
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ match_quality: 'wider_net' })
    )
  })

  it('clamps match_confidence to 0-100 range', async () => {
    const clampAnalysis = JSON.stringify({ match_quality: 'perfect', match_confidence: 150, match_reasoning: 'great' })
    mockCreate.mockResolvedValueOnce(mockAnthropicResponse(clampAnalysis))

    const { from } = createMockSupabase([
      { data: mockJob, error: null },
      { data: { setting_value: {} }, error: null },
      { data: { ...mockUpdatedJob, match_confidence: 100 }, error: null },
      { data: null, error: null },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const req = new Request(`http://localhost/api/jobs/${JOB_ID}/analyze`, { method: 'POST' })
    await POST(req, { params: { id: JOB_ID } })

    const updateChain = (from as ReturnType<typeof vi.fn>).mock.results[2].value
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ match_confidence: 100 }) // clamped from 150
    )
  })

  it('logs AI usage with correct cost calculation', async () => {
    // Claude Sonnet 4.6: $3/1M input, $15/1M output
    // 150 input tokens × 0.000003 + 80 output tokens × 0.000015 = 0.00045 + 0.0012 = 0.00165
    const { from } = createMockSupabase([
      { data: mockJob, error: null },
      { data: { setting_value: {} }, error: null },
      { data: mockUpdatedJob, error: null },
      { data: null, error: null },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const req = new Request(`http://localhost/api/jobs/${JOB_ID}/analyze`, { method: 'POST' })
    await POST(req, { params: { id: JOB_ID } })

    const logChain = (from as ReturnType<typeof vi.fn>).mock.results[3].value
    expect(logChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'job_scoring',
        model: 'claude-sonnet-4-6',
        input_tokens: 150,
        output_tokens: 80,
        cost: expect.closeTo(0.00165, 5),
      })
    )
  })

  it('returns 404 when job is not found', async () => {
    const { from } = createMockSupabase([
      { data: null, error: { message: 'not found' } },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const req = new Request(`http://localhost/api/jobs/ghost/analyze`, { method: 'POST' })
    const res = await POST(req, { params: { id: 'ghost' } })
    expect(res.status).toBe(404)
  })

  it('returns 500 when Claude returns unparseable JSON', async () => {
    mockCreate.mockResolvedValueOnce(mockAnthropicResponse('This is not JSON at all.'))

    const { from } = createMockSupabase([
      { data: mockJob, error: null },
      { data: { setting_value: {} }, error: null },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const req = new Request(`http://localhost/api/jobs/${JOB_ID}/analyze`, { method: 'POST' })
    const res = await POST(req, { params: { id: JOB_ID } })
    expect(res.status).toBe(500)
  })
})
