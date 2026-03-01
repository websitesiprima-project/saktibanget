import { useRef, useState, useCallback } from 'react'

/**
 * Prevents double/spam form submissions.
 *
 * Behaviour:
 * - Spam clicks before first call resolves → debounced: only the LAST click
 *   within `debounceMs` ms will actually fire.
 * - Once a call is in-flight → all new calls are silently dropped until
 *   the current one completes (prevents duplicates even when debounce window
 *   has passed).
 *
 * Usage:
 *   const { run, isSubmitting } = useFormGuard()
 *
 *   const handleSubmit = (e) => {
 *     e.preventDefault()
 *     run(async () => {
 *       // async logic here
 *     })
 *   }
 *
 *   <button disabled={isSubmitting}>{isSubmitting ? 'Menyimpan...' : 'Simpan'}</button>
 */
export function useFormGuard(debounceMs = 300) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lockRef = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const run = useCallback(
    (fn: () => Promise<void>) => {
      // If already in-flight, silently drop
      if (lockRef.current) return

      // Cancel any pending debounce (absorb rapid clicks)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }

      timerRef.current = setTimeout(async () => {
        timerRef.current = null

        // Re-check lock after debounce delay
        if (lockRef.current) return

        lockRef.current = true
        setIsSubmitting(true)

        try {
          await fn()
        } finally {
          lockRef.current = false
          setIsSubmitting(false)
        }
      }, debounceMs)
    },
    [debounceMs]
  )

  /** Immediately cancel any pending debounce (e.g. on modal close) */
  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  return { run, isSubmitting, cancel }
}
