import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  
  build: {
    // Aumenta o limite de aviso para 1MB
    chunkSizeWarningLimit: 1000,
    
    // Otimização de chunking manual
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar React e bibliotecas relacionadas
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // Separar Firebase (maior bundle do projeto)
          'firebase-vendor': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage'
          ],
        }
      }
    },
    
    // Minificação avançada com Terser
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove console.log em produção
        drop_console: true,
        drop_debugger: true,
        // Remove código morto
        dead_code: true,
        // Otimizações adicionais
        passes: 2
      },
      format: {
        // Remove comentários
        comments: false
      }
    },
    
    // Source maps apenas se necessário
    sourcemap: false,
    
    // Target para navegadores modernos
    target: 'es2020'
  },
  
  // Pre-bundling de dependências
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom'
    ]
  }
});
