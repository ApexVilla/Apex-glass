import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { cleanCorruptedData } from "./utils/localStorageHelper";

// Limpar dados corrompidos antes de iniciar a aplicação
try {
  cleanCorruptedData();
} catch (error) {
  console.error('Erro ao limpar dados corrompidos na inicialização:', error);
}

createRoot(document.getElementById("root")!).render(<App />);
