import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import AvocatAuth from "./pages/AvocatAuth";
import NotaireAuth from "./pages/NotaireAuth";
import Contact from "./pages/Contact";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import AvocatDashboard from "./pages/avocats/Dashboard";
import NotaireDashboard from "./pages/notaires/Dashboard";
import AvocatMetier from "./pages/avocats/Metier";
import NotaireMetier from "./pages/notaires/Metier";
import Documents from "./pages/Documents";
import Signatures from "./pages/Signatures";
import Clients from "./pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import EditClient from "@/pages/EditClient";
import CreateClientAvocat from "./pages/CreateClientAvocat";
import CreateClientNotaire from "./pages/CreateClientNotaire";
import Tasks from "./pages/Tasks";
import Contrats from "./pages/Contrats";
import ContratDetail from "./pages/ContratDetail";
import Dossiers from "./pages/Dossiers";
import DossierDetail from "./pages/DossierDetail";
import Profile from "./pages/Profile";
import Cabinet from "./pages/Cabinet";
import EspaceCollaboratif from "./pages/EspaceCollaboratif";
import Subscription from "./pages/Subscription";
import ContactSupport from "./pages/ContactSupport";
import CheckoutPlan from "./pages/CheckoutPlan";
import About from "./pages/About";
import Solution from "./pages/Solution";
import CheckoutEssentiel from "./pages/CheckoutEssentiel";
import CheckoutProfessionnel from "./pages/CheckoutProfessionnel";
import CheckoutCabinetPlus from "./pages/CheckoutCabinetPlus";
import TestSubscription from "./pages/TestSubscription";
import TestPayment from "./pages/test/TestPayment";
import TestThanks from "./pages/test/TestThanks";
import TestLogin from "./pages/test/TestLogin";
import TestCreateCabinet from "./pages/test/TestCreateCabinet";
import ConfirmEmail from "./pages/ConfirmEmail";
import MentionsLegales from "./pages/MentionsLegales";
import RGPD from "./pages/RGPD";
import CGU from "./pages/CGU";
import NotFound from "./pages/NotFound";
import ScrollToTop from "./components/ScrollToTop";
import EmailConfirmHandler from "./components/EmailConfirmHandler";
import RoleProtectedRoute from "./components/RoleProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <EmailConfirmHandler />
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/about" element={<About />} />
            <Route path="/solution" element={<Solution />} />
            <Route path="/checkout/essentiel" element={<CheckoutEssentiel />} />
            <Route path="/checkout/professionnel" element={<CheckoutProfessionnel />} />
            <Route path="/checkout/cabinet-plus" element={<CheckoutCabinetPlus />} />
            <Route path="/test-subscription" element={<TestSubscription />} />
            <Route path="/test-subscription/payment" element={<TestPayment />} />
            <Route path="/test-subscription/thanks" element={<TestThanks />} />
            <Route path="/test-subscription/login" element={<TestLogin />} />
            <Route path="/test-subscription/create-cabinet" element={<TestCreateCabinet />} />
            <Route path="/confirm-email" element={<ConfirmEmail />} />
            <Route path="/mentions-legales" element={<MentionsLegales />} />
            <Route path="/rgpd" element={<RGPD />} />
            <Route path="/cgu" element={<CGU />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Routes Avocat */}
            <Route path="/avocats/auth" element={<AvocatAuth />} />
            <Route path="/avocats/metier" element={<RoleProtectedRoute requiredRole="avocat"><AvocatMetier /></RoleProtectedRoute>} />
            <Route path="/avocats/dashboard" element={<RoleProtectedRoute requiredRole="avocat"><AvocatDashboard /></RoleProtectedRoute>} />
            <Route path="/avocats/documents" element={<RoleProtectedRoute requiredRole="avocat"><Documents /></RoleProtectedRoute>} />
            <Route path="/avocats/signatures" element={<RoleProtectedRoute requiredRole="avocat"><Signatures /></RoleProtectedRoute>} />
            <Route path="/avocats/clients" element={<RoleProtectedRoute requiredRole="avocat"><Clients /></RoleProtectedRoute>} />
            <Route path="/avocats/clients/create" element={<RoleProtectedRoute requiredRole="avocat"><CreateClientAvocat /></RoleProtectedRoute>} />
            <Route path="/avocats/clients/:id" element={<RoleProtectedRoute requiredRole="avocat"><ClientDetail /></RoleProtectedRoute>} />
            <Route path="/avocats/clients/:id/edit" element={<RoleProtectedRoute requiredRole="avocat"><EditClient /></RoleProtectedRoute>} />
            <Route path="/avocats/tasks" element={<RoleProtectedRoute requiredRole="avocat"><Tasks /></RoleProtectedRoute>} />
            <Route path="/avocats/contrats" element={<RoleProtectedRoute requiredRole="avocat"><Contrats /></RoleProtectedRoute>} />
            <Route path="/avocats/contrats/:id" element={<RoleProtectedRoute requiredRole="avocat"><ContratDetail /></RoleProtectedRoute>} />
            <Route path="/avocats/dossiers" element={<RoleProtectedRoute requiredRole="avocat"><Dossiers /></RoleProtectedRoute>} />
            <Route path="/avocats/dossiers/:id" element={<RoleProtectedRoute requiredRole="avocat"><DossierDetail /></RoleProtectedRoute>} />
            <Route path="/avocats/profile" element={<RoleProtectedRoute requiredRole="avocat"><Profile /></RoleProtectedRoute>} />
            <Route path="/avocats/cabinet" element={<RoleProtectedRoute requiredRole="avocat"><Cabinet /></RoleProtectedRoute>} />
            <Route path="/avocats/espace-collaboratif" element={<RoleProtectedRoute requiredRole="avocat"><EspaceCollaboratif /></RoleProtectedRoute>} />
            <Route path="/avocats/subscription" element={<RoleProtectedRoute requiredRole="avocat"><Subscription /></RoleProtectedRoute>} />
            <Route path="/avocats/contact-support" element={<RoleProtectedRoute requiredRole="avocat"><ContactSupport /></RoleProtectedRoute>} />
            <Route path="/avocats/checkout/:planId" element={<RoleProtectedRoute requiredRole="avocat"><CheckoutPlan /></RoleProtectedRoute>} />
            
            {/* Routes Notaire */}
            <Route path="/notaires/auth" element={<NotaireAuth />} />
            <Route path="/notaires/metier" element={<RoleProtectedRoute requiredRole="notaire"><NotaireMetier /></RoleProtectedRoute>} />
            <Route path="/notaires/dashboard" element={<RoleProtectedRoute requiredRole="notaire"><NotaireDashboard /></RoleProtectedRoute>} />
            <Route path="/notaires/documents" element={<RoleProtectedRoute requiredRole="notaire"><Documents /></RoleProtectedRoute>} />
            <Route path="/notaires/signatures" element={<RoleProtectedRoute requiredRole="notaire"><Signatures /></RoleProtectedRoute>} />
            <Route path="/notaires/clients" element={<RoleProtectedRoute requiredRole="notaire"><Clients /></RoleProtectedRoute>} />
            <Route path="/notaires/clients/create" element={<RoleProtectedRoute requiredRole="notaire"><CreateClientNotaire /></RoleProtectedRoute>} />
            <Route path="/notaires/clients/:id" element={<RoleProtectedRoute requiredRole="notaire"><ClientDetail /></RoleProtectedRoute>} />
            <Route path="/notaires/clients/:id/edit" element={<RoleProtectedRoute requiredRole="notaire"><EditClient /></RoleProtectedRoute>} />
            <Route path="/notaires/tasks" element={<RoleProtectedRoute requiredRole="notaire"><Tasks /></RoleProtectedRoute>} />
            <Route path="/notaires/contrats" element={<RoleProtectedRoute requiredRole="notaire"><Contrats /></RoleProtectedRoute>} />
            <Route path="/notaires/contrats/:id" element={<RoleProtectedRoute requiredRole="notaire"><ContratDetail /></RoleProtectedRoute>} />
            <Route path="/notaires/dossiers" element={<RoleProtectedRoute requiredRole="notaire"><Dossiers /></RoleProtectedRoute>} />
            <Route path="/notaires/dossiers/:id" element={<RoleProtectedRoute requiredRole="notaire"><DossierDetail /></RoleProtectedRoute>} />
            <Route path="/notaires/profile" element={<RoleProtectedRoute requiredRole="notaire"><Profile /></RoleProtectedRoute>} />
            <Route path="/notaires/cabinet" element={<RoleProtectedRoute requiredRole="notaire"><Cabinet /></RoleProtectedRoute>} />
            <Route path="/notaires/espace-collaboratif" element={<RoleProtectedRoute requiredRole="notaire"><EspaceCollaboratif /></RoleProtectedRoute>} />
            <Route path="/notaires/subscription" element={<RoleProtectedRoute requiredRole="notaire"><Subscription /></RoleProtectedRoute>} />
            <Route path="/notaires/contact-support" element={<RoleProtectedRoute requiredRole="notaire"><ContactSupport /></RoleProtectedRoute>} />
            <Route path="/notaires/checkout/:planId" element={<RoleProtectedRoute requiredRole="notaire"><CheckoutPlan /></RoleProtectedRoute>} />
            
            {/* Routes génériques (legacy) */}
            <Route path="/documents" element={<Documents />} />
            <Route path="/signatures" element={<Signatures />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientDetail />} />
            <Route path="/clients/:id/edit" element={<EditClient />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/contrats" element={<Contrats />} />
            <Route path="/contrats/:id" element={<ContratDetail />} />
            <Route path="/dossiers" element={<Dossiers />} />
            <Route path="/dossiers/:id" element={<DossierDetail />} />
            <Route path="/profile" element={<Profile />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
