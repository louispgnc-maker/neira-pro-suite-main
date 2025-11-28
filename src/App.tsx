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
import ConfirmEmail from "./pages/ConfirmEmail";
import MentionsLegales from "./pages/MentionsLegales";
import RGPD from "./pages/RGPD";
import CGU from "./pages/CGU";
import NotFound from "./pages/NotFound";
import ScrollToTop from "./components/ScrollToTop";
import EmailConfirmHandler from "./components/EmailConfirmHandler";

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
            <Route path="/confirm-email" element={<ConfirmEmail />} />
            <Route path="/mentions-legales" element={<MentionsLegales />} />
            <Route path="/rgpd" element={<RGPD />} />
            <Route path="/cgu" element={<CGU />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Routes Avocat */}
            <Route path="/avocats/auth" element={<AvocatAuth />} />
            <Route path="/avocats/metier" element={<AvocatMetier />} />
            <Route path="/avocats/dashboard" element={<AvocatDashboard />} />
            <Route path="/avocats/documents" element={<Documents />} />
            <Route path="/avocats/signatures" element={<Signatures />} />
            <Route path="/avocats/clients" element={<Clients />} />
            <Route path="/avocats/clients/create" element={<CreateClientAvocat />} />
            <Route path="/avocats/clients/:id" element={<ClientDetail />} />
            <Route path="/avocats/clients/:id/edit" element={<EditClient />} />
            <Route path="/avocats/tasks" element={<Tasks />} />
            <Route path="/avocats/contrats" element={<Contrats />} />
            <Route path="/avocats/contrats/:id" element={<ContratDetail />} />
            <Route path="/avocats/dossiers" element={<Dossiers />} />
            <Route path="/avocats/dossiers/:id" element={<DossierDetail />} />
            <Route path="/avocats/profile" element={<Profile />} />
            <Route path="/avocats/cabinet" element={<Cabinet />} />
            <Route path="/avocats/espace-collaboratif" element={<EspaceCollaboratif />} />
            <Route path="/avocats/subscription" element={<Subscription />} />
            <Route path="/avocats/contact-support" element={<ContactSupport />} />
            <Route path="/avocats/checkout/:planId" element={<CheckoutPlan />} />
            
            {/* Routes Notaire */}
            <Route path="/notaires/auth" element={<NotaireAuth />} />
            <Route path="/notaires/metier" element={<NotaireMetier />} />
            <Route path="/notaires/dashboard" element={<NotaireDashboard />} />
            <Route path="/notaires/documents" element={<Documents />} />
            <Route path="/notaires/signatures" element={<Signatures />} />
            <Route path="/notaires/clients" element={<Clients />} />
            <Route path="/notaires/clients/create" element={<CreateClientNotaire />} />
            <Route path="/notaires/clients/:id" element={<ClientDetail />} />
            <Route path="/notaires/clients/:id/edit" element={<EditClient />} />
            <Route path="/notaires/tasks" element={<Tasks />} />
            <Route path="/notaires/contrats" element={<Contrats />} />
            <Route path="/notaires/contrats/:id" element={<ContratDetail />} />
            <Route path="/notaires/dossiers" element={<Dossiers />} />
            <Route path="/notaires/dossiers/:id" element={<DossierDetail />} />
            <Route path="/notaires/profile" element={<Profile />} />
            <Route path="/notaires/cabinet" element={<Cabinet />} />
            <Route path="/notaires/espace-collaboratif" element={<EspaceCollaboratif />} />
            <Route path="/notaires/subscription" element={<Subscription />} />
            <Route path="/notaires/contact-support" element={<ContactSupport />} />
            <Route path="/notaires/checkout/:planId" element={<CheckoutPlan />} />
            
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
