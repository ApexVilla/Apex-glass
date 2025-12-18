import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PermissionGuard } from "@/components/rbac/PermissionGuard";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Inventory from "./pages/Inventory";
import ProductConsultation from "./pages/ProductConsultation";
import Sales from "./pages/Sales";
import Financial from "./pages/Financial";
import Invoices from "./pages/Invoices";
import FiscalNotes from "./pages/Fiscal/FiscalNotes";
import FiscalEntryNotes from "./pages/Fiscal/FiscalEntryNotes";
import FiscalNoteCreate from "./pages/Fiscal/FiscalNoteCreate";
import FiscalNoteEdit from "./pages/Fiscal/FiscalNoteEdit";
import EntryNoteCreate from "./pages/Fiscal/EntryNote/EntryNoteCreate";
import XMLImport from "./pages/Fiscal/XMLImport";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Suppliers from "./pages/Suppliers";
import SupplierDetails from "./pages/Suppliers/SupplierDetails";
import FinancialNatures from "./pages/FinancialNatures";
import NFeVerification from "./pages/NFeVerification";
import NotFound from "./pages/NotFound";

import { LoadingProvider } from "@/contexts/LoadingContext";
import { LoadingScreen } from "@/components/ui/loading-screen";

// Criar QueryClient dentro de uma função para evitar problemas com múltiplas instâncias
const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Verificando autenticação..." />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  // Gerenciar timeout de sessão (desconecta após 4 horas de inatividade)
  useSessionTimeout();

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/product-consultation" element={<ProductConsultation />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/financial" element={<Financial />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/fiscal/saida" element={<FiscalNotes />} />
        <Route path="/fiscal/entrada" element={<FiscalEntryNotes />} />
        <Route path="/fiscal" element={<Navigate to="/fiscal/saida" replace />} />
        <Route path="/fiscal/new" element={<FiscalNoteCreate />} />
        <Route path="/fiscal/entry/new" element={<EntryNoteCreate />} />
        <Route path="/fiscal/edit/:id" element={<FiscalNoteEdit />} />
        <Route path="/fiscal/import" element={<XMLImport />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/users" element={
          <PermissionGuard module="users" action="view" fallback={<Navigate to="/dashboard" replace />}>
            <Users />
          </PermissionGuard>
        } />
        <Route path="/settings" element={<Settings />} />
        <Route path="/financial/natures" element={<FinancialNatures />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/suppliers/:id" element={<SupplierDetails />} />
        <Route path="/fiscal/verificacao" element={<NFeVerification />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => {
  // Criar QueryClient dentro do componente para garantir uma única instância
  const [queryClient] = React.useState(() => createQueryClient());

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LoadingProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <AuthProvider>
                <AppRoutes />
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </LoadingProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
