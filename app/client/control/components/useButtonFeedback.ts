'use client'
import { useCallback, useState } from 'react'

export const useButtonFeedback = () => {
  const [activeButtons, setActiveButtons] = useState<Record<string, boolean>>({})

  const triggerFeedback = useCallback((buttonId: string, timeout = 500) => {
    setActiveButtons((prev) => ({ ...prev, [buttonId]: true }))

    setTimeout(() => {
      setActiveButtons((prev) => ({ ...prev, [buttonId]: false }))
    }, timeout)
  }, [])

  const isButtonLoading = useCallback(
    (buttonId: string) => !!activeButtons[buttonId],
    [activeButtons]
  )

  return { isButtonLoading, triggerFeedback }
}
