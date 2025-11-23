// File: app/client/control/components/useButtonFeedback.ts
'use client'
import { useState, useCallback } from 'react'

type ButtonId = 'start' | 'stop' | 'pause' | 'next' | 'previous'

export const useButtonFeedback = () => {
  const [feedback, setFeedback] = useState<Record<ButtonId, boolean>>({
    start: false,
    stop: false,
    pause: false,
    next: false,
    previous: false,
  })

  const handleButtonClick = useCallback(
    (buttonId: ButtonId, action: () => void) => {
      setFeedback((prev) => ({ ...prev, [buttonId]: true }))
      action()
      setTimeout(
        () => setFeedback((prev) => ({ ...prev, [buttonId]: false })),
        500
      )
    },
    []
  )

  return { feedback, handleButtonClick }
}
