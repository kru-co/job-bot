import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/jobs/[id]/apply/route'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createMockSupabase } from '../helpers/mock-supabase'

vi.mock('@/lib/supabase')

const JOB_ID = 'job-abc'
const mockJob = { id: JOB_ID, status: 'queued', title: 'Senior PM', company: 'Acme' }
const mockApplication = { id: 'app-1', job_id: JOB_ID, status: 'submitted', cover_letter_id: null }

function makeRequest(body?: Record<string, unknown>) {
  return new Request(`http://localhost/api/jobs/${JOB_ID}/apply`, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/jobs/[id]/apply', () => {
  it('creates an application and returns 201', async () => {
    const { from } = createMockSupabase([
      { data: mockJob, error: null },              // jobs.select → job found
      { data: null, error: { code: 'PGRST116' } },// cover_letters.single → none
      { data: mockApplication, error: null },       // applications.insert.select.single
      { data: null, error: null },                  // jobs.update
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await POST(makeRequest(), { params: { id: JOB_ID } })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('app-1')
    expect(body.status).toBe('submitted')
  })

  it('sets application_type to manual', async () => {
    const { from, mockFrom } = (() => {
      const { from } = createMockSupabase([
        { data: mockJob, error: null },
        { data: null, error: { code: 'PGRST116' } },
        { data: mockApplication, error: null },
        { data: null, error: null },
      ])
      return { from, mockFrom: from }
    })()
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    await POST(makeRequest(), { params: { id: JOB_ID } })

    // 3rd from() call is the applications.insert
    const insertChain = (from as ReturnType<typeof vi.fn>).mock.results[2].value
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ application_type: 'manual', status: 'submitted' })
    )
  })

  it('links an existing cover letter when one exists', async () => {
    const { from } = createMockSupabase([
      { data: mockJob, error: null },
      { data: { id: 'cl-99' }, error: null },                             // cover_letters found
      { data: { ...mockApplication, cover_letter_id: 'cl-99' }, error: null },
      { data: null, error: null },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await POST(makeRequest(), { params: { id: JOB_ID } })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.cover_letter_id).toBe('cl-99')

    const insertChain = (from as ReturnType<typeof vi.fn>).mock.results[2].value
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ cover_letter_id: 'cl-99' })
    )
  })

  it('stores optional notes and submission_method from request body', async () => {
    const { from } = createMockSupabase([
      { data: mockJob, error: null },
      { data: null, error: { code: 'PGRST116' } },
      { data: mockApplication, error: null },
      { data: null, error: null },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    await POST(
      makeRequest({ notes: 'Applied via LinkedIn', submission_method: 'linkedin' }),
      { params: { id: JOB_ID } }
    )

    const insertChain = (from as ReturnType<typeof vi.fn>).mock.results[2].value
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_notes: 'Applied via LinkedIn',
        submission_method: 'linkedin',
      })
    )
  })

  it('marks the job status as applied', async () => {
    const { from } = createMockSupabase([
      { data: mockJob, error: null },
      { data: null, error: { code: 'PGRST116' } },
      { data: mockApplication, error: null },
      { data: null, error: null },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    await POST(makeRequest(), { params: { id: JOB_ID } })

    // 4th from() call is jobs.update
    const updateChain = (from as ReturnType<typeof vi.fn>).mock.results[3].value
    expect(updateChain.update).toHaveBeenCalledWith({ status: 'applied' })
  })

  it('returns 404 when job is not found', async () => {
    const { from } = createMockSupabase([
      { data: null, error: { message: 'not found' } },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await POST(makeRequest(), { params: { id: 'ghost-id' } })
    expect(res.status).toBe(404)
  })

  it('returns 500 when application insert fails', async () => {
    const { from } = createMockSupabase([
      { data: mockJob, error: null },
      { data: null, error: { code: 'PGRST116' } },
      { data: null, error: { message: 'insert failed' } }, // insert error
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await POST(makeRequest(), { params: { id: JOB_ID } })
    expect(res.status).toBe(500)
  })

  it('handles missing request body gracefully', async () => {
    const { from } = createMockSupabase([
      { data: mockJob, error: null },
      { data: null, error: { code: 'PGRST116' } },
      { data: mockApplication, error: null },
      { data: null, error: null },
    ])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    // No body at all — should not throw
    const req = new Request(`http://localhost/api/jobs/${JOB_ID}/apply`, { method: 'POST' })
    const res = await POST(req, { params: { id: JOB_ID } })
    expect(res.status).toBe(201)
  })
})
