import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import AccessDenied from '@/pages/AccessDenied';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: 'avocat' | 'notaire' | 'client';
}

// Liste des emails admin qui ont accès à tous les espaces
const ADMIN_EMAILS = [
  'simontom33@sfr.fr',
  'louispgnc@gmail.com',
  'louis.poignonec@essca.eu'
];

export default function RoleProtectedRoute({ children, requiredRole }: RoleProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [userRole, setUserRole] = useState<'avocat' | 'notaire' | 'client' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserRole = async () => {
      // Attendre que l'auth soit complètement chargée
      if (authLoading) {
        return;
      }

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Si on cherche un client, vérifier dans la table clients
        if (requiredRole === 'client') {
          // D'abord vérifier que l'utilisateur N'EST PAS un professionnel
          const { data: cabinetsData } = await supabase.rpc('get_user_cabinets');
          const cabinets = Array.isArray(cabinetsData) ? cabinetsData : [];
          
          if (cabinets.length > 0) {
            // C'est un professionnel, il ne peut pas accéder à l'espace client
            setUserRole(cabinets[0].role as 'avocat' | 'notaire');
            console.log('[RoleProtectedRoute] User is a professional, cannot access client space:', cabinets[0].role);
            setLoading(false);
            return;
          }
          
          // Ensuite vérifier s'il est bien client
          const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          console.log('[RoleProtectedRoute] Client check:', clientData, clientError);

          if (clientData) {
            setUserRole('client');
            console.log('[RoleProtectedRoute] User is a client');
          } else {
            setUserRole(null);
            console.log('[RoleProtectedRoute] User is not a client');
          }
          setLoading(false);
          return;
        }

        // Pour avocat/notaire, vérifier qu'ils ne sont PAS clients
        const { data: clientCheck } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (clientCheck) {
          // C'est un client, il ne peut pas accéder aux espaces professionnels
          setUserRole('client');
          console.log('[RoleProtectedRoute] User is a client, cannot access professional space');
          setLoading(false);
          return;
        }
        
        // Pour avocat/notaire, utiliser la logique existante
        // Utiliser la même méthode que EspaceCollaboratif pour récupérer les cabinets
        const { data: cabinetsData, error: cabinetsError } = await supabase.rpc('get_user_cabinets');
        
        console.log('[RoleProtectedRoute] User:', user.id);
        console.log('[RoleProtectedRoute] Cabinets data:', cabinetsData);
        console.log('[RoleProtectedRoute] Cabinets error:', cabinetsError);
        console.log('[RoleProtectedRoute] Required role:', requiredRole);

        if (cabinetsError) throw cabinetsError;

        const cabinets = Array.isArray(cabinetsData) ? cabinetsData : [];
        
        // Chercher un cabinet avec le rôle requis
        const matchingCabinet = cabinets.find((c: any) => c.role === requiredRole);
        
        if (matchingCabinet) {
          setUserRole(matchingCabinet.role as 'avocat' | 'notaire');
          console.log('[RoleProtectedRoute] Matching cabinet found, role set to:', matchingCabinet.role);
        } else if (cabinets.length > 0) {
          // L'utilisateur a des cabinets mais pas pour ce rôle
          // Récupérer le premier cabinet pour afficher l'erreur correctement
          setUserRole(cabinets[0].role as 'avocat' | 'notaire');
          console.log('[RoleProtectedRoute] No matching cabinet, but user has:', cabinets[0].role);
        } else {
          // Aucun cabinet trouvé
          console.log('[RoleProtectedRoute] No cabinets found for user');
          setUserRole(null);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du rôle:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, [user, requiredRole, authLoading]);

  if (loading || authLoading) {
    const spinnerColor = requiredRole === 'notaire' ? 'border-orange-600' : 'border-blue-600';
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${spinnerColor}`}></div>
      </div>
    );
  }

  if (!user) {
    // Rediriger vers la page de connexion appropriée
    let authPath = '/auth';
    if (requiredRole === 'avocat') authPath = '/avocats/auth';
    else if (requiredRole === 'notaire') authPath = '/notaires/auth';
    else if (requiredRole === 'client') authPath = '/client-login';
    
    return <Navigate to={authPath} state={{ from: location }} replace />;
  }

  // Les admins ont accès uniquement aux espaces professionnels (avocat/notaire), PAS à l'espace client
  if (user.email && ADMIN_EMAILS.includes(user.email) && requiredRole !== 'client') {
    console.log('[RoleProtectedRoute] Admin user detected, access granted to professional space:', user.email);
    return <>{children}</>;
  }

  if (!userRole) {
    // Message approprié selon le rôle requis
    if (requiredRole === 'client') {
      toast.error("Accès refusé", {
        description: "Vous devez avoir un compte client pour accéder à cet espace."
      });
      return <Navigate to="/client-login" replace />;
    }
    
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
