import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '127.0.0.1', // bind dev server to 127.0.0.1
    port: 5173,        // ensure port matches your redirect URI
  },
});