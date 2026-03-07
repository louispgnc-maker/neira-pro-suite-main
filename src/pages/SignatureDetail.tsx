import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, FileText, User, CheckCircle, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";

type SignatureDetail = {
  id: string;
  document_name: string;
  status: string;
  created_at: string;
  transaction_id: string | null;
  universign_url: string | null;
  owner_id: string;
  role: string;
  signatories: {
    email: string;
    firstName: string;
    lastName: string;
    status?: string;
  }[];
  document_url: string | null;
  item_type: string | null;
  item_id: string | null;
};

export default function SignatureDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [signature, setSignature] = useState<SignatureDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Détecte le rôle depuis l'URL
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  useEffect(() => {
    async function loadSignature() {
      if (!user || !id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('signatures')
          .select('*')
          .eq('id', id)
          .eq('owner_id', user.id)
          .single();

        if (error || !data) {
          console.error('Erreur chargement signature:', error);
          setLoading(false);
          return;
        }

        console.log('[SignatureDetail] Données chargées:', data);
        setSignature(data as SignatureDetail);

        // Charger le PDF si c'est un document stocké
        if (data.item_type === 'document' && data.item_id) {
          const { data: doc } = await supabase
            .from('documents')
            .select('storage_path')
            .eq('id', data.item_id)
            .single();

          if (doc?.storage_path) {
            const { data: urlData } = supabase.storage
              .from('documents')
              .getPublicUrl(doc.storage_path);
            
            if (urlData?.publicUrl) {
              setPdfUrl(urlData.publicUrl);
            }
          }
        } else if (data.item_type === 'contrat' && data.item_id) {
          // Générer le PDF du contrat
          const { data: contrat } = await supabase
            .from('contrats')
            .select('content, name')
            .eq('id', data.item_id)
            .single();

          if (contrat) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              const response = await fetch(
                'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/generate-pdf-from-html',
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                  },
                  body: JSON.stringify({
                    html: contrat.content || '<p>Contrat vide</p>',
                    filename: `${contrat.name}.pdf`
                  })
                }
              );

              if (response.ok) {
                const result = await response.json();
                if (result.success && result.pdf) {
                  const byteCharacters = atob(result.pdf);
                  const byteNumbers = new Array(byteCharacters.length);
                  for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                  }
                  const byteArray = new Uint8Array(byteNumbers);
                  const blob = new Blob([byteArray], { type: 'application/pdf' });
                  const url = URL.createObjectURL(blob);
                  setPdfUrl(url);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSignature();
  }, [id, user]);

  function getStatusBadge(status: string) {
    const statusLower = status.toLowerCase();
    if (statusLower === 'signed' || statusLower === 'completed' || statusLower === 'signé') {
      return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Signé</Badge>;
    }
    if (statusLower === 'pending' || statusLower === 'en attente') {
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  }

  const mainButtonColor = role === 'notaire'
    ? 'bg-orange-600 hover:bg-orange-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!signature) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-gray-600">Signature introuvable</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6">
          <button
            onClick={() => navigate(`/${role}s/signatures`)}
            className="mb-4 flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux signatures
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{signature.document_name}</h1>
              <p className="text-sm text-gray-600 mt-1">
                Créé le {new Date(signature.created_at).toLocaleDateString('fr-FR', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
            </div>
            <div>
              {getStatusBadge(signature.status)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document Preview */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Document
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pdfUrl ? (
                  <div className="space-y-4">
                    <iframe
                      src={pdfUrl}
                      className="w-full border rounded-lg"
                      style={{ height: '600px' }}
                      title="Document preview"
                    />
                    <Button variant="outline" className="w-full" onClick={() => window.open(pdfUrl, '_blank')}>
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger le document
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[200px] bg-gray-50 rounded-lg">
                    <p className="text-gray-500">Aucun aperçu disponible</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Signatories */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Signataires ({signature.signatories?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {signature.signatories?.map((signer, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-lg bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {signer.firstName} {signer.lastName}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">{signer.email}</p>
                        </div>
                        <div className="ml-2">
                          {signer.status ? (
                            getStatusBadge(signer.status)
                          ) : (
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200">
                              <Clock className="h-3 w-3 mr-1" />
                              En attente
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {signature.universign_url && (
                  <Button
                    className={mainButtonColor + " w-full mt-4"}
                    onClick={() => window.open(signature.universign_url!, '_blank')}
                  >
                    Ouvrir dans Universign
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Transaction Info */}
            {signature.transaction_id && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-sm">Informations de transaction</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">ID Transaction:</span>
                      <p className="font-mono text-xs mt-1 break-all">{signature.transaction_id}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
