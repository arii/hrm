/** @jest-environment jsdom */

import GoogleDocViewer from '@/components/GoogleDocViewer'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

describe('GoogleDocViewer', () => {
  it('renders an iframe with the correct title and src', () => {
    const embedUrl =
      'https://docs.google.com/document/d/12345/edit'
    const title = 'Test Document'
    render(<GoogleDocViewer embedUrl={embedUrl} title={title} />)

    const iframe = screen.getByTitle(title)
    expect(iframe).toBeInTheDocument()
    expect(iframe).toHaveAttribute(
      'src',
      'https://docs.google.com/document/d/12345/edit?embedded=true'
    )
  })
})
