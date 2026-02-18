import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/settings/route'
import { createSupabaseServerClient } from '@/lib/supabase'
import { createMockSupabase, createChain } from '../helpers/mock-supabase'

vi.mock('@/lib/supabase')

beforeEach(() => vi.clearAllMocks())

// ── GET /api/settings ─────────────────────────────────────────────────────────
describe('GET /api/settings', () => {
  it('returns settings as a key→value object', async () => {
    const rows = [
      { setting_key: 'user_profile', setting_value: { name: 'Alice' } },
      { setting_key: 'feed_urls', setting_value: ['https://example.com/rss'] },
    ]
    const { from } = createMockSupabase([{ data: rows, error: null }])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user_profile).toEqual({ name: 'Alice' })
    expect(body.feed_urls).toEqual(['https://example.com/rss'])
  })

  it('returns 500 on database error', async () => {
    const { from } = createMockSupabase([{ data: null, error: { message: 'DB down' } }])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await GET()
    expect(res.status).toBe(500)
  })

  it('returns empty object when no settings exist', async () => {
    const { from } = createMockSupabase([{ data: [], error: null }])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({})
  })
})

// ── POST /api/settings ────────────────────────────────────────────────────────
describe('POST /api/settings', () => {
  it('upserts a setting and returns success', async () => {
    const { from } = createMockSupabase([{ data: null, error: null }])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const req = new Request('http://localhost/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'feed_urls', value: ['https://example.com/rss'] }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })

  it('returns 400 for missing key', async () => {
    const { from } = createMockSupabase([])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const req = new Request('http://localhost/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'something' }), // no key
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid JSON', async () => {
    const { from } = createMockSupabase([])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const req = new Request('http://localhost/api/settings', {
      method: 'POST',
      body: 'not-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 500 on database error', async () => {
    const { from } = createMockSupabase([{ data: null, error: { message: 'Conflict' } }])
    vi.mocked(createSupabaseServerClient).mockReturnValue({ from } as ReturnType<typeof createSupabaseServerClient>)

    const req = new Request('http://localhost/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'user_profile', value: {} }),
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})
