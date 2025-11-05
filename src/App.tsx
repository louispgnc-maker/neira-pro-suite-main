import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import AvocatDashboard from "./pages/avocats/Dashboard";
import NotaireDashboard from "./pages/notaires/Dashboard";
import Documents from "./pages/Documents";
import Signatures from "./pages/Signatures";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import EditClient from "./pages/EditClient";
import CreateClientAvocat from "./pages/CreateClientAvocat";
import CreateClientNotaire from "./pages/CreateClientNotaire";
import Tasks from "./pages/Tasks";
import Contrats from "./pages/Contrats";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Routes Avocat */}
            <Route path="/avocats/auth" element={<Auth />} />
            <Route path="/avocats/dashboard" element={<AvocatDashboard />} />
            <Route path="/avocats/documents" element={<Documents />} />
            <Route path="/avocats/signatures" element={<Signatures />} />
            <Route path="/avocats/clients" element={<Clients />} />
            <Route path="/avocats/clients/create" element={<CreateClientAvocat />} />
            <Route path="/avocats/clients/:id" element={<ClientDetail />} />
            <Route path="/avocats/clients/:id/edit" element={<EditClient />} />
            <Route path="/avocats/tasks" element={<Tasks />} />
            <Route path="/avocats/contrats" element={<Contrats />} />
            
            {/* Routes Notaire */}
            <Route path="/notaires/auth" element={<Auth />} />
            <Route path="/notaires/dashboard" element={<NotaireDashboard />} />
            <Route path="/notaires/documents" element={<Documents />} />
            <Route path="/notaires/signatures" element={<Signatures />} />
            <Route path="/notaires/clients" element={<Clients />} />
            <Route path="/notaires/clients/create" element={<CreateClientNotaire />} />
            <Route path="/notaires/clients/:id" element={<ClientDetail />} />
            <Route path="/notaires/clients/:id/edit" element={<EditClient />} />
            <Route path="/notaires/tasks" element={<Tasks />} />
            <Route path="/notaires/contrats" element={<Contrats />} />
            
            {/* Routes génériques (legacy) */}
            <Route path="/documents" element={<Documents />} />
            <Route path="/signatures" element={<Signatures />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientDetail />} />
            <Route path="/clients/:id/edit" element={<EditClient />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/contrats" element={<Contrats />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
