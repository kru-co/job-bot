import { vi } from 'vitest'

/**
 * Creates a chainable Supabase query builder mock.
 * Every chainable method (.select, .eq, .is, etc.) returns the same chain object.
 * Terminal methods (.single, .maybeSingle) return the resolved result.
 * The chain is also thenable so `await chain` works (for .update().eq() patterns).
 */
export function createChain(result: unknown = { data: null, error: null, count: null }): Record<string, unknown> {
  const chain: Record<string, unknown> = {}

  for (const method of [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'is', 'not', 'in', 'or', 'ilike', 'order', 'limit',
  ]) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }

  // Terminal promise-returning methods
  chain.single = vi.fn().mockResolvedValue(result)
  chain.maybeSingle = vi.fn().mockResolvedValue(result)

  // Make the chain itself awaitable (for patterns like `await sb.from().update().eq()`)
  ;(chain as { then: unknown }).then = (
    resolve: (v: unknown) => unknown,
    reject?: (e: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject)
  ;(chain as { catch: unknown }).catch = (reject: (e: unknown) => unknown) =>
    Promise.resolve(result).catch(reject)
  ;(chain as { finally: unknown }).finally = (fn: () => void) =>
    Promise.resolve(result).finally(fn)

  return chain
}

/**
 * Creates a `from()` spy that returns a fresh chain for each call,
 * cycling through `results` in order, falling back to `defaultResult`.
 */
export function createMockFrom(
  results: unknown[],
  defaultResult: unknown = { data: null, error: null, count: null },
) {
  let i = 0
  return vi.fn(() => {
    const result = i < results.length ? results[i] : defaultResult
    i++
    return createChain(result)
  })
}

/**
 * Creates a complete Supabase client mock with a sequenced `from()`.
 */
export function createMockSupabase(
  results: unknown[],
  defaultResult: unknown = { data: null, error: null, count: null },
) {
  const mockFrom = createMockFrom(results, defaultResult)
  return { from: mockFrom }
}
