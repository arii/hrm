/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'

import { Button } from '@mui/material'
import { act, render, screen } from '@testing-library/react'
import React from 'react'

import { LoadingProvider, useLoading } from '@/context/LoadingContext'

const TestComponent = () => {
  const { isLoading, setIsLoading } = useLoading()
  return (
    <div>
      <span data-testid="loading-state">
        {isLoading ? 'Loading' : 'Not Loading'}
      </span>
      <Button onClick={() => setIsLoading(true)}>Start Loading</Button>
      <Button onClick={() => setIsLoading(false)}>Stop Loading</Button>
    </div>
  )
}

describe('LoadingProvider', () => {
  it('should provide the initial loading state as false', () => {
    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    )
    expect(screen.getByTestId('loading-state')).toHaveTextContent('Not Loading')
  })

  it('should allow consumers to update the loading state', () => {
    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    )

    act(() => {
      screen.getByText('Start Loading').click()
    })

    expect(screen.getByTestId('loading-state')).toHaveTextContent('Loading')

    act(() => {
      screen.getByText('Stop Loading').click()
    })

    expect(screen.getByTestId('loading-state')).toHaveTextContent('Not Loading')
  })
})
