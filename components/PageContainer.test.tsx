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
})
