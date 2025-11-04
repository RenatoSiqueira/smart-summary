import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/shared/__tests__/setup.ts'],
    silent: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/shared/__tests__/',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/*.d.ts',
        '**/*.config.*',
        '.next/',
        'dist/',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/shared': path.resolve(__dirname, './src/shared'),
      '@/app': path.resolve(__dirname, './src/app'),
    },
  },
});
