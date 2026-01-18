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
      <div className="max-w-[95%] mx-auto py-4 flex items-center justify-between gap-8">
        {/* Gauche : Logo + Nom */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button 
            onClick={() => navigate('/')} 
            className="w-12 h-12 rounded-full overflow-hidden transition-transform duration-200 hover:scale-110 active:scale-90 cursor-pointer"
          >
            <img src="https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Nouveau%20logo%20Neira.png" alt="Neira" className="w-full h-full object-cover" />
          </button>
          <div className="leading-tight">
            <div className="text-lg font-bold text-gray-900">Neira</div>
            <div className="text-sm text-gray-600">Espace Professionnel Automatisé</div>
          </div>
        </div>

        {/* Centre : Navigation */}
        <div className="flex items-center gap-6 flex-1 justify-center">
          <button
            onClick={() => navigate('/solution')}
            className="px-6 py-2.5 text-sm font-medium hover:text-gray-900 transition-all duration-200"
          >
            Notre solution
          </button>

          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 text-lg font-semibold hover:text-gray-900 transition-all duration-200"
          >
            Accueil
          </button>

          <div ref={whoRef} className="relative">
            <button
              onClick={() => setWhoOpen(!whoOpen)}
              className="px-6 py-2.5 text-sm font-medium hover:text-gray-900 transition-all duration-200 flex items-center gap-1.5"
            >
              Pour qui ?
              <ChevronDown className="w-4 h-4" />
            </button>
            {whoOpen && (
              <div className="absolute left-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50">
                <button
                  onClick={() => { setWhoOpen(false); navigate('/avocats/metier'); }}
                  className="w-full text-left px-5 py-3 text-base hover:bg-gray-100 transition-all duration-200"
                >
                  Avocats
                </button>
                <button
                  onClick={() => { setWhoOpen(false); navigate('/notaires/metier'); }}
                  className="w-full text-left px-5 py-3 text-base hover:bg-gray-100 transition-all duration-200"
                >
                  Notaires
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Droite : Réseaux sociaux + Connexion */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <a href="https://www.instagram.com/neira.doc/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:scale-110 active:scale-90 transition-transform duration-200 shadow-md hover:shadow-lg" style={{ background: 'linear-gradient(135deg,#f58529 0%,#dd2a7b 50%,#8134af 100%)' }}>
            <Instagram className="w-5 h-5" />
          </a>
          <a href="https://www.linkedin.com/company/neira-doc" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:scale-110 active:scale-90 transition-transform duration-200 shadow-md hover:shadow-lg" style={{ background: '#0A66C2' }}>
            <Linkedin className="w-5 h-5" />
          </a>

          <div className="w-px h-8 bg-gray-300 mx-2"></div>

          <div ref={connRef} className="relative">
            <button
              onClick={() => setConnOpen(!connOpen)}
              className="px-4 py-2 text-sm font-medium hover:bg-gray-100 rounded-full transition-all duration-200 border border-gray-300 flex items-center gap-1.5 hover:scale-105 active:scale-95 hover:shadow-md"
            >
              Espace professionnel
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {connOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-50">
                <button
                  onClick={() => { setConnOpen(false); navigate('/avocats/auth'); }}
                  className="w-full text-left px-5 py-3 text-base hover:bg-gray-100 transition-all duration-200"
                >
                  Espace Avocats
                </button>
                <button
                  onClick={() => { setConnOpen(false); navigate('/notaires/auth'); }}
                  className="w-full text-left px-5 py-3 text-base hover:bg-gray-100 transition-all duration-200"
                >
                  Espace Notaires
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/client-login')}
            className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-full transition-all duration-200 border border-blue-600 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
          >
            Espace client
          </button>
        </div>
      </div>
    </header>
  );
}
