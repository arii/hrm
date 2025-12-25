// components/TimerDisplay/PhaseBackground.test.tsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import PhaseBackground from './PhaseBackground'

// Mock the framer-motion library
jest.mock('framer-motion', () => ({
  ...jest.requireActual('framer-motion'),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: jest.fn(({ children, ...props }) => <div {...props}>{children}</div>),
  },
}));

describe('PhaseBackground', () => {
  it('renders without crashing for the "prepare" phase', () => {
    const { container } = render(<PhaseBackground phase="prepare" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders without crashing for the "work" phase', () => {
    const { container } = render(<PhaseBackground phase="work" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders without crashing for the "rest" phase', () => {
    const { container } = render(<PhaseBackground phase="rest" />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
