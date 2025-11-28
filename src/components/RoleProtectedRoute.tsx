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
        // Récupérer le cabinet de l'utilisateur
        const { data: cabinet, error } = await supabase
          .from('cabinets')
          .select('role')
          .eq('owner_id', user.id)
          .single();

        console.log('[RoleProtectedRoute] User:', user.id);
        console.log('[RoleProtectedRoute] Cabinet data:', cabinet);
        console.log('[RoleProtectedRoute] Cabinet error:', error);
        console.log('[RoleProtectedRoute] Required role:', requiredRole);

        if (cabinet) {
          setUserRole(cabinet.role as 'avocat' | 'notaire');
          console.log('[RoleProtectedRoute] User role set to:', cabinet.role);
        } else {
          console.log('[RoleProtectedRoute] No cabinet found for user');
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du rôle:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, [user]);

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
