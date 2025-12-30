/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { LoadingProvider, useLoading } from '@/context/LoadingContext'
import { Button } from '@mui/material'

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

    fireEvent.click(screen.getByText('Start Loading'))

    expect(screen.getByTestId('loading-state')).toHaveTextContent('Loading')

    fireEvent.click(screen.getByText('Stop Loading'))

    expect(screen.getByTestId('loading-state')).toHaveTextContent('Not Loading')
  })
})
