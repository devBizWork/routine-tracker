import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'

/**
 * Runs a database query and runs it again whenever the data it read changes, so the
 * screen stays up to date by itself. Returns undefined until the first answer arrives.
 *
 * Pass a query that does not change between renders (wrap it in useCallback), or it
 * will restart on every render.
 */
export function useLiveQuery<T>(query: () => Promise<T>): T | undefined {
  const [value, setValue] = useState<T>()

  useEffect(() => {
    const subscription = liveQuery(query).subscribe({
      next: setValue,
      error: (error) => console.error('Database read failed', error),
    })
    return () => subscription.unsubscribe()
  }, [query])

  return value
}
