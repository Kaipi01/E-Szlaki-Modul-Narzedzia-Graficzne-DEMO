import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        'compressor-panel': resolve(__dirname, 'js/compressor-panel/main.js'),
        'converter-panel' : resolve(__dirname, 'js/converter-panel/main.js'),
        'editor-panel'    : resolve(__dirname, 'js/editor-panel/main.js'),
        'main-panel'      : resolve(__dirname, 'js/main-panel/main.js'),
      },
      output: {
        // opcjonalnie: ścieżka wyjściowa, nazwa pliku oparta na kluczu input
        dir: 'dist',
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
  }
})
