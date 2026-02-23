import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth, getDashboardPath } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import ClientDashboard from "./pages/ClientDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import ProductDetail from "./pages/ProductDetail";
import ProductsPage from "./pages/staff/ProductsPage";
import InventoryPage from "./pages/staff/InventoryPage";
import ClientsPage from "./pages/staff/ClientsPage";
import OrdersPage from "./pages/staff/OrdersPage";
import InvoicesPage from "./pages/staff/InvoicesPage";
import ClientOrdersPage from "./pages/client/OrdersPage";
import ClientInvoicesPage from "./pages/client/InvoicesPage";
import StaffReportsPage from "./pages/staff/ReportsPage";
import StaffSettingsPage from "./pages/staff/SettingsPage";
import QuotesPage from "./pages/staff/QuotesPage";
import AccountsPage from "./pages/staff/AccountsPage";
import MaterialsPage from "./pages/staff/production/MaterialsPage";
import RecipesPage from "./pages/staff/production/RecipesPage";
import CalculatorPage from "./pages/staff/production/CalculatorPage";
import ClientReportsPage from "./pages/client/ReportsPage";
import ClientSettingsPage from "./pages/client/SettingsPage";

const queryClient = new QueryClient();

// Auto-redirect from login if already authenticated
const LoginRedirect = () => {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (user && role) return <Navigate to={getDashboardPath(role)} replace />;
  return <LoginPage />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CartProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/login" element={<LoginRedirect />} />
            <Route
              path="/client/dashboard"
              element={
                <ProtectedRoute allowedRoles={["client"]}>
                  <ClientDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/orders"
              element={
                <ProtectedRoute allowedRoles={["client"]}>
                  <ClientOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/invoices"
              element={
                <ProtectedRoute allowedRoles={["client"]}>
                  <ClientInvoicesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/dashboard"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin"]}>
                  <StaffDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/quotes"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin"]}>
                  <QuotesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/products"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin"]}>
                  <ProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/inventory"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin"]}>
                  <InventoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/clients"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin"]}>
                  <ClientsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/orders"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin"]}>
                  <OrdersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/invoices"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin"]}>
                  <InvoicesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/accounts"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin"]}>
                  <AccountsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/reports"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin"]}>
                  <StaffReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/reports"
              element={
                <ProtectedRoute allowedRoles={["client"]}>
                  <ClientReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client/settings"
              element={
                <ProtectedRoute allowedRoles={["client"]}>
                  <ClientSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/production/recipes"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin"]}>
                  <RecipesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/production/materials"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin"]}>
                  <MaterialsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/production/calculator"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin"]}>
                  <CalculatorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/settings"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin"]}>
                  <StaffSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
        </CartProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
