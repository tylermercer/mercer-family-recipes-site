import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@styles': new URL('./src/styles', import.meta.url).pathname,
      '@components': new URL('./src/components', import.meta.url).pathname,
      '@assets': new URL('./src/assets', import.meta.url).pathname,
      '@layouts': new URL('./src/layouts', import.meta.url).pathname,
      '@utils': new URL('./src/utils', import.meta.url).pathname,
    },
  },
});
