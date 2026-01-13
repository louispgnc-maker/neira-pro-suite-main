import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchItem {
  title: string;
  path: string;
  keywords: string[];
  category: string;
}

const searchIndex: SearchItem[] = [
  // Dashboard
  { title: "Dashboard", path: "/dashboard", keywords: ["accueil", "tableau de bord", "home"], category: "Navigation" },
  
  // Documents & Contrats
  { title: "Documents", path: "/documents", keywords: ["fichiers", "documents", "pdfs"], category: "Gestion" },
  { title: "Contrats", path: "/contrats", keywords: ["contrats", "accords", "conventions"], category: "Gestion" },
  { title: "Signatures", path: "/signatures", keywords: ["signatures", "signer", "signature électronique"], category: "Gestion" },
  { title: "Dossiers", path: "/dossiers", keywords: ["dossiers", "affaires", "cas"], category: "Gestion" },
  
  // Clients
  { title: "Clients", path: "/clients", keywords: ["clients", "contacts", "personnes"], category: "Gestion" },
  { title: "Nouveau Client", path: "/clients/nouveau", keywords: ["créer client", "ajouter client", "nouveau contact"], category: "Actions" },
  
  // Cabinet
  { title: "Cabinet", path: "/cabinet", keywords: ["cabinet", "équipe", "collaborateurs", "membres"], category: "Gestion" },
  { title: "Espace Collaboratif", path: "/espace-collaboratif", keywords: ["collaboration", "partage", "équipe"], category: "Gestion" },
  
  // Statistiques & Rapports
  { title: "Statistiques", path: "/statistiques", keywords: ["stats", "rapports", "analyses", "graphiques"], category: "Analyse" },
  { title: "Tâches", path: "/tasks", keywords: ["tâches", "to-do", "agenda", "calendrier"], category: "Organisation" },
  
  // Communication
  { title: "Intégration Email", path: "/email-integration", keywords: ["email", "gmail", "messagerie", "courrier"], category: "Communication" },
  { title: "Boîte de réception", path: "/email-inbox", keywords: ["inbox", "messages", "emails reçus"], category: "Communication" },
  
  // Paramètres & Profil
  { title: "Mon Profil", path: "/profile", keywords: ["profil", "compte", "paramètres personnels"], category: "Paramètres" },
  { title: "Abonnement", path: "/subscription", keywords: ["abonnement", "plan", "facturation", "paiement", "premium"], category: "Paramètres" },
  
  // Support
  { title: "Support", path: "/contact-support", keywords: ["aide", "support", "contact", "assistance"], category: "Support" },
];

interface GlobalSearchProps {
  userRole?: "avocat" | "notaire";
}

export function GlobalSearch({ userRole = "avocat" }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus l'input quand ouvert
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
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
      const keywordMatch = item.keywords.some(keyword => 
        keyword.toLowerCase().includes(searchQuery)
      );
      return titleMatch || keywordMatch;
    });

    setResults(filtered.slice(0, 8)); // Limiter à 8 résultats
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
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleNavigate = (item: SearchItem) => {
    const basePath = userRole === "avocat" ? "/avocats" : "/notaires";
    const fullPath = `${basePath}${item.path}`;
    navigate(fullPath);
    setIsOpen(false);
    setQuery("");
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Rechercher...</span>
        <kbd className="hidden md:inline px-2 py-0.5 text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-[20vh]">
      <div
        ref={containerRef}
        className="w-full max-w-2xl mx-4 bg-white rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Input de recherche */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
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
                key={item.path}
                onClick={() => handleNavigate(item)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 text-left transition-colors",
                  index === selectedIndex
                    ? "bg-blue-50 border-l-2 border-blue-500"
                    : "hover:bg-gray-50"
                )}
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{item.title}</div>
                  <div className="text-xs text-gray-500">{item.category}</div>
                </div>
                <div className="text-xs text-gray-400">{item.path}</div>
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
              <span>Esc Fermer</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
