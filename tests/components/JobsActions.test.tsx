import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { AnalyseAllButton, DiscoverButton } from '@/components/JobsActions'

// next/navigation is mocked globally in setup.ts (useRouter → refresh fn)
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn(), replace: vi.fn() }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

// ── AnalyseAllButton ──────────────────────────────────────────────────────────
describe('AnalyseAllButton', () => {
  describe('rendering', () => {
    it('shows unanalyzed count in label when count > 0', () => {
      render(<AnalyseAllButton unanalyzed={5} />)
      expect(screen.getByText('Analyse All (5)')).toBeInTheDocument()
    })

    it('shows "All Analysed" when count is 0', () => {
      render(<AnalyseAllButton unanalyzed={0} />)
      expect(screen.getByText('All Analysed')).toBeInTheDocument()
    })

    it('is disabled when unanalyzed count is 0', () => {
      render(<AnalyseAllButton unanalyzed={0} />)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('is enabled when there are unanalyzed jobs', () => {
      render(<AnalyseAllButton unanalyzed={3} />)
      expect(screen.getByRole('button')).not.toBeDisabled()
    })

    it('shows tooltip with count on hover', () => {
      render(<AnalyseAllButton unanalyzed={3} />)
      expect(screen.getByRole('button')).toHaveAttribute('title', '3 unanalysed jobs')
    })

    it('shows "All jobs analysed" tooltip when count is 0', () => {
      render(<AnalyseAllButton unanalyzed={0} />)
      expect(screen.getByRole('button')).toHaveAttribute('title', 'All jobs analysed')
    })
  })

  describe('click behaviour', () => {
    it('does nothing when clicked and unanalyzed is 0', async () => {
      vi.stubGlobal('fetch', vi.fn())
      render(<AnalyseAllButton unanalyzed={0} />)
      await userEvent.click(screen.getByRole('button'))
      expect(fetch).not.toHaveBeenCalled()
    })

    it('calls POST /api/jobs/analyze-all when clicked', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ analyzed: 5, remaining: 0, total_cost: 0.025, results: [] }),
      }))
      render(<AnalyseAllButton unanalyzed={5} />)
      await userEvent.click(screen.getByRole('button'))
      expect(fetch).toHaveBeenCalledWith('/api/jobs/analyze-all', { method: 'POST' })
    })

    it('shows success toast with analyzed count and cost', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ analyzed: 3, remaining: 0, total_cost: 0.015, results: [] }),
      }))
      render(<AnalyseAllButton unanalyzed={3} />)
      await userEvent.click(screen.getByRole('button'))
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('3 jobs')
        )
      })
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('$0.015'))
      })
    })

    it('shows "all done!" when remaining is 0', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ analyzed: 2, remaining: 0, total_cost: 0.01, results: [] }),
      }))
      render(<AnalyseAllButton unanalyzed={2} />)
      await userEvent.click(screen.getByRole('button'))
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('all done!'))
      })
    })

    it('shows remaining count when jobs are left', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ analyzed: 10, remaining: 5, total_cost: 0.05, results: [] }),
      }))
      render(<AnalyseAllButton unanalyzed={15} />)
      await userEvent.click(screen.getByRole('button'))
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('5 remaining'))
      })
    })

    it('shows info toast when analyzed is 0', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ analyzed: 0, remaining: 0, total_cost: 0, results: [] }),
      }))
      render(<AnalyseAllButton unanalyzed={3} />)
      await userEvent.click(screen.getByRole('button'))
      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('already analysed'))
      })
    })

    it('shows error toast on network failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
      render(<AnalyseAllButton unanalyzed={3} />)
      await userEvent.click(screen.getByRole('button'))
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled()
      })
    })

    it('shows error toast on non-OK response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' }),
      }))
      render(<AnalyseAllButton unanalyzed={3} />)
      await userEvent.click(screen.getByRole('button'))
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Server error')
      })
    })

    it('calls router.refresh() after successful analysis', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ analyzed: 2, remaining: 0, total_cost: 0.01, results: [] }),
      }))
      render(<AnalyseAllButton unanalyzed={2} />)
      await userEvent.click(screen.getByRole('button'))
      await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
    })
  })
})

// ── DiscoverButton ────────────────────────────────────────────────────────────
describe('DiscoverButton', () => {
  describe('rendering', () => {
    it('renders with label "Discover"', () => {
      render(<DiscoverButton />)
      expect(screen.getByText('Discover')).toBeInTheDocument()
    })

    it('is enabled by default', () => {
      render(<DiscoverButton />)
      expect(screen.getByRole('button')).not.toBeDisabled()
    })
  })

  describe('click behaviour', () => {
    it('calls POST /api/jobs/discover', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ new_jobs: 3, feeds_processed: 2, duplicates_skipped: 1 }),
      }))
      render(<DiscoverButton />)
      await userEvent.click(screen.getByRole('button'))
      expect(fetch).toHaveBeenCalledWith('/api/jobs/discover', { method: 'POST' })
    })

    it('shows success toast when new jobs are found', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ new_jobs: 4, feeds_processed: 1, duplicates_skipped: 0 }),
      }))
      render(<DiscoverButton />)
      await userEvent.click(screen.getByRole('button'))
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('4 new jobs'))
      })
    })

    it('shows info toast when no new jobs are found', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ new_jobs: 0, feeds_processed: 2, duplicates_skipped: 5 }),
      }))
      render(<DiscoverButton />)
      await userEvent.click(screen.getByRole('button'))
      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('No new jobs'))
      })
    })

    it('shows error toast on API error response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'No RSS feed URLs configured' }),
      }))
      render(<DiscoverButton />)
      await userEvent.click(screen.getByRole('button'))
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('No RSS feed URLs configured')
      })
    })

    it('shows generic error toast on network failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
      render(<DiscoverButton />)
      await userEvent.click(screen.getByRole('button'))
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('offline')
      })
    })

    it('calls router.refresh() after successful discovery', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ new_jobs: 1, feeds_processed: 1, duplicates_skipped: 0 }),
      }))
      render(<DiscoverButton />)
      await userEvent.click(screen.getByRole('button'))
      await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
    })
  })
})
