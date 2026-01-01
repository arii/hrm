import { render, screen } from '@testing-library/react'
import PageContainer from './PageContainer'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../theme/theme'

describe('PageContainer', () => {
  it('renders children and applies default styles', () => {
    render(
      <ThemeProvider theme={theme}>
        <PageContainer>
          <div>Test Child</div>
        </PageContainer>
      </ThemeProvider>
    )

    const childElement = screen.getByText('Test Child')
    expect(childElement).toBeInTheDocument()

    const containerElement = childElement.parentElement
    expect(containerElement).toHaveStyle('min-height: 100vh')
    expect(containerElement).toHaveStyle('background-color: rgb(17, 24, 39)')
  })

  it('applies the maxWidth prop', () => {
    render(
      <ThemeProvider theme={theme}>
        <PageContainer maxWidth="sm">
          <div>Test Child</div>
        </PageContainer>
      </ThemeProvider>
    )

    const containerElement = screen.getByText('Test Child').parentElement
    expect(containerElement).toHaveClass('MuiContainer-maxWidthSm')
  })

  it('overrides default padding with px and py props', () => {
    render(
      <ThemeProvider theme={theme}>
        <PageContainer px={1} py={2}>
          <div>Test Child</div>
        </PageContainer>
      </ThemeProvider>
    )

    const containerElement = screen.getByText('Test Child').parentElement
    expect(containerElement).toHaveStyle('padding-left: 8px')
    expect(containerElement).toHaveStyle('padding-right: 8px')
    expect(containerElement).toHaveStyle('padding-top: 16px')
    expect(containerElement).toHaveStyle('padding-bottom: 16px')
  })

  it('prioritizes px and py props over sx', () => {
    render(
      <ThemeProvider theme={theme}>
        <PageContainer px={4} py={4} sx={{ px: 2, py: 2 }}>
          <div>Test Child</div>
        </PageContainer>
      </ThemeProvider>
    )

    const containerElement = screen.getByText('Test Child').parentElement
    expect(containerElement).toHaveStyle('padding-left: 32px')
    expect(containerElement).toHaveStyle('padding-right: 32px')
    expect(containerElement).toHaveStyle('padding-top: 32px')
    expect(containerElement).toHaveStyle('padding-bottom: 32px')
  })
})
