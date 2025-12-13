/** @jest-environment jsdom */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import ProgressBar from '@/components/Spotify/ProgressBar'

describe('ProgressBar', () => {
  it('renders the progress bar with the correct times', () => {
    render(
      <ProgressBar progressMs={60000} durationMs={180000} onSeek={() => {}} />
    )
    expect(screen.getByText('1:00')).toBeInTheDocument()
    expect(screen.getByText('3:00')).toBeInTheDocument()
  })

  it('calls onSeek when the slider is changed', () => {
    const onSeek = jest.fn()
    render(
      <ProgressBar progressMs={60000} durationMs={180000} onSeek={onSeek} />
    )
    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '120000' } })
    expect(onSeek).toHaveBeenCalledWith(120000)
  })
})
