// components/TokenSync.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

export default function TokenSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated' && session?.accessToken) {
      fetch('/api/auth/sync', {
        method: 'POST',
      }).catch((error) => {
        console.error('Error syncing token:', error);
      });
    }
  }, [session?.accessToken, status]);

  return null;
}
