import { vi } from 'vitest'

/** Build a mock Anthropic message response with given text content */
export function mockAnthropicResponse(text: string) {
  return {
    content: [{ type: 'text', text }],
    usage: { input_tokens: 150, output_tokens: 80 },
  }
}

/** Pre-built responses for common operations */
export const MOCK_ANALYSIS_JSON = JSON.stringify({
  match_quality: 'perfect',
  match_confidence: 88,
  match_reasoning: '## Strengths\nStrong match.\n## Concerns\nNone.\n## Overall Assessment\nExcellent fit.',
})

export const MOCK_COVER_LETTER_TEXT = `Dear Hiring Manager,

I am excited to apply for this position. My experience aligns perfectly.

I look forward to discussing this opportunity.

Best regards`

export const MOCK_JOB_EXTRACTION_JSON = JSON.stringify({
  title: 'Senior Product Manager',
  company: 'Acme Corp',
  location: 'San Francisco, CA',
  remote: true,
  description: 'Lead product strategy for our core platform.',
  requirements: '5+ years PM experience.',
  salary_min: 150000,
  salary_max: 200000,
})

export const MOCK_RSS_JOBS_JSON = JSON.stringify([
  {
    title: 'Product Manager',
    company: 'Startup Inc',
    url: 'https://startup.io/jobs/pm-1',
    location: 'Remote',
    remote: true,
    description: 'Lead product development.',
    requirements: '3+ years PM experience.',
    salary_min: 120000,
    salary_max: 160000,
  },
])

/** Creates a mock Anthropic class whose messages.create returns the given text */
export function createAnthropicMock(text: string) {
  const createFn = vi.fn().mockResolvedValue(mockAnthropicResponse(text))
  return {
    MockAnthropic: vi.fn().mockImplementation(() => ({ messages: { create: createFn } })),
    createFn,
  }
}
