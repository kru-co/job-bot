import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { JobCard, type Job } from '@/components/JobCard'

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    title: 'Senior Product Manager',
    company: 'Acme Corp',
    location: 'San Francisco, CA',
    remote: false,
    url: 'https://acme.com/jobs/pm',
    salary_min: 140000,
    salary_max: 180000,
    source: 'linkedin',
    match_quality: 'perfect',
    match_confidence: 92,
    status: 'discovered',
    discovered_date: new Date().toISOString(),
    ...overrides,
  }
}

describe('JobCard', () => {
  describe('core content', () => {
    it('renders job title and company', () => {
      render(<JobCard job={makeJob()} />)
      expect(screen.getByText('Senior Product Manager')).toBeInTheDocument()
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })

    it('links to the job detail page', () => {
      render(<JobCard job={makeJob()} />)
      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/dashboard/jobs/job-1')
    })
  })

  describe('match quality badge', () => {
    it('shows "Perfect" badge with confidence for perfect match', () => {
      render(<JobCard job={makeJob({ match_quality: 'perfect', match_confidence: 92 })} />)
      expect(screen.getByText('Perfect 92%')).toBeInTheDocument()
    })

    it('shows "Wider Net" badge for wider_net match', () => {
      render(<JobCard job={makeJob({ match_quality: 'wider_net', match_confidence: 65 })} />)
      expect(screen.getByText('Wider Net 65%')).toBeInTheDocument()
    })

    it('shows "No Match" badge for no_match', () => {
      render(<JobCard job={makeJob({ match_quality: 'no_match', match_confidence: 20 })} />)
      expect(screen.getByText('No Match 20%')).toBeInTheDocument()
    })

    it('shows no match badge when match_quality is null', () => {
      render(<JobCard job={makeJob({ match_quality: null, match_confidence: null })} />)
      // Only the status badge should appear
      expect(screen.queryByText(/Perfect|Wider Net|No Match/)).not.toBeInTheDocument()
    })

    it('omits confidence percentage when match_confidence is null', () => {
      render(<JobCard job={makeJob({ match_quality: 'perfect', match_confidence: null })} />)
      expect(screen.getByText('Perfect')).toBeInTheDocument()
      expect(screen.queryByText('Perfect null%')).not.toBeInTheDocument()
    })
  })

  describe('status badge', () => {
    it('shows "discovered" status', () => {
      render(<JobCard job={makeJob({ status: 'discovered' })} />)
      expect(screen.getByText('discovered')).toBeInTheDocument()
    })

    it('shows "queued" status', () => {
      render(<JobCard job={makeJob({ status: 'queued' })} />)
      expect(screen.getByText('queued')).toBeInTheDocument()
    })

    it('shows "applied" status', () => {
      render(<JobCard job={makeJob({ status: 'applied' })} />)
      expect(screen.getByText('applied')).toBeInTheDocument()
    })

    it('shows "skipped" status', () => {
      render(<JobCard job={makeJob({ status: 'skipped' })} />)
      expect(screen.getByText('skipped')).toBeInTheDocument()
    })
  })

  describe('salary display', () => {
    it('shows salary range when both min and max are set', () => {
      render(<JobCard job={makeJob({ salary_min: 140000, salary_max: 180000 })} />)
      expect(screen.getByText('$140k – $180k')).toBeInTheDocument()
    })

    it('shows salary_min+ when only min is set', () => {
      render(<JobCard job={makeJob({ salary_min: 120000, salary_max: null })} />)
      expect(screen.getByText('$120k+')).toBeInTheDocument()
    })

    it('shows "Up to" when only max is set', () => {
      render(<JobCard job={makeJob({ salary_min: null, salary_max: 160000 })} />)
      expect(screen.getByText('Up to $160k')).toBeInTheDocument()
    })

    it('shows no salary when both are null', () => {
      render(<JobCard job={makeJob({ salary_min: null, salary_max: null })} />)
      expect(screen.queryByText(/\$/)).not.toBeInTheDocument()
    })
  })

  describe('location and remote', () => {
    it('shows location for in-office roles', () => {
      render(<JobCard job={makeJob({ location: 'New York, NY', remote: false })} />)
      expect(screen.getByText('New York, NY')).toBeInTheDocument()
    })

    it('shows "Remote" for fully remote roles with no location', () => {
      render(<JobCard job={makeJob({ location: null, remote: true })} />)
      expect(screen.getByText('Remote')).toBeInTheDocument()
    })

    it('shows location and "Remote" for hybrid remote roles', () => {
      render(<JobCard job={makeJob({ location: 'Austin, TX', remote: true })} />)
      expect(screen.getByText('Austin, TX · Remote')).toBeInTheDocument()
    })

    it('shows nothing for no location and not remote', () => {
      render(<JobCard job={makeJob({ location: null, remote: false })} />)
      expect(screen.queryByText('Remote')).not.toBeInTheDocument()
    })
  })

  describe('discovery time', () => {
    it('shows "Today" for jobs discovered today', () => {
      render(<JobCard job={makeJob({ discovered_date: new Date().toISOString() })} />)
      expect(screen.getByText('Today')).toBeInTheDocument()
    })

    it('shows "Yesterday" for jobs discovered yesterday', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      render(<JobCard job={makeJob({ discovered_date: yesterday.toISOString() })} />)
      expect(screen.getByText('Yesterday')).toBeInTheDocument()
    })

    it('shows days ago for older jobs', () => {
      const fiveDaysAgo = new Date()
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
      render(<JobCard job={makeJob({ discovered_date: fiveDaysAgo.toISOString() })} />)
      expect(screen.getByText('5d ago')).toBeInTheDocument()
    })
  })
})
