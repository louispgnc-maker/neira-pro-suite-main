import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import AccessDenied from '@/pages/AccessDenied';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: 'avocat' | 'notaire';
}

// Liste des emails admin qui ont accès à tous les espaces
const ADMIN_EMAILS = [
  'simontom33@sfr.fr',
  'louispgnc@gmail.com',
  'louis.poignonec@essca.eu'
];

export default function RoleProtectedRoute({ children, requiredRole }: RoleProtectedRouteProps) {
  const { user } = useAuth();
  const location = useLocation();
  const [userRole, setUserRole] = useState<'avocat' | 'notaire' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Utiliser la même méthode que EspaceCollaboratif pour récupérer les cabinets
        const { data: cabinetsData, error: cabinetsError } = await supabase.rpc('get_user_cabinets');
        
        console.log('[RoleProtectedRoute] User:', user.id);
        console.log('[RoleProtectedRoute] Cabinets data:', cabinetsData);
        console.log('[RoleProtectedRoute] Cabinets error:', cabinetsError);
        console.log('[RoleProtectedRoute] Required role:', requiredRole);

        if (cabinetsError) throw cabinetsError;

        const cabinets = Array.isArray(cabinetsData) ? cabinetsData : [];
        const userCabinet = cabinets.find((c: any) => c.role === requiredRole);

        if (userCabinet) {
          setUserRole(userCabinet.role as 'avocat' | 'notaire');
          console.log('[RoleProtectedRoute] User role set to:', userCabinet.role);
        } else {
          console.log('[RoleProtectedRoute] No cabinet found for required role:', requiredRole);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du rôle:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, [user, requiredRole]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!user) {
    // Rediriger vers la page de connexion appropriée
    const authPath = requiredRole === 'avocat' ? '/avocats/auth' : '/notaires/auth';
    return <Navigate to={authPath} state={{ from: location }} replace />;
  }

  // Les admins ont accès à tous les espaces
  if (user.email && ADMIN_EMAILS.includes(user.email)) {
    console.log('[RoleProtectedRoute] Admin user detected:', user.email);
    return <>{children}</>;
  }

  if (!userRole) {
    // L'utilisateur n'a pas de cabinet, rediriger vers la page de test pour créer son cabinet
    toast.error("Aucun cabinet trouvé", {
      description: "Veuillez créer votre cabinet pour accéder à cet espace."
    });
    return <Navigate to="/test-subscription" replace />;
  }

  if (userRole && userRole !== requiredRole) {
    // L'utilisateur a un rôle mais ce n'est pas le bon - afficher la page d'erreur
    return <AccessDenied userRole={userRole} attemptedRole={requiredRole} />;
  }

  return <>{children}</>;
}
