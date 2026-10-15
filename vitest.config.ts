import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    server: {
      deps: {
        external: ['googleapis', 'word-extractor', 'mammoth', 'turndown'],
      },
    },
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
