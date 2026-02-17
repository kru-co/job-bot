import { createSupabaseServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()

    const now = new Date()

    // Today: midnight local → UTC ISO
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    // This week: start from Monday
    const weekStart = new Date(now)
    const day = weekStart.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    weekStart.setDate(weekStart.getDate() + diffToMonday)
    weekStart.setHours(0, 0, 0, 0)

    const [
      { count: todayCount },
      { count: weekCount },
      { count: totalSubmitted },
      { count: queuedJobs },
      { count: perfectMatchJobs },
      { data: settings },
      { data: recentApps },
    ] = await Promise.all([
      supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .gte('application_date', todayStart.toISOString()),
      supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .gte('application_date', weekStart.toISOString()),
      supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted'),
      supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'queued'),
      supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('match_quality', 'perfect')
        .eq('status', 'discovered'),
      supabase
        .from('bot_settings')
        .select('setting_key, setting_value'),
      supabase
        .from('applications')
        .select('id, status, application_date, application_type, jobs(title, company, location)')
        .order('application_date', { ascending: false })
        .limit(5),
    ])

    const dailyQuota = (settings?.find((s) => s.setting_key === 'daily_quota')?.setting_value as { total?: number } | null)?.total ?? 8
    const botEnabled = (settings?.find((s) => s.setting_key === 'bot_enabled')?.setting_value as { enabled?: boolean } | null)?.enabled ?? true

    return NextResponse.json({
      today_count: todayCount ?? 0,
      week_count: weekCount ?? 0,
      total_submitted: totalSubmitted ?? 0,
      queued_jobs: queuedJobs ?? 0,
      perfect_match_jobs: perfectMatchJobs ?? 0,
      daily_quota: dailyQuota,
      bot_enabled: botEnabled,
      recent_applications: recentApps ?? [],
    })
  } catch (err) {
    console.error('Stats API error:', err)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
