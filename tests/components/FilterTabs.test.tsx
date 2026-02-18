import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FilterTabs } from '@/components/FilterTabs'

const tabs = [
  { label: 'All', value: 'all', count: 42 },
  { label: 'Perfect', value: 'perfect', count: 12 },
  { label: 'Wider Net', value: 'wider', count: 7 },
  { label: 'Queued', value: 'queued', count: 3 },
]

describe('FilterTabs', () => {
  describe('rendering', () => {
    it('renders all tab labels', () => {
      render(<FilterTabs tabs={tabs} currentFilter="all" baseUrl="/dashboard/jobs" />)
      expect(screen.getByText('All')).toBeInTheDocument()
      expect(screen.getByText('Perfect')).toBeInTheDocument()
      expect(screen.getByText('Wider Net')).toBeInTheDocument()
      expect(screen.getByText('Queued')).toBeInTheDocument()
    })

    it('renders counts for each tab', () => {
      render(<FilterTabs tabs={tabs} currentFilter="all" baseUrl="/dashboard/jobs" />)
      expect(screen.getByText('42')).toBeInTheDocument()
      expect(screen.getByText('12')).toBeInTheDocument()
      expect(screen.getByText('7')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('does not render count when count is undefined', () => {
      const tabsNoCount = [{ label: 'All', value: 'all' }]
      render(<FilterTabs tabs={tabsNoCount} currentFilter="all" baseUrl="/dashboard/jobs" />)
      // Should not throw and label renders fine
      expect(screen.getByText('All')).toBeInTheDocument()
    })
  })

  describe('active tab styling', () => {
    it('applies active class to the current filter tab', () => {
      render(<FilterTabs tabs={tabs} currentFilter="perfect" baseUrl="/dashboard/jobs" />)
      const perfectLink = screen.getByText('Perfect').closest('a')
      expect(perfectLink).toHaveClass('bg-card')
    })

    it('does not apply active class to inactive tabs', () => {
      render(<FilterTabs tabs={tabs} currentFilter="perfect" baseUrl="/dashboard/jobs" />)
      const allLink = screen.getByText('All').closest('a')
      expect(allLink).not.toHaveClass('bg-card')
    })
  })

  describe('href generation', () => {
    it('omits filter param for the first tab (default)', () => {
      render(<FilterTabs tabs={tabs} currentFilter="all" baseUrl="/dashboard/jobs" />)
      const allLink = screen.getByText('All').closest('a')
      expect(allLink).toHaveAttribute('href', '/dashboard/jobs')
    })

    it('adds filter param for non-default tabs', () => {
      render(<FilterTabs tabs={tabs} currentFilter="all" baseUrl="/dashboard/jobs" />)
      const perfectLink = screen.getByText('Perfect').closest('a')
      expect(perfectLink).toHaveAttribute('href', '/dashboard/jobs?filter=perfect')
    })

    it('preserves q (search) param alongside filter', () => {
      render(
        <FilterTabs
          tabs={tabs}
          currentFilter="all"
          currentQuery="stripe"
          baseUrl="/dashboard/jobs"
        />
      )
      const perfectLink = screen.getByText('Perfect').closest('a')
      expect(perfectLink?.getAttribute('href')).toContain('filter=perfect')
      expect(perfectLink?.getAttribute('href')).toContain('q=stripe')
    })

    it('does not include q param when query is empty', () => {
      render(
        <FilterTabs
          tabs={tabs}
          currentFilter="all"
          currentQuery=""
          baseUrl="/dashboard/jobs"
        />
      )
      const perfectLink = screen.getByText('Perfect').closest('a')
      expect(perfectLink?.getAttribute('href')).not.toContain('q=')
    })

    it('uses provided baseUrl correctly', () => {
      render(<FilterTabs tabs={tabs} currentFilter="all" baseUrl="/dashboard/applications" />)
      const allLink = screen.getByText('All').closest('a')
      expect(allLink).toHaveAttribute('href', '/dashboard/applications')
    })
  })
})
