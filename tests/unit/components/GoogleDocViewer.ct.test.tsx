import React from 'react'
import { test, expect } from '@playwright/experimental-ct-react'
import GoogleDocViewer from '../../../components/GoogleDocViewer'

test.describe.skip('GoogleDocViewer', () => {
  test('renders with a given embedUrl', async ({ mount }) => {
    const component = await mount(
      <GoogleDocViewer
        title="Test Doc"
        embedUrl="https://docs.google.com/document/d/e/2PACX-1vT-9-g_3-2-1/pub?embedded=true"
      />
    )
    await expect(component).toHaveAttribute('title', 'Test Doc')
  })
})
