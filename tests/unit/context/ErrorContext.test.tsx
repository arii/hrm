/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ErrorProvider, useError } from '@/context/ErrorContext'

jest.mock('uuid', () => ({
  v4: () => 'test-uuid',
}))

const TestComponent: React.FC = () => {
  const { addError } = useError()
  return (
    <button onClick={() => addError('Test error message')}>Add Error</button>
  )
}

describe('ErrorContext', () => {
  it('should add and display an error message', () => {
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    )

    const button = screen.getByText('Add Error')
    act(() => {
      button.click()
    })

    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })
})
