import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Composant qui intercepte les redirections de confirmation email
 * et redirige vers la page /confirm-email
 */
export default function EmailConfirmHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    
    // Vérifier si on a un token de type signup ou recovery dans l'URL
    if (hash && (hash.includes('type=signup') || hash.includes('access_token'))) {
      // Rediriger vers la page de confirmation
      navigate('/confirm-email' + hash);
    }
  }, [navigate]);

  return null; // Ce composant ne rend rien
}
