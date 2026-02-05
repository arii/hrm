'use client'
import { useMemo } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { useHeartRateLiveness } from './useHeartRateLiveness'

/**
 * A hook that provides a filtered list of HRM users, excluding:
 * - Users with no data (value === 0)
 * - Users with placeholder names (e.g., "new user")
 * - Users with no identity (name is null)
 * - Users whose data has expired (> 35s inactivity)
 */
export const useFilteredHrmTiles = () => {
  const { hrmData } = useWebSocket()
  const usersWithLiveness = useHeartRateLiveness(hrmData)

  const filteredTiles = useMemo(() => {
    return usersWithLiveness.filter((user) => {
      const isZero = user.value === 0
      const isPlaceholderName = !!user.name && /new user/i.test(user.name)
      const hasNoIdentity = user.name == null
      return !(isZero || isPlaceholderName || hasNoIdentity || user.isExpired)
    })
  }, [usersWithLiveness])

  return filteredTiles
}
