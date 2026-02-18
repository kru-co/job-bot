'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Settings, User, Bot, Save, Loader2 } from 'lucide-react'
import { TagInput } from '@/components/TagInput'
import type { UserProfile } from '@/lib/supabase'

const defaultProfile: UserProfile = {
  name: '',
  email: '',
  target_title: 'Product Manager',
  years_experience: '7-10',
  background: '',
  skills: [],
  target_salary: 165000,
  location: '',
  remote_preference: 'any',
  target_industries: [],
}

const remoteOptions: { value: UserProfile['remote_preference']; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
]

// Coerce a saved value to string[] (handles old plain-string format gracefully)
function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[]
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map((s) => s.trim()).filter(Boolean)
  }
  return []
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile)
  const [dailyQuota, setDailyQuota] = useState({ total: 8, perfect_match: 3, wider_net: 5 })
  const [botEnabled, setBotEnabled] = useState(true)
  const [companyWeeklyLimit, setCompanyWeeklyLimit] = useState(2)
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingBot, setSavingBot] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.user_profile) {
          const saved = data.user_profile as Record<string, unknown>
          setProfile({
            ...defaultProfile,
            ...(saved as Partial<UserProfile>),
            skills: toArray(saved.skills),
            target_industries: toArray(saved.target_industries),
          })
        }
        if (data.daily_quota) setDailyQuota(data.daily_quota as typeof dailyQuota)
        if (data.bot_enabled) setBotEnabled((data.bot_enabled as { enabled: boolean }).enabled)
        if (data.company_weekly_limit)
          setCompanyWeeklyLimit((data.company_weekly_limit as { limit: number }).limit)
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  const saveProfile = async () => {
    setSavingProfile(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'user_profile', value: profile }),
      })
      if (!res.ok) throw new Error()
      toast.success('Profile saved!')
    } catch {
      toast.error('Failed to save profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const saveBotSettings = async () => {
    setSavingBot(true)
    try {
      await Promise.all([
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'daily_quota', value: dailyQuota }),
        }),
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'bot_enabled', value: { enabled: botEnabled } }),
        }),
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'company_weekly_limit', value: { limit: companyWeeklyLimit } }),
        }),
      ])
      toast.success('Bot settings saved!')
    } catch {
      toast.error('Failed to save bot settings')
    } finally {
      setSavingBot(false)
    }
  }

  const inputClass =
    'w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 animate-fade-in-up">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-serif font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Configure your profile and bot behaviour</p>
        </div>
      </div>

      {/* Profile Section */}
      <div className="card-organic p-8 space-y-6 animate-fade-in-up delay-100">
        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
          <User className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-serif font-bold">Your Profile</h2>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          This profile is used by Claude to personalise match analysis and cover letters.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Full Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="Your full name"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              placeholder="your@email.com"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Target Title</label>
            <input
              type="text"
              value={profile.target_title}
              onChange={(e) => setProfile({ ...profile, target_title: e.target.value })}
              placeholder="e.g. Senior Product Manager"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Years of Experience</label>
            <input
              type="text"
              value={profile.years_experience}
              onChange={(e) => setProfile({ ...profile, years_experience: e.target.value })}
              placeholder="e.g. 7-10"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Location</label>
            <input
              type="text"
              value={profile.location}
              onChange={(e) => setProfile({ ...profile, location: e.target.value })}
              placeholder="e.g. Seattle, WA"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Remote Preference</label>
            <div className="flex rounded-xl border border-border bg-background overflow-hidden h-[42px]">
              {remoteOptions.map((opt, i) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setProfile({ ...profile, remote_preference: opt.value })}
                  className={[
                    'flex-1 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30',
                    i > 0 ? 'border-l border-border' : '',
                    profile.remote_preference === opt.value
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Target Salary (USD)</label>
            <input
              type="number"
              value={profile.target_salary}
              onChange={(e) => setProfile({ ...profile, target_salary: Number(e.target.value) })}
              placeholder="165000"
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Target Industries</label>
            <TagInput
              tags={profile.target_industries}
              onChange={(tags) => setProfile({ ...profile, target_industries: tags })}
              placeholder="Type an industry and press Enter…"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Key Skills</label>
          <TagInput
            tags={profile.skills}
            onChange={(tags) => setProfile({ ...profile, skills: tags })}
            placeholder="Type a skill and press Enter…"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Professional Background</label>
          <textarea
            value={profile.background}
            onChange={(e) => setProfile({ ...profile, background: e.target.value })}
            rows={5}
            placeholder="Summarise your career background, key achievements, and what makes you a strong PM candidate…"
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          <p className="text-xs text-muted-foreground">
            This is sent to Claude when generating cover letters and match analysis. Be detailed.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={saveProfile}
            disabled={savingProfile}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {savingProfile ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </div>

      {/* Bot Settings */}
      <div className="card-organic p-8 space-y-6 animate-fade-in-up delay-200">
        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
          <Bot className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-serif font-bold">Bot Configuration</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Bot Status</p>
            <p className="text-xs text-muted-foreground">Enable or pause the automated application bot</p>
          </div>
          <button
            onClick={() => setBotEnabled(!botEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              botEnabled ? 'bg-sage' : 'bg-border'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                botEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Daily Total Quota</label>
            <input
              type="number"
              min={1}
              max={50}
              value={dailyQuota.total}
              onChange={(e) => setDailyQuota({ ...dailyQuota, total: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Perfect Match Quota</label>
            <input
              type="number"
              min={1}
              max={20}
              value={dailyQuota.perfect_match}
              onChange={(e) => setDailyQuota({ ...dailyQuota, perfect_match: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Wider Net Quota</label>
            <input
              type="number"
              min={1}
              max={30}
              value={dailyQuota.wider_net}
              onChange={(e) => setDailyQuota({ ...dailyQuota, wider_net: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-1.5 max-w-xs">
          <label className="text-sm font-medium">Max Applications per Company per Week</label>
          <input
            type="number"
            min={1}
            max={10}
            value={companyWeeklyLimit}
            onChange={(e) => setCompanyWeeklyLimit(Number(e.target.value))}
            className={inputClass}
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={saveBotSettings}
            disabled={savingBot}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingBot ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {savingBot ? 'Saving…' : 'Save Bot Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
