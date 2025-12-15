/**
 * @jest-environment jsdom
 */
import { render } from '@testing-library/react'
import UserGreetingDisplay from '@/components/UserGreetingDisplay'

describe('UserGreetingDisplay', () => {
  it('renders correctly for a logged-out user', () => {
    const { container } = render(<UserGreetingDisplay user={null} />)
    expect(container).toMatchSnapshot()
  })

  it('renders correctly for a logged-in user', () => {
    const user = {
      name: 'Test User',
    }
    const { container } = render(<UserGreetingDisplay user={user} />)
    expect(container).toMatchSnapshot()
  })
})
