import { useState, useEffect } from 'react'

const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now()
  const seconds = Math.floor((now - timestamp) / 1000)

  if (seconds < 5) {
    return 'just now'
  }
  if (seconds < 60) {
    return `${seconds} seconds ago`
  }
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  }
  const days = Math.floor(seconds / 86400)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

export const useTimeAgo = (timestamp?: number) => {
  const [timeAgo, setTimeAgo] = useState(() =>
    timestamp ? formatTimeAgo(timestamp) : ''
  )

  useEffect(() => {
    if (!timestamp) return

    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(timestamp))
    }, 1000)

    return () => clearInterval(interval)
  }, [timestamp])

  return timeAgo
}
