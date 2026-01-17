import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import ClientLayout from '@/components/client/ClientLayout';
import { DocumentManager } from '@/components/client-space/DocumentManager';
import { Loader2 } from 'lucide-react';

interface DocumentFile {
  id: string;
  title: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_at: string;
  uploaded_by: string | null;
  description?: string | null;
}

export default function ClientDocuments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [clientId, setClientId] = useState<string>('');
  const [cabinetId, setCabinetId] = useState<string>('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    loadClientInfo();
  }, [user, navigate]);

  const loadClientInfo = async () => {
    try {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, owner_id')
        .eq('user_id', user?.id)
        .single();

      if (clientError) throw clientError;

      setClientId(client.id);
      setCabinetId(client.owner_id);
      await loadDocuments(client.id);
      setLoading(false);
    } catch (err: any) {
      console.error('Error loading client info:', err);
      toast.error('Erreur lors du chargement');
      setLoading(false);
    }
  };

  const loadDocuments = async (cId?: string) => {
    try {
      const targetClientId = cId || clientId;
      if (!targetClientId) return;

      const { data, error } = await supabase
        .from('client_shared_documents')
        .select('*')
        .eq('client_id', targetClientId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      setDocuments(data || []);
    } catch (err: any) {
      console.error('Error loading documents:', err);
      toast.error('Erreur lors du chargement des documents');
    }
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mes documents</h1>
          <p className="mt-2 text-gray-600">
            Accédez à tous vos documents partagés par votre professionnel
          </p>
        </div>

        <DocumentManager
          clientId={clientId}
          cabinetId={cabinetId}
          documents={documents}
          isProView={false}
          onRefresh={() => loadDocuments()}
        />
      </div>
    </ClientLayout>
  );
}
