'use client'
import { useMemo } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { useHeartRateLiveness } from './useHeartRateLiveness'

export const useFilteredHrmTiles = () => {
  const { hrmData } = useWebSocket()
  const usersWithLiveness = useHeartRateLiveness(hrmData)

  const filteredTiles = useMemo(() => {
    return usersWithLiveness.filter((user) => {
      const isZero = user.value === 0
      const isPlaceholderName = !!user.name && /new user/i.test(user.name)
      const hasNoIdentity = user.name == null

      return !(isZero || isPlaceholderName || hasNoIdentity)
    })
  }, [usersWithLiveness])

  return filteredTiles
}
