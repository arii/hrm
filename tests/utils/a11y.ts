import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import React from 'react'

expect.extend(toHaveNoViolations)

export const assertNoA11yViolations = async (
  ui: React.ReactElement,
  options?: object
) => {
  const { container } = render(ui, options)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
}
