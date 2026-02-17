'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Loader2 } from 'lucide-react'

const TARGET_COMPANIES = [
  'Amazon', 'Microsoft', 'Google', 'Apple', 'Meta',
  'Tesla', 'Rivian', 'SpaceX', 'Stripe', 'Shopify',
]

export default function NewJobPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    company: '',
    url: '',
    location: '',
    remote: false,
    salary_min: '',
    salary_max: '',
    description: '',
    requirements: '',
  })

  const set = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Failed to add job')
        return
      }

      toast.success('Job added successfully!')
      router.push(`/dashboard/jobs/${data.id}`)
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/dashboard/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors animate-fade-in-up"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Jobs
      </Link>

      {/* Header */}
      <div className="animate-fade-in-up delay-100">
        <h1 className="text-3xl font-serif font-bold">Add Job Manually</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Paste a job posting URL and details to track it
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up delay-200">
        {/* Core info */}
        <div className="card-organic p-6 space-y-5">
          <h2 className="font-serif font-bold text-base">Job Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Job Title <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Senior Product Manager"
                className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Company <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                list="companies"
                value={form.company}
                onChange={(e) => set('company', e.target.value)}
                placeholder="Amazon"
                className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
              <datalist id="companies">
                {TARGET_COMPANIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Job URL <span className="text-destructive">*</span>
            </label>
            <input
              type="url"
              required
              value={form.url}
              onChange={(e) => set('url', e.target.value)}
              placeholder="https://careers.example.com/jobs/123"
              className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="Seattle, WA"
                className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Work Type</label>
              <div className="flex items-center gap-3 h-[42px]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.remote}
                    onChange={(e) => set('remote', e.target.checked)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <span className="text-sm">Remote available</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Salary */}
        <div className="card-organic p-6 space-y-4">
          <h2 className="font-serif font-bold text-base">Salary Range</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Minimum</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <input
                  type="number"
                  value={form.salary_min}
                  onChange={(e) => set('salary_min', e.target.value)}
                  placeholder="150000"
                  min="0"
                  step="5000"
                  className="w-full pl-7 pr-3.5 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Maximum</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <input
                  type="number"
                  value={form.salary_max}
                  onChange={(e) => set('salary_max', e.target.value)}
                  placeholder="200000"
                  min="0"
                  step="5000"
                  className="w-full pl-7 pr-3.5 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="card-organic p-6 space-y-4">
          <h2 className="font-serif font-bold text-base">Job Content</h2>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Job Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Paste the job description here…"
              rows={6}
              className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow resize-y"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Requirements</label>
            <textarea
              value={form.requirements}
              onChange={(e) => set('requirements', e.target.value)}
              placeholder="Paste requirements / qualifications here…"
              rows={4}
              className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow resize-y"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {loading ? 'Adding…' : 'Add Job'}
          </button>
          <Link
            href="/dashboard/jobs"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
