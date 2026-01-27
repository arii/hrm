/**
 * @jest-environment jsdom
 */
// tests/unit/components/AuthButton.test.tsx
import { render, screen } from '@testing-library/react'
import AuthButton from '@/components/AuthButton'

describe('AuthButton', () => {
  it('should have the correct aria-label', () => {
    render(<AuthButton providerId="spotify" providerName="Spotify" />);
    const button = screen.getByRole('button', { name: /login with spotify/i });
    expect(button).toHaveAttribute('aria-label', 'Login with Spotify');
  });
});
