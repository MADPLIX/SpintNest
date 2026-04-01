import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('jspdf')) return 'vendor-pdf';
          if (
            id.includes('react-markdown') ||
            id.includes('/remark-') ||
            id.includes('micromark') ||
            id.includes('mdast') ||
            id.includes('/unist') ||
            id.includes('hast-util') ||
            id.includes('property-information') ||
            id.includes('space-separated-tokens') ||
            id.includes('comma-separated-tokens')
          ) {
            return 'vendor-markdown';
          }
          if (id.includes('@dnd-kit')) return 'vendor-dnd';
          if (id.includes('date-fns')) return 'vendor-date-fns';
          if (id.includes('driver.js')) return 'vendor-driver';
          if (id.includes('@tauri-apps')) return 'vendor-tauri';
          if (id.includes('zustand')) return 'vendor-state';
          if (id.includes('html2canvas') || id.includes('canvg') || id.includes('dompurify')) {
            return 'vendor-canvas-dom';
          }
          if (id.includes('node_modules/react-dom') || /node_modules\/react\//.test(id)) {
            return 'vendor-react';
          }
        },
      },
    },
  },
})
