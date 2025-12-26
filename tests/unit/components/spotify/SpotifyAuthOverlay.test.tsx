/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import SpotifyAuthOverlay from '@/components/spotify/SpotifyAuthOverlay'
import '@testing-library/jest-dom'

describe('SpotifyAuthOverlay', () => {
  it('renders the auth button', () => {
    render(<SpotifyAuthOverlay />)
    expect(screen.getByRole('button', { name: /Spotify/i })).toBeInTheDocument()
  })
})
