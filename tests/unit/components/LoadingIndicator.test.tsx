/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'

import { render, screen } from '@testing-library/react'

import LoadingIndicator from '@/components/LoadingIndicator'
import { useLoading } from '@/context/LoadingContext'

// Mock the useLoading hook
jest.mock('@/context/LoadingContext', () => ({
  useLoading: jest.fn(),
}))

const useLoadingMock = useLoading as jest.Mock

describe('LoadingIndicator', () => {
  it('should not render the progressbar when isLoading is false', () => {
    useLoadingMock.mockReturnValue({ isLoading: false })
    render(<LoadingIndicator />)
    // The component is always in the DOM, but its visibility is toggled.
    // We check that the progressbar role is not in the document.
    expect(screen.queryByRole('progressbar')).toBeNull()
  })

  it('should be visible when isLoading is true', () => {
    useLoadingMock.mockReturnValue({ isLoading: true })
    render(<LoadingIndicator />)
    expect(screen.getByRole('progressbar')).toBeVisible()
  })
})
