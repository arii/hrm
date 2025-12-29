/**
 * @jest-environment jsdom
 */
// tests/unit/components/PageContainer.test.tsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../../../theme/theme'
import PageContainer from '../../../components/PageContainer'
import '@testing-library/jest-dom'

// Mock the BottomNavBar component to isolate the PageContainer's functionality
jest.mock('../../../components/BottomNavBar', () => () => (
  <div data-testid="bottom-nav-bar" />
))

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
    const { container } = renderWithTheme(
      <PageContainer maxWidth="sm">
        <div>Test Child</div>
      </PageContainer>
    )
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    const containerElement = container.querySelector('.MuiContainer-maxWidthSm')
    expect(containerElement).toBeInTheDocument()
  })
})
