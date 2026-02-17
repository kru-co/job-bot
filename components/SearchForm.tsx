'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'

export function SearchForm({
  currentQuery,
  currentFilter,
  baseUrl,
}: {
  currentQuery: string
  currentFilter: string
  baseUrl: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const navigate = (q: string) => {
    const params = new URLSearchParams()
    if (currentFilter !== 'all') params.set('filter', currentFilter)
    if (q) params.set('q', q)
    const qs = params.toString()
    router.push(qs ? `${baseUrl}?${qs}` : baseUrl)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(inputRef.current?.value.trim() ?? '')
  }

  const handleClear = () => {
    if (inputRef.current) inputRef.current.value = ''
    navigate('')
  }

  return (
    <form onSubmit={handleSubmit} className="relative flex-1 max-w-xs">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      <input
        ref={inputRef}
        type="search"
        defaultValue={currentQuery}
        placeholder="Search title or company…"
        className="w-full pl-9 pr-8 py-2 rounded-xl bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
      />
      {currentQuery && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </form>
  )
}
