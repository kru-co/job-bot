import { createSupabaseServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

const VALID_STATUSES = ['discovered', 'queued', 'applied', 'skipped'] as const

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { status } = body

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase
      .from('jobs')
      .update({ status })
      .eq('id', params.id)
      .select('id, status')
      .single()

    if (error) {
      console.error('Job update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient()

  const { data, error } = await supabase.from('jobs').select('*').eq('id', params.id).single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 })
  }

  return NextResponse.json(data)
}
