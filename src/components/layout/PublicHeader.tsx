import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Instagram, Linkedin, ChevronDown } from "lucide-react";

export function PublicHeader() {
  const navigate = useNavigate();
  const [whoOpen, setWhoOpen] = useState(false);
  const [connOpen, setConnOpen] = useState(false);
  const whoRef = useRef<HTMLDivElement | null>(null);
  const connRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!whoOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (whoRef.current && !whoRef.current.contains(t)) setWhoOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [whoOpen]);

  useEffect(() => {
    if (!connOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (connRef.current && !connRef.current.contains(t)) setConnOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [connOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-white/70 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/')} 
            className="w-8 h-8 rounded-full overflow-hidden transition-transform duration-200 hover:scale-110 active:scale-90 cursor-pointer"
          >
            <img src="https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Logo%20Neira.png" alt="Neira" className="w-full h-full object-cover" />
          </button>
          <div className="leading-tight">
            <div className="text-sm font-bold text-gray-900">Neira</div>
            <div className="text-[10px] text-gray-600">Espace Pro Automatisé</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-1.5 text-sm font-medium hover:bg-gray-100 rounded transition-all border border-gray-200 hover:scale-105 active:scale-95"
          >
            Accueil
          </button>

          <button
            onClick={() => navigate('/solution')}
            className="px-4 py-1.5 text-sm font-medium hover:bg-gray-100 rounded transition-all border border-gray-200 hover:scale-105 active:scale-95"
          >
            Solution
          </button>

          <div ref={whoRef} className="relative">
            <button
              onClick={() => setWhoOpen(!whoOpen)}
              className="px-4 py-1.5 text-sm font-medium hover:bg-gray-100 rounded transition-all border border-gray-200 flex items-center gap-1 hover:scale-105 active:scale-95"
            >
              Pour qui ?
              <ChevronDown className="w-3 h-3" />
            </button>
            {whoOpen && (
              <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => { setWhoOpen(false); navigate('/avocats/metier'); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  Avocats
                </button>
                <button
                  onClick={() => { setWhoOpen(false); navigate('/notaires/metier'); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  Notaires
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/about')}
            className="px-4 py-1.5 text-sm font-medium hover:bg-gray-100 rounded transition-all border border-gray-200 hover:scale-105 active:scale-95"
          >
            À propos
          </button>

          <button
            onClick={() => navigate('/contact')}
            className="px-4 py-1.5 text-sm font-medium hover:bg-gray-100 rounded transition-all border border-gray-200 hover:scale-105 active:scale-95"
          >
            Contact
          </button>
          <div ref={connRef} className="relative">
            <button
              onClick={() => setConnOpen(!connOpen)}
              className="px-4 py-1.5 text-sm font-medium hover:bg-gray-100 rounded transition-all border border-gray-200 flex items-center gap-1 hover:scale-105 active:scale-95"
            >
              Espace pro
              <ChevronDown className="w-3 h-3" />
            </button>
            {connOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => { setConnOpen(false); navigate('/avocats/auth'); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  Espace Avocats
                </button>
                <button
                  onClick={() => { setConnOpen(false); navigate('/notaires/auth'); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  Espace Notaires
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/client-login')}
            className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded transition-all border border-blue-600 hover:scale-105 active:scale-95"
          >
            Client
          </button>

          <a href="https://www.instagram.com/neira.doc/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-7 h-7 rounded flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform shadow-sm" style={{ background: 'linear-gradient(135deg,#f58529 0%,#dd2a7b 50%,#8134af 100%)' }}>
            <Instagram className="w-3.5 h-3.5" />
          </a>
          <a href="https://www.linkedin.com/company/neira-doc" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="w-7 h-7 rounded flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform shadow-sm" style={{ background: '#0A66C2' }}>
            <Linkedin className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </header>
  );
}
