import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Instagram, Linkedin } from "lucide-react";

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
      <div style={{ paddingLeft: '2.5cm', paddingRight: '2.5cm' }} className="w-full py-3 flex items-center justify-between gap-4 relative">
        <div onClick={() => navigate('/')} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
          <img src="https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Design_sans_titre-3-removebg-preview.png" alt="Neira" className="w-10 h-10 rounded-md object-cover" />
          <div className="leading-tight">
            <div className="text-base font-bold text-foreground">Neira</div>
            <div className="text-xs text-muted-foreground">Espace Professionnel Automatisé</div>
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-16">
          <div ref={whoRef} className="relative">
            <button
              onClick={() => setWhoOpen(!whoOpen)}
              className="px-4 py-2 text-sm font-medium hover:bg-gray-100 rounded-md transition-colors"
            >
              Pour qui ?
            </button>
            {whoOpen && (
              <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                <button
                  onClick={() => { setWhoOpen(false); navigate('/avocats/metier'); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                >
                  Avocats
                </button>
                <button
                  onClick={() => { setWhoOpen(false); navigate('/notaires/metier'); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                >
                  Notaires
                </button>
              </div>
            )}
          </div>

          <div ref={connRef} className="relative">
            <button
              onClick={() => setConnOpen(!connOpen)}
              className="px-4 py-2 text-sm font-medium hover:bg-gray-100 rounded-md transition-colors"
            >
              Connexion
            </button>
            {connOpen && (
              <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                <button
                  onClick={() => { setConnOpen(false); navigate('/avocats/auth'); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                >
                  Espace Avocats
                </button>
                <button
                  onClick={() => { setConnOpen(false); navigate('/notaires/auth'); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                >
                  Espace Notaires
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/about')}
            className="px-4 py-2 text-sm font-medium hover:bg-gray-100 rounded-md transition-colors"
          >
            À propos
          </button>

          <button
            onClick={() => navigate('/contact')}
            className="px-4 py-2 text-sm font-medium hover:bg-gray-100 rounded-md transition-colors"
          >
            Contact
          </button>
        </div>

        <div className="flex items-center gap-2">
          <a href="https://www.instagram.com/neira.doc/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-8 h-8 rounded-md flex items-center justify-center text-white hover:scale-105 transition-transform duration-150 shadow-sm" style={{ background: 'linear-gradient(135deg,#f58529 0%,#dd2a7b 50%,#8134af 100%)' }}>
            <Instagram className="w-4 h-4" />
          </a>
          <a href="https://www.linkedin.com/company/neira-doc" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="w-8 h-8 rounded-md flex items-center justify-center text-white hover:scale-105 transition-transform duration-150 shadow-sm" style={{ background: '#0A66C2' }}>
            <Linkedin className="w-4 h-4" />
          </a>
        </div>
      </div>
    </header>
  );
}
