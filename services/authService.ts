// services/authService.ts
import { signIn, signOut } from 'next-auth/react';

export const login = () => {
  signIn('spotify', { callbackUrl: '/' });
};

export const logout = () => {
  signOut({ callbackUrl: '/' });
};
