/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role?: string; // 'avocat' | 'notaire'
  cabinet_id?: string | null;
  created_at?: string;
  subscription_plan?: string; // 'Neira Essentiel' | 'Neira Professionnel' | 'Neira Cabinet+'
  telephone_pro?: string;
  email_pro?: string;
  adresse_pro?: string;
  photo_url?: string;
  signature_url?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: unknown | null }>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: unknown | null }>;
  logout: () => Promise<void>;
}

// Context
const AuthContext = createContext<AuthContextType | null>(null);

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Ensure a row exists in public.profiles for the current auth user
  const ensureProfile = async (u: User): Promise<UserProfile | null> => {
    try {
      // Try to load existing profile
      const { data: existing, error: selectError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .maybeSingle();

      if (selectError) {
        console.error('Erreur lecture profil:', selectError);
      }

  const meta = ((u as unknown) as { user_metadata?: Record<string, unknown> }).user_metadata ?? {};
  const metaTyped = meta as Record<string, unknown>;
  // Support both 'first_name'/'last_name' and 'prenom'/'nom' formats
  const first_name = typeof metaTyped.first_name === 'string' ? metaTyped.first_name : 
                     typeof metaTyped.prenom === 'string' ? metaTyped.prenom : 
                     (existing?.first_name ?? '');
  const last_name = typeof metaTyped.last_name === 'string' ? metaTyped.last_name : 
                    typeof metaTyped.nom === 'string' ? metaTyped.nom : 
                    (existing?.last_name ?? '');
  const email = u.email ?? existing?.email ?? '';
  const role = typeof metaTyped.role === 'string' ? metaTyped.role : (existing?.role ?? 'avocat'); // Default role is 'avocat'

      if (!existing) {
        // Create profile if missing
        const { data: inserted, error: insertError } = await supabase
          .from('profiles')
          .insert({ id: u.id, email, first_name, last_name, role })
          .select()
          .single();
        if (insertError) {
          console.error('Erreur création profil:', insertError);
          return null;
        }
        return inserted as UserProfile;
      }

      // Optionally enrich missing names/role from metadata
      if ((!existing.first_name || !existing.last_name || !existing.role) && (first_name || last_name || role)) {
        const { data: updated, error: updateError } = await supabase
          .from('profiles')
          .update({ first_name, last_name, role })
          .eq('id', u.id)
          .select()
          .single();
        if (updateError) {
          console.error('Erreur mise à jour profil:', updateError);
          return existing;
        }
        return updated as UserProfile;
      }

      return existing as UserProfile;
    } catch (e) {
      console.error('ensureProfile() échec:', e);
      return null;
    }
  };

  // Vérifie l'état de l'authentification au chargement (rapide via getSession)
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        // getSession est plus rapide (utilise le cache local) que getUser
        const { data: { session } } = await supabase.auth.getSession();
        const u = session?.user ?? null;
        setUser(u);

        if (u) {
          // Ne bloque pas le rendu: hydrate le profil en arrière-plan
          ensureProfile(u).then((ensured) => setProfile(ensured)).catch((e) => {
            console.error('ensureProfile async error:', e);
          });
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'utilisateur:', error);
      } finally {
        setLoading(false);
      }
    };

    // Écoute les changements d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        // Mise à jour asynchrone du profil pour éviter les délais UX
        ensureProfile(currentUser).then((ensured) => setProfile(ensured)).catch((e) => {
          console.error('ensureProfile async error (state change):', e);
        });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    getCurrentUser();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Reset message counters once (migration to localStorage)
  useEffect(() => {
    const resetCounters = async () => {
      const RESET_VERSION = 'v2-2025-12-06-sync-fix'; // Nouvelle version pour forcer le reset
      const resetKey = `message-counters-reset-${RESET_VERSION}`;
      
      // Vérifier si le reset a déjà été fait
      if (localStorage.getItem(resetKey)) {
        return; // Déjà fait
      }

      if (!user) return;

      try {
        console.log('🔄 Réinitialisation des compteurs de messages...');
        
        // Obtenir tous les cabinets de l'utilisateur
        const { data: memberships } = await supabase
          .from('cabinet_members')
          .select('cabinet_id')
          .eq('user_id', user.id);

        if (!memberships || memberships.length === 0) {
          localStorage.setItem(resetKey, 'done');
          return;
        }

        for (const { cabinet_id } of memberships) {
          // Récupérer tous les messages du cabinet
          const { data: messages } = await supabase
            .from('cabinet_messages')
            .select('id, conversation_id, recipient_id, sender_id')
            .eq('cabinet_id', cabinet_id)
            .neq('sender_id', user.id);

          if (!messages || messages.length === 0) continue;

          // Identifier toutes les conversations
          const conversationIds = new Set<string>();
          
          messages.forEach(msg => {
            if (!msg.conversation_id && !msg.recipient_id) {
              conversationIds.add('general');
            } else if (msg.conversation_id) {
              conversationIds.add(msg.conversation_id);
            } else if (msg.recipient_id === user.id) {
              conversationIds.add(`direct-${msg.sender_id}`);
            }
          });

          // Marquer toutes les conversations comme lues
          const now = new Date().toISOString();
          conversationIds.forEach(convId => {
            const key = `chat-last-viewed-${cabinet_id}-${convId}`;
            localStorage.setItem(key, now);
          });
        }

        // Marquer le reset comme effectué
        localStorage.setItem(resetKey, 'done');
        console.log('✅ Compteurs réinitialisés');
        
        // Forcer le rechargement de la page pour que tous les compteurs se mettent à jour
        setTimeout(() => {
          window.location.reload();
        }, 500);
        
      } catch (error) {
        console.error('❌ Erreur lors de la réinitialisation des compteurs:', error);
      }
    };

    resetCounters();
  }, [user]);

  const register = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (signUpError) throw signUpError;

      // Si l'utilisateur est déjà créé/confirmé et disponible, garantir un profil
      if (data.user) {
        await ensureProfile(data.user);
      }

      return { error: null };
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      return { error };
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { error };
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      return { error };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setProfile(null);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}