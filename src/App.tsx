import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import PwaUpdatePrompt from "./components/PwaUpdatePrompt";
const Index = lazy(() => import("./pages/Index"));
const Services = lazy(() => import("./pages/Services"));
const About = lazy(() => import("./pages/About"));
const Projects = lazy(() => import("./pages/Projects"));
const Products = lazy(() => import("./pages/Products"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LoginPage = lazy(() => import("./pages/admin/LoginPage"));
const DashboardPage = lazy(() => import("./pages/admin/DashboardPage"));
const ProjectsPage = lazy(() => import("./pages/admin/ProjectsPage"));
const WorkersPage = lazy(() => import("./pages/admin/WorkersPage"));
const WorkLogsPage = lazy(() => import("./pages/admin/WorkLogsPage"));
const FinancesPage = lazy(() => import("./pages/admin/FinancesPage"));
const ProfitLossPage = lazy(() => import("./pages/admin/ProfitLossPage"));
const ContractsPage = lazy(() => import("./pages/admin/ContractsPage"));
const QuotesInvoicesPage = lazy(() => import("./pages/admin/QuotesInvoicesPage"));
const InventoryPage = lazy(() => import("./pages/admin/InventoryPage"));
const ClientsEquipmentPage = lazy(() => import("./pages/admin/ClientsEquipmentPage"));
const WebsiteContentPage = lazy(() => import("./pages/admin/WebsiteContentPage"));
const ReportsPage = lazy(() => import("./pages/admin/ReportsPage"));
const NotificationsPage = lazy(() => import("./pages/admin/NotificationsPage"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage"));
const ProtectedRoute = lazy(() => import("./components/admin/ProtectedRoute"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PwaUpdatePrompt />
      <HashRouter>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Duke ngarkuar...</div>}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/services" element={<Services />} />
            <Route path="/about" element={<About />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/products" element={<Products />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/admin/login" element={<LoginPage />} />
            <Route path="/admin" element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="workers" element={<WorkersPage />} />
                <Route path="work-logs" element={<WorkLogsPage />} />
                <Route path="finances" element={<FinancesPage />} />
                <Route path="profit-loss" element={<ProfitLossPage />} />
                <Route path="contracts" element={<ContractsPage />} />
                <Route path="quotes-invoices" element={<QuotesInvoicesPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="clients-equipment" element={<ClientsEquipmentPage />} />
                <Route path="content" element={<WebsiteContentPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
