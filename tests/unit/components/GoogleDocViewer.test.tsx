/**
 * @jest-environment jsdom
 */
import { render, cleanup } from '@testing-library/react'
import GoogleDocViewer from '../../../components/GoogleDocViewer'
import '@testing-library/jest-dom'

describe('GoogleDocViewer', () => {
  afterEach(cleanup)

  it('injects the DOCS_timing initialization script into the head', () => {
    render(<GoogleDocViewer title="Test Doc" embedUrl="https://example.com" />)

    const script = document.head.querySelector('script')
    expect(script).not.toBeNull()
    expect(script?.innerHTML).toContain(
      'window.DOCS_timing = window.DOCS_timing || {};'
    )
  })
})
