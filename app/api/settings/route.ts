import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createSupabaseServerClient()

  const { data, error } = await supabase.from('bot_settings').select('*').order('setting_key')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Convert array to object keyed by setting_key
  const settings: Record<string, unknown> = {}
  data?.forEach((row) => {
    settings[row.setting_key] = row.setting_value
  })

  return NextResponse.json(settings)
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient()

  let body: { key: string; value: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { key, value } = body

  if (!key || value === undefined) {
    return NextResponse.json({ error: 'key and value are required' }, { status: 400 })
  }

  const { error } = await supabase.from('bot_settings').upsert(
    {
      setting_key: key,
      setting_value: value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'setting_key' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
