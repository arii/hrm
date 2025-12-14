/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { LoadingIndicator } from '@/components/LoadingIndicator'
import * as LoadingContext from '@/context/LoadingContext'
import '@testing-library/jest-dom'

describe('LoadingIndicator', () => {
  it('should render the loading indicator when isLoading is true', () => {
    // Arrange
    jest.spyOn(LoadingContext, 'useLoading').mockReturnValue({
      isLoading: true,
      setIsLoading: jest.fn(),
    })

    // Act
    render(<LoadingIndicator />)

    // Assert
    const progressBar = screen.getByRole('progressbar', { name: /loading/i })
    expect(progressBar).toBeInTheDocument()
  })

  it('should not render the loading indicator when isLoading is false', () => {
    // Arrange
    jest.spyOn(LoadingContext, 'useLoading').mockReturnValue({
      isLoading: false,
      setIsLoading: jest.fn(),
    })

    // Act
    render(<LoadingIndicator />)

    // Assert
    const progressBar = screen.queryByRole('progressbar', {
      name: /loading/i,
    })
    expect(progressBar).toBeNull()
  })
})
