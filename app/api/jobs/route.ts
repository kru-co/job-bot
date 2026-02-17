import { createSupabaseServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const filter = searchParams.get('filter') ?? 'all'
  const query = searchParams.get('q')?.trim() ?? ''
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '60'), 100)

  const supabase = createSupabaseServerClient()

  let q = supabase
    .from('jobs')
    .select(
      'id, title, company, location, remote, url, salary_min, salary_max, source, match_quality, match_confidence, status, discovered_date'
    )
    .order('discovered_date', { ascending: false })
    .limit(limit)

  if (filter === 'perfect') q = q.eq('match_quality', 'perfect').not('status', 'in', '(applied,skipped)')
  else if (filter === 'wider') q = q.eq('match_quality', 'wider_net').not('status', 'in', '(applied,skipped)')
  else if (filter === 'queued') q = q.eq('status', 'queued')
  else if (filter === 'applied') q = q.eq('status', 'applied')
  else if (filter === 'skipped') q = q.eq('status', 'skipped')

  if (query) q = q.or(`title.ilike.%${query}%,company.ilike.%${query}%`)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      title,
      company,
      url,
      location,
      remote,
      salary_min,
      salary_max,
      description,
      requirements,
      source = 'manual',
    } = body

    if (!title?.trim() || !company?.trim() || !url?.trim()) {
      return NextResponse.json(
        { error: 'title, company, and url are required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()

    // Look up company_id if we have a matching company
    const { data: companyRow } = await supabase
      .from('companies')
      .select('id')
      .ilike('name', company.trim())
      .limit(1)
      .single()

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        title: title.trim(),
        company: company.trim(),
        company_id: companyRow?.id ?? null,
        url: url.trim(),
        location: location?.trim() || null,
        remote: remote ?? false,
        salary_min: salary_min ? parseInt(salary_min) : null,
        salary_max: salary_max ? parseInt(salary_max) : null,
        description: description?.trim() || null,
        requirements: requirements?.trim() || null,
        source,
        status: 'discovered',
        match_quality: null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A job with this URL already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
