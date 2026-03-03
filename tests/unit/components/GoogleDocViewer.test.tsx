/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import GoogleDocViewer from '../../../components/GoogleDocViewer'

describe('GoogleDocViewer', () => {
  it('receives a new key when refreshKey changes', () => {
    const { rerender } = render(
      <GoogleDocViewer
        title="Test Doc"
        embedUrl="https://example.com"
        refreshKey={0}
      />
    )

    const iframe = screen.getByTitle('Test Doc')
    // The key is not directly accessible as a DOM attribute,
    // so we'll check for a change in the iframe's identity.

    const initialIframeInstance = iframe

    rerender(
      <GoogleDocViewer
        title="Test Doc"
        embedUrl="https://example.com"
        refreshKey={1}
      />
    )

    const newIframeInstance = screen.getByTitle('Test Doc')

    // A new key should cause React to create a new component instance,
    // so the iframe element itself should be a different object.
    expect(newIframeInstance).not.toBe(initialIframeInstance)
  })

  it('renders iframe with correct src including embedded=true', () => {
    render(
      <GoogleDocViewer
        title="Test Doc"
        embedUrl="https://docs.google.com/document/d/123"
      />
    )
    const iframe = screen.getByTitle('Test Doc')
    expect(iframe).toHaveAttribute(
      'src',
      'https://docs.google.com/document/d/123?embedded=true'
    )
  })

  it('renders nothing if embedUrl is invalid', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = render(
      <GoogleDocViewer title="Test Doc" embedUrl="invalid-url" />
    )
    expect(container).toBeEmptyDOMElement()
    expect(errorSpy).toHaveBeenCalledWith('Invalid URL:', 'invalid-url')
    errorSpy.mockRestore()
  })

  it('renders nothing if embedUrl is empty', () => {
    const { container } = render(
      <GoogleDocViewer title="Test Doc" embedUrl="" />
    )
    expect(container).toBeEmptyDOMElement()
  })
})
