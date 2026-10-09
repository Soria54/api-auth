import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    env: { NODE_ENV: 'test' },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'app.js',
        'config/**',
        'controllers/**',
        'middlewares/**',
        'models/**',
        'routes/**',
        'security/**',
        'services/**',
        'utils/**',
        'validators/**',
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
