import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Experience Layer tests. Runtime tests run in a pure Node environment (deterministic: clock seam,
// no DOM/network). Living-component render tests opt into jsdom per-file via
// `// @vitest-environment jsdom`. The react plugin enables JSX + the automatic runtime.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    globals: false,
  },
});
