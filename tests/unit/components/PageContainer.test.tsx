/**
 * @jest-environment jsdom
 */
// tests/unit/components/PageContainer.test.tsx
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../../../theme/theme'
import PageContainer from '../../../components/PageContainer'
import '@testing-library/jest-dom'

// Mock the BottomNavBar component to isolate the PageContainer's functionality
jest.mock('../../../components/BottomNavBar', () => {
  const MockedBottomNavBar = () => <div data-testid="bottom-nav-bar" />
  MockedBottomNavBar.displayName = 'MockedBottomNavBar'
  return MockedBottomNavBar
})

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
}

describe('PageContainer', () => {
  it('renders children correctly', () => {
    renderWithTheme(
      <PageContainer>
        <div>Test Child</div>
      </PageContainer>
    )
    expect(screen.getByText('Test Child')).toBeInTheDocument()
  })

  it('renders BottomNavBar by default', () => {
    renderWithTheme(
      <PageContainer>
        <div>Test Child</div>
      </PageContainer>
    )
    expect(screen.getByTestId('bottom-nav-bar')).toBeInTheDocument()
  })

  it('does not render BottomNavBar when hasNavBar is false', () => {
    renderWithTheme(
      <PageContainer hasNavBar={false}>
        <div>Test Child</div>
      </PageContainer>
    )
    expect(screen.queryByTestId('bottom-nav-bar')).not.toBeInTheDocument()
  })

  it('applies the maxWidth prop correctly', () => {
    renderWithTheme(
      <PageContainer maxWidth="sm" data-testid="page-container">
        <div>Test Child</div>
      </PageContainer>
    )
    const containerElement = screen.getByTestId('page-container')
    expect(containerElement).toHaveClass('MuiContainer-maxWidthSm')
  })

  it('forwards additional props to the underlying Container', () => {
    const handleClick = jest.fn()
    renderWithTheme(
      <PageContainer
        id="my-container"
        onClick={handleClick}
        data-testid="page-container"
      >
        <div>Test Child</div>
      </PageContainer>
    )

    const containerElement = screen.getByTestId('page-container')
    expect(containerElement).toHaveAttribute('id', 'my-container')

    fireEvent.click(containerElement)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
