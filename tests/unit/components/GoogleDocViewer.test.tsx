import { render, screen, fireEvent } from '@testing-library/react'
import GoogleDocViewer from '../../../components/GoogleDocViewer'

describe('GoogleDocViewer', () => {
  it('renders the iframe with the correct title and URL', () => {
    render(
      <GoogleDocViewer
        title="Test Document"
        embedUrl="https://docs.google.com/document/d/test/pub"
      />
    )
    const iframe = screen.getByTitle('Test Document')
    expect(iframe).toBeInTheDocument()
    expect(iframe).toHaveAttribute(
      'src',
      'https://docs.google.com/document/d/test/pub?embedded=true'
    )
  })

  it('updates the iframe src with a timestamp when the refresh button is clicked', () => {
    render(
      <GoogleDocViewer
        title="Test Document"
        embedUrl="https://docs.google.com/document/d/test/pub"
      />
    )
    const refreshButton = screen.getByLabelText('Refresh document')
    fireEvent.click(refreshButton)
    const iframe = screen.getByTitle('Test Document')
    expect(iframe).toHaveAttribute(
      'src',
      expect.stringContaining('timestamp=')
    )
  })

  it('shows the loading skeleton when the refresh button is clicked', () => {
    render(
      <GoogleDocViewer
        title="Test Document"
        embedUrl="https://docs.google.com/document/d/test/pub"
      />
    )
    const refreshButton = screen.getByLabelText('Refresh document')
    fireEvent.click(refreshButton)
    const skeleton = screen.getByRole('progressbar')
    expect(skeleton).toBeInTheDocument()
  })
})
