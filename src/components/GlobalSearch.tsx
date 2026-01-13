import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchItem {
  title: string;
  path: string;
  keywords: string[];
  category: string;
  section?: string; // Sous-section de la page
}

const searchIndex: SearchItem[] = [
  // Dashboard
  { title: "Dashboard", path: "/dashboard", keywords: ["accueil", "tableau de bord", "home", "statistiques"], category: "Navigation" },
  
  // Documents & Contrats
  { title: "Documents", path: "/documents", keywords: ["fichiers", "documents", "pdfs", "télécharger", "upload"], category: "Gestion" },
  { title: "Documents - Upload", path: "/documents", section: "Upload de fichiers", keywords: ["ajouter document", "importer fichier", "téléverser"], category: "Gestion" },
  { title: "Contrats", path: "/contrats", keywords: ["contrats", "accords", "conventions", "modèles"], category: "Gestion" },
  { title: "Contrats - Nouveau", path: "/contrats", section: "Créer un contrat", keywords: ["nouveau contrat", "créer contrat", "modèle contrat"], category: "Gestion" },
  { title: "Signatures", path: "/signatures", keywords: ["signatures", "signer", "signature électronique", "paraphes"], category: "Gestion" },
  { title: "Signatures - Crédits", path: "/signatures", section: "Acheter des crédits", keywords: ["acheter signatures", "crédits signature", "paiement signature"], category: "Gestion" },
  { title: "Dossiers", path: "/dossiers", keywords: ["dossiers", "affaires", "cas", "projets"], category: "Gestion" },
  
  // Clients
  { title: "Clients", path: "/clients", keywords: ["clients", "contacts", "personnes", "liste clients"], category: "Gestion" },
  { title: "Nouveau Client", path: "/clients/nouveau", keywords: ["créer client", "ajouter client", "nouveau contact"], category: "Actions" },
  { title: "Clients - Recherche", path: "/clients", section: "Rechercher un client", keywords: ["chercher client", "trouver client", "filtrer clients"], category: "Gestion" },
  
  // Cabinet
  { title: "Cabinet", path: "/cabinet", keywords: ["cabinet", "équipe", "collaborateurs", "membres", "gestion cabinet"], category: "Gestion" },
  { title: "Cabinet - Membres", path: "/cabinet", section: "Gestion des membres", keywords: ["ajouter membre", "inviter collaborateur", "équipe", "utilisateurs"], category: "Gestion" },
  { title: "Cabinet - Paramètres", path: "/cabinet", section: "Paramètres du cabinet", keywords: ["configuration cabinet", "réglages cabinet"], category: "Gestion" },
  { title: "Espace Collaboratif", path: "/espace-collaboratif", keywords: ["collaboration", "partage", "équipe", "documents partagés"], category: "Gestion" },
  
  // Statistiques & Rapports
  { title: "Statistiques", path: "/statistiques", keywords: ["stats", "rapports", "analyses", "graphiques", "métriques", "kpi"], category: "Analyse" },
  { title: "Statistiques - Revenus", path: "/statistiques", section: "Revenus", keywords: ["chiffre affaires", "revenus", "facturation", "finance"], category: "Analyse" },
  { title: "Statistiques - Clients", path: "/statistiques", section: "Clients", keywords: ["nombre clients", "clients actifs", "nouveaux clients"], category: "Analyse" },
  { title: "Tâches", path: "/tasks", keywords: ["tâches", "to-do", "agenda", "calendrier", "planning"], category: "Organisation" },
  
  // Communication
  { title: "Intégration Email", path: "/email-integration", keywords: ["email", "gmail", "messagerie", "courrier", "synchronisation"], category: "Communication" },
  { title: "Email - Configuration", path: "/email-integration", section: "Configuration Gmail", keywords: ["configurer email", "connecter gmail", "oauth"], category: "Communication" },
  { title: "Boîte de réception", path: "/email-inbox", keywords: ["inbox", "messages", "emails reçus", "courrier entrant"], category: "Communication" },
  
  // Paramètres & Profil
  { title: "Mon Profil", path: "/profile", keywords: ["profil", "compte", "paramètres personnels", "informations personnelles"], category: "Paramètres" },
  { title: "Profil - Informations", path: "/profile", section: "Informations personnelles", keywords: ["nom", "prénom", "email", "téléphone", "coordonnées"], category: "Paramètres" },
  { title: "Profil - Facturation", path: "/profile", section: "Informations de facturation", keywords: ["facturation", "adresse facturation", "siret", "tva"], category: "Paramètres" },
  { title: "Profil - Sécurité", path: "/profile", section: "Sécurité", keywords: ["mot de passe", "sécurité", "authentification", "changer password"], category: "Paramètres" },
  { title: "Abonnement", path: "/subscription", keywords: ["abonnement", "plan", "facturation", "paiement", "premium", "tarif"], category: "Paramètres" },
  { title: "Abonnement - Plans", path: "/subscription", section: "Changer de plan", keywords: ["changer plan", "upgrade", "downgrade", "essai gratuit"], category: "Paramètres" },
  { title: "Abonnement - Paiement", path: "/subscription", section: "Méthode de paiement", keywords: ["carte bancaire", "paiement", "facturation", "moyen paiement"], category: "Paramètres" },
  
  // Support
  { title: "Support", path: "/contact-support", keywords: ["aide", "support", "contact", "assistance", "question"], category: "Support" },
];

interface GlobalSearchProps {
  userRole?: "avocat" | "notaire";
  hideButton?: boolean;
}

export function GlobalSearch({ userRole = "avocat", hideButton = false }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showButton, setShowButton] = useState(false);

  // Afficher le bouton uniquement sur le dashboard
  useEffect(() => {
    setShowButton(location.pathname.includes('/dashboard'));
  }, [location.pathname]);

  // Fermer lors du changement de route
  useEffect(() => {
    setIsOpen(false);
    setQuery("");
  }, [location.pathname]);

  // Gérer Cmd+K / Ctrl+K pour ouvrir
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      // Échap ne ferme plus la barre de recherche - uniquement via croix ou clic extérieur
    };

    // Utiliser capture: true pour intercepter l'événement avant le plein écran
    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isOpen]);

  // Focus l'input quand ouvert et bloquer le scroll
  useEffect(() => {
    if (isOpen) {
      if (inputRef.current) {
        inputRef.current.focus();
      }
      // Sauvegarder la position de scroll actuelle
      const scrollY = window.scrollY;
      // Bloquer le scroll du body
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      // Restaurer le scroll
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      // Restaurer la position de scroll
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }

    // Cleanup: toujours restaurer le scroll
    return () => {
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY) * -1);
      }
    };
  }, [isOpen]);

  // Fermer si clic en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Filtrer les résultats
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const searchQuery = query.toLowerCase();
    const filtered = searchIndex.filter(item => {
      const titleMatch = item.title.toLowerCase().includes(searchQuery);
      const sectionMatch = item.section?.toLowerCase().includes(searchQuery);
      // Ne chercher dans les keywords que si pas de match dans title/section
      const keywordMatch = item.keywords.some(keyword => 
        keyword.toLowerCase().includes(searchQuery)
      );
      
      // Priorité : afficher seulement si le mot est dans le titre ou la section
      // Les keywords servent juste à élargir la recherche
      return titleMatch || sectionMatch || keywordMatch;
    });

    // Trier pour mettre les correspondances visibles en premier
    const sorted = filtered.sort((a, b) => {
      const aVisibleMatch = a.title.toLowerCase().includes(searchQuery) || 
                           a.section?.toLowerCase().includes(searchQuery);
      const bVisibleMatch = b.title.toLowerCase().includes(searchQuery) || 
                           b.section?.toLowerCase().includes(searchQuery);
      
      // Prioriser les matchs visibles
      if (aVisibleMatch && !bVisibleMatch) return -1;
      if (!aVisibleMatch && bVisibleMatch) return 1;
      
      // Puis les matchs exacts
      const aExactTitle = a.title.toLowerCase() === searchQuery;
      const bExactTitle = b.title.toLowerCase() === searchQuery;
      const aExactSection = a.section?.toLowerCase() === searchQuery;
      const bExactSection = b.section?.toLowerCase() === searchQuery;
      
      if (aExactTitle && !bExactTitle) return -1;
      if (!aExactTitle && bExactTitle) return 1;
      if (aExactSection && !bExactSection) return -1;
      if (!aExactSection && bExactSection) return 1;
      
      return 0;
    });

    setResults(sorted.slice(0, 10)); // Limiter à 10 résultats
    setSelectedIndex(0);
  }, [query]);

  // Navigation au clavier
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && results.length > 0) {
      e.preventDefault();
      handleNavigate(results[selectedIndex]);
    }
  };

  const handleNavigate = (item: SearchItem) => {
    const basePath = userRole === "avocat" ? "/avocats" : "/notaires";
    const fullPath = `${basePath}${item.path}`;
    navigate(fullPath);
    setIsOpen(false);
    setQuery("");
  };

  // Si hideButton=true, ne jamais afficher le bouton
  // Sinon, afficher le bouton seulement sur le dashboard
  if (!isOpen && (hideButton || !showButton)) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full max-w-md flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all"
      >
        <Search className="h-4 w-4 text-gray-400" />
        <span className="text-gray-500">Rechercher...</span>
        <kbd className="ml-auto px-2 py-0.5 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-300 rounded">
          ⌘K
        </kbd>
      </button>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-start justify-center pt-[20vh] overflow-hidden">
      <div
        ref={containerRef}
        className="w-full max-w-2xl mx-4 bg-white rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Input de recherche */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            ref={inputRef}
            type="search"
            name="global-search-query"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher une page ou une fonctionnalité..."
            className="flex-1 text-base outline-none text-gray-900 placeholder:text-gray-400"
          />
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Résultats */}
        {results.length > 0 && (
          <div className="max-h-96 overflow-y-auto">
            {results.map((item, index) => (
              <button
                key={`${item.path}-${item.section || 'main'}`}
                onClick={() => handleNavigate(item)}
                className={cn(
                  "w-full flex items-start justify-between px-4 py-3 text-left transition-colors",
                  index === selectedIndex
                    ? "bg-blue-50 border-l-2 border-blue-500"
                    : "hover:bg-gray-50"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {item.title}
                  </div>
                  {item.section && (
                    <div className="text-xs text-blue-600 mt-0.5 font-medium">
                      → {item.section}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-0.5">{item.category}</div>
                </div>
                <div className="text-xs text-gray-400 ml-2 flex-shrink-0">{item.path}</div>
              </button>
            ))}
          </div>
        )}

        {/* Aucun résultat */}
        {query && results.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            Aucun résultat trouvé pour "{query}"
          </div>
        )}

        {/* Instructions */}
        {!query && (
          <div className="px-4 py-3 text-xs text-gray-500 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <span>↑↓ Naviguer</span>
              <span>↵ Sélectionner</span>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
