import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "0.0.0.0", // Permite acesso via IP e localhost
    port: 8081,
    strictPort: false, // Tenta a porta especificada, se ocupada usa outra
    open: false, // Não abre automaticamente no navegador
    hmr: {
      overlay: true,
      clientPort: 8081,
    },
    watch: {
      usePolling: false,
      ignored: ['**/node_modules/**', '**/dist/**'],
    },
  },
  plugins: [
    react({
      fastRefresh: true,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: [],
  },
});
