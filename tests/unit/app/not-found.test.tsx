/** @jest-environment jsdom */
import React from 'react'
import { render, screen } from '@testing-library/react'
import NotFoundPage from '@/app/not-found'

// Mock Next.js Link component for testing
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

describe('NotFoundPage', () => {
  it('renders the 404 headings and a link to the homepage', () => {
    render(<NotFoundPage />)

    // Check for the main "404" heading
    const heading = screen.getByRole('heading', { name: /404/i, level: 1 })
    expect(heading).toBeInTheDocument()

    // Check for the "Page Not Found" subheading
    const subheading = screen.getByRole('heading', {
      name: /page not found/i,
      level: 2,
    })
    expect(subheading).toBeInTheDocument()

    // Check for the descriptive text
    expect(
      screen.getByText(/Sorry, the page you are looking for does not exist./i)
    ).toBeInTheDocument()

    // Check for the link to the homepage
    const homeLink = screen.getByRole('link', { name: /go to homepage/i })
    expect(homeLink).toBeInTheDocument()
    expect(homeLink).toHaveAttribute('href', '/')
  })
})
