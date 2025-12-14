'use client'

import { useEffect } from 'react'

export default function TestErrorPage() {
  useEffect(() => {
    throw new Error('This is a test error to trigger the Error Boundary.')
  }, [])

  return <div>This page should not be visible.</div>
}
