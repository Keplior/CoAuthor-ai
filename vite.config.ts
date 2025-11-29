import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Use '.' to refer to the current directory instead of process.cwd() to avoid type issues
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      // This polyfills process.env.API_KEY for the browser
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    // Ensure public assets like sw.js are served correctly
    publicDir: 'public',
  };
});