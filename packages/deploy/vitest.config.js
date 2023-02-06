import { defineConfig } from 'vite';
import vitePluginString from 'vite-plugin-string';

export default defineConfig({
  plugins: [
    vitePluginString({
      include: ['**/*.hbs'],
      compress: false,
    }),
  ],
});
