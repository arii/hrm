// components/HrTile.test.tsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import HrTile from './HrTile'

const theme = createTheme()

describe('HrTile', () => {
  it('renders the user name, BPM, and percentage of max heart rate', () => {
    render(
      <ThemeProvider theme={theme}>
        <HrTile name="Ariel" bpm={120} percentMax={65} isConnected={true} />
      </ThemeProvider>
    )

    expect(screen.getByText('Ariel')).toBeInTheDocument()
    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('65%')).toBeInTheDocument()
  })

  it('displays the BPM and "BPM" label', () => {
    render(
      <ThemeProvider theme={theme}>
        <HrTile name="Ariel" bpm={120} percentMax={65} isConnected={true} />
      </ThemeProvider>
    )
    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('BPM')).toBeInTheDocument()
  })

  it('has an accessible name providing a full status summary', () => {
    render(
      <ThemeProvider theme={theme}>
        <HrTile name="Ariel" bpm={120} percentMax={65} isConnected={true} />
      </ThemeProvider>
    )
    const region = screen.getByRole('region')
    expect(region).toHaveAttribute(
      'aria-label',
      "Ariel's heart rate: 120 beats per minute, which is 65% of max."
    )
  })

  it('updates the ARIA label when disconnected', () => {
    render(
      <ThemeProvider theme={theme}>
        <HrTile name="Ariel" bpm={120} percentMax={65} isConnected={false} />
      </ThemeProvider>
    )
    const region = screen.getByRole('region')
    expect(region).toHaveAttribute(
      'aria-label',
      "Ariel's heart rate: Disconnected."
    )
  })

  it('renders correctly when disconnected', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <HrTile name="Ariel" bpm={120} percentMax={65} isConnected={false} />
      </ThemeProvider>
    )

    // Check for lower opacity when disconnected
    expect(container.firstChild).toHaveStyle('opacity: 0.6')
  })
})
