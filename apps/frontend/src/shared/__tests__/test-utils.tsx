import React from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';

/**
 * Custom render function that wraps components with necessary providers
 * Use this instead of the default render from @testing-library/react
 */
function AllTheProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from @testing-library/react
export * from '@testing-library/react';

// Override render method
export { customRender as render };

