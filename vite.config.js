import { defineConfig } from 'vite';

export default defineConfig({
  base: '/miku-jaja-risa-/',
  build: {
    rollupOptions: {
      input: 'index.template.html',
    },
  },
});
