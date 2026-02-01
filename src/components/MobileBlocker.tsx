import { useEffect, useState } from "react";
import { Monitor, Tablet } from "lucide-react";

export function MobileBlocker({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      // Mobile = largeur < 768px (breakpoint sm de Tailwind)
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="mb-6">
            <img 
              src="https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Nouveau%20logo%20Neira.png" 
              alt="Neira" 
              className="w-20 h-20 mx-auto rounded-full shadow-lg"
            />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Version mobile à venir
          </h1>
          
          <p className="text-gray-600 mb-6 leading-relaxed">
            Neira est actuellement optimisé pour une utilisation sur <strong>ordinateur</strong> et <strong>tablette</strong>.
          </p>

          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="flex flex-col items-center">
              <Monitor className="w-12 h-12 text-blue-600 mb-2" />
              <span className="text-sm text-gray-700 font-medium">Ordinateur</span>
            </div>
            <div className="flex flex-col items-center">
              <Tablet className="w-12 h-12 text-purple-600 mb-2" />
              <span className="text-sm text-gray-700 font-medium">Tablette</span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900">
              💡 Pour une expérience optimale, veuillez accéder à Neira depuis un ordinateur ou une tablette (iPad, etc.)
            </p>
          </div>

          <p className="text-xs text-gray-500">
            Une version mobile est en cours de développement et sera bientôt disponible.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
