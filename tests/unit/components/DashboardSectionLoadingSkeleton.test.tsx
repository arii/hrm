/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render } from '@testing-library/react'
import DashboardSectionLoadingSkeleton from '../../../components/DashboardSectionLoadingSkeleton'

describe('DashboardSectionLoadingSkeleton', () => {
  it('renders with default props and matches snapshot', () => {
    const { asFragment } = render(<DashboardSectionLoadingSkeleton />)
    expect(asFragment()).toMatchSnapshot()
  })

  it('renders with a custom height and matches snapshot', () => {
    const { asFragment } = render(<DashboardSectionLoadingSkeleton height="200px" />)
    expect(asFragment()).toMatchSnapshot()
  })
})
