import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from './AuthContext';

interface ClientThemeContextType {
  professionType: 'avocat' | 'notaire';
  isLoading: boolean;
}

const ClientThemeContext = createContext<ClientThemeContextType>({
  professionType: 'avocat',
  isLoading: true,
});

export function ClientThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [professionType, setProfessionType] = useState<'avocat' | 'notaire'>('avocat');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProfessionType = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Get client data and cabinet role
        const { data: client } = await supabase
          .from('clients')
          .select('owner_id')
          .eq('user_id', user.id)
          .single();

        if (client?.owner_id) {
          const { data: cabinet } = await supabase
            .from('cabinets')
            .select('role')
            .eq('id', client.owner_id)
            .single();

          if (cabinet?.role) {
            setProfessionType(cabinet.role as 'avocat' | 'notaire');
          }
        }
      } catch (error) {
        console.error('Error loading profession type:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfessionType();
  }, [user]);

  return (
    <ClientThemeContext.Provider value={{ professionType, isLoading }}>
      {children}
    </ClientThemeContext.Provider>
  );
}

export function useClientTheme() {
  return useContext(ClientThemeContext);
}
