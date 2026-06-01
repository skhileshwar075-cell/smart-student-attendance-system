import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@tensorflow/tfjs', replacement: '@tensorflow/tfjs/dist/tf.es2017.js' },
      { find: '@tensorflow/tfjs-backend-webgl', replacement: '@tensorflow/tfjs-backend-webgl/dist/tf-backend-webgl.es2017.js' },
      { find: '@tensorflow-models/blazeface', replacement: '@tensorflow-models/blazeface/dist/blazeface.esm.js' }
    ]
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    include: [
      'firebase/app',
      'firebase/auth',
      'firebase/database',
      'long',
      '@tensorflow/tfjs',
      '@tensorflow/tfjs-backend-webgl',
      '@tensorflow-models/blazeface'
    ],
    exclude: []
  },
  build: {
    rollupOptions: {
      external: []
    }
  }
});
