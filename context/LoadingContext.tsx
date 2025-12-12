'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface LoadingContextType {
  isLoading: boolean
  startLoading: () => void
  stopLoading: () => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export const LoadingProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [loadingCount, setLoadingCount] = useState(0)

  const startLoading = () => setLoadingCount((count) => count + 1)
  const stopLoading = () =>
    setLoadingCount((count) => Math.max(0, count - 1))

  const isLoading = loadingCount > 0

  return (
    <LoadingContext.Provider value={{ isLoading, startLoading, stopLoading }}>
      {children}
    </LoadingContext.Provider>
  )
}

export const useLoading = () => {
  const context = useContext(LoadingContext)
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider')
  }
  return context
}
