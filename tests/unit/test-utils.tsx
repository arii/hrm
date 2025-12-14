
import React from 'react';
import { render } from '@testing-library/react';
import { ToastProvider } from '@/context/ToastContext';
import { WebSocketProvider } from '@/context/WebSocketContext';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@mui/material/styles';
import theme from '@/lib/theme';

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <SessionProvider>
      <WebSocketProvider>
        <ToastProvider>
          <ThemeProvider theme={theme}>{children}</ThemeProvider>
        </ToastProvider>
      </WebSocketProvider>
    </SessionProvider>
  );
};

const customRender = (ui: React.ReactElement, options?: any) =>
  render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
