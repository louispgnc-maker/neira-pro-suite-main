import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const email = searchParams.get('email');

    // Send message to parent window
    if (window.opener) {
      window.opener.postMessage(
        {
          type: 'oauth-callback',
          success: success === 'true',
          error: error || null,
          email: email || null,
        },
        window.location.origin
      );

      // Close popup after sending message
      setTimeout(() => {
        window.close();
      }, 500);
    } else {
      // Fallback if not in popup (should not happen)
      console.error('No opener window found');
    }
  }, [searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Connexion en cours...</p>
      </div>
    </div>
  );
}
