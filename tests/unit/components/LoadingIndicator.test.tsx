/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { LoadingIndicator } from '@/components/LoadingIndicator'
import '@testing-library/jest-dom'

describe('LoadingIndicator', () => {
  it('should render the loading indicator when isLoading is true', () => {
    // Act
    render(<LoadingIndicator isLoading={true} />)

    // Assert
    const progressBar = screen.getByRole('progressbar', { name: /loading/i })
    expect(progressBar).toBeInTheDocument()
  })

  it('should not render the loading indicator when isLoading is false', () => {
    // Act
    render(<LoadingIndicator isLoading={false} />)

    // Assert
    const progressBar = screen.queryByRole('progressbar', {
      name: /loading/i,
    })
    expect(progressBar).toBeNull()
  })
})
