import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: 'avocat' | 'notaire';
}

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
        const { data: cabinet } = await supabase
          .from('cabinets')
          .select('role')
          .eq('owner_id', user.id)
          .single();

        if (cabinet) {
          setUserRole(cabinet.role as 'avocat' | 'notaire');
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

  if (userRole && userRole !== requiredRole) {
    // L'utilisateur a un rôle mais ce n'est pas le bon
    toast.error("Accès refusé", {
      description: `Vous avez un compte ${userRole}. Vous ne pouvez pas accéder à l'espace ${requiredRole}.`
    });
    
    // Rediriger vers le dashboard approprié pour son rôle
    const correctPath = userRole === 'avocat' ? '/avocats/dashboard' : '/notaires/dashboard';
    return <Navigate to={correctPath} replace />;
  }

  return <>{children}</>;
}
