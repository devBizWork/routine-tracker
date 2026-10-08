import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'

export interface LiveResult<T> {
  /** undefined until the first answer arrives. */
  value: T | undefined
  /** Set if the database could not be read. */
  error: Error | undefined
}

/**
 * Runs a database query and runs it again whenever the data it read changes, so the
 * screen stays up to date by itself. Also reports a failed read instead of hiding it.
 *
 * Pass a query that does not change between renders (wrap it in useCallback), or it
 * will restart on every render.
 */
export function useLiveQueryResult<T>(query: () => Promise<T>): LiveResult<T> {
  const [result, setResult] = useState<LiveResult<T>>({ value: undefined, error: undefined })

  useEffect(() => {
    const subscription = liveQuery(query).subscribe({
      next: (value) => setResult({ value, error: undefined }),
      error: (error: unknown) => {
        console.error('Database read failed', error)
        setResult({ value: undefined, error: error instanceof Error ? error : new Error(String(error)) })
      },
    })
    return () => subscription.unsubscribe()
  }, [query])

  return result
}

/** Same as useLiveQueryResult, for screens that only need the value. */
export function useLiveQuery<T>(query: () => Promise<T>): T | undefined {
  return useLiveQueryResult(query).value
}
