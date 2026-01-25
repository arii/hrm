'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import logger from '@/utils/logger'

/**
 * A client component that handles synchronizing the user's session token with the backend service.
 * It runs on initial authentication and ensures the backend is always equipped with a valid token.
 */
export default function TokenSync() {
  const { data: session, status } = useSession()
  const hasSynced = useRef(false)

  useEffect(() => {
    // Only run the sync logic if the user is authenticated and we haven't synced before.
    if (status === 'authenticated' && !hasSynced.current) {
      hasSynced.current = true // Prevent re-syncs on re-renders

      const syncToken = async () => {
        try {
          const response = await fetch('/api/auth/sync', {
            method: 'POST',
          })

          if (response.ok) {
            logger.info('Successfully synced auth token with backend service.')
          } else {
            const errorBody = await response.text()
            logger.warn({
              message: 'Failed to sync auth token with backend service.',
              status: response.status,
              body: errorBody,
            })
          }
        } catch (error) {
          logger.error(
            { err: error },
            'An unexpected error occurred during token sync.'
          )
        }
      }

      syncToken()
    }
  }, [status, session])

  // This component does not render anything.
  return null
}
