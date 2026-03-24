import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, FileText, User, CheckCircle, Clock, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
  signed_document_path: string | null;
};

export default function SignatureDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [signature, setSignature] = useState<SignatureDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [closingTransaction, setClosingTransaction] = useState(false);

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
        console.log('[SignatureDetail] item_type:', data.item_type, 'item_id:', data.item_id);
        console.log('[SignatureDetail] document_url:', data.document_url);
        console.log('[SignatureDetail] signed_document_path:', data.signed_document_path);
        setSignature(data as SignatureDetail);

        // Synchroniser automatiquement le statut avec Universign si la transaction n'est pas fermée
        if (data.transaction_id && data.status !== 'cancelled' && data.status !== 'closed' && data.status !== 'completed' && data.status !== 'signed') {
          console.log('[SignatureDetail] Auto-sync status with Universign...');
          syncStatusWithUniversign(id);
        }

        // Si le document est signé et qu'on a le chemin du document signé, l'utiliser
        let foundPdf = false;
        if ((data.status === 'signed' || data.status === 'signee' || data.status === 'signe') && data.signed_document_path) {
          console.log('[SignatureDetail] Chargement du document signé:', data.signed_document_path);
          const { data: urlData } = supabase.storage
            .from('documents')
            .getPublicUrl(data.signed_document_path);
          
          if (urlData?.publicUrl) {
            console.log('[SignatureDetail] PDF URL signed doc:', urlData.publicUrl);
            setPdfUrl(urlData.publicUrl);
            foundPdf = true;
          }
        }

        // Charger le PDF si c'est un document stocké
        if (!foundPdf && data.item_type === 'document' && data.item_id) {
          console.log('[SignatureDetail] Chargement document from documents table, item_id:', data.item_id);
          const { data: doc } = await supabase
            .from('documents')
            .select('storage_path')
            .eq('id', data.item_id)
            .single();

          console.log('[SignatureDetail] Document trouvé:', doc);
          if (doc?.storage_path) {
            const { data: urlData } = supabase.storage
              .from('documents')
              .getPublicUrl(doc.storage_path);
            
            if (urlData?.publicUrl) {
              console.log('[SignatureDetail] PDF URL from documents:', urlData.publicUrl);
              setPdfUrl(urlData.publicUrl);
              foundPdf = true;
            }
          }
        }
        
        // Générer le PDF du contrat si besoin
        if (!foundPdf && data.item_type === 'contrat' && data.item_id) {
          console.log('[SignatureDetail] Génération PDF contrat, item_id:', data.item_id);
          // Générer le PDF du contrat
          const { data: contrat } = await supabase
            .from('contrats')
            .select('content, name')
            .eq('id', data.item_id)
            .single();

          console.log('[SignatureDetail] Contrat trouvé:', contrat?.name);

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
                  foundPdf = true;
                }
              }
            }
          }
        }
        
        // Fallback final: utiliser document_url si disponible et qu'aucun PDF n'a été chargé
        if (!foundPdf && data.document_url) {
          console.log('[SignatureDetail] Using document_url fallback:', data.document_url);
          setPdfUrl(data.document_url);
          foundPdf = true;
        }
        
        console.log('[SignatureDetail] foundPdf final:', foundPdf, 'pdfUrl sera:', foundPdf ? 'set' : 'null');
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSignature();
  }, [id, user]);

  // Fonction de synchronisation avec Universign
  async function syncStatusWithUniversign(signatureId: string) {
    console.log('[SyncStatus] Syncing status for signature:', signatureId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('[SyncStatus] No session');
        return;
      }

      const response = await fetch(
        'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/universign-sync-status',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            signatureId: signatureId
          })
        }
      );

      const result = await response.json();
      console.log('[SyncStatus] Result:', result);

      if (response.ok) {
        console.log('[SyncStatus] Status synchronized successfully');
        
        // Reload signature data
        const { data: updatedSig, error } = await supabase
          .from('signatures')
          .select('*')
          .eq('id', signatureId)
          .single();

        if (!error && updatedSig) {
          setSignature(updatedSig);
          
          // Si le document est maintenant signé, charger le document signé
          if ((updatedSig.status === 'signed' || updatedSig.status === 'signee' || updatedSig.status === 'signe') && updatedSig.signed_document_path) {
            const { data: urlData } = supabase.storage
              .from('documents')
              .getPublicUrl(updatedSig.signed_document_path);
            
            if (urlData?.publicUrl) {
              setPdfUrl(urlData.publicUrl);
            }
          }
        }
      } else {
        console.error('[SyncStatus] Sync failed:', result.error);
      }
    } catch (error: any) {
      console.error('[SyncStatus] Error:', error);
    }
  }

  async function handleCloseTransaction() {
    if (!signature?.transaction_id) {
      toast.error('Aucune transaction à clore');
      return;
    }

    const confirmClose = window.confirm(
      'Êtes-vous sûr de vouloir clore cette transaction ?\n\n' +
      'Seuls les signataires ayant déjà signé seront comptabilisés dans votre quota mensuel.\n' +
      'Cette action est irréversible.'
    );

    if (!confirmClose) return;

    setClosingTransaction(true);
    console.log('[CloseTransaction] Starting closure for:', signature.transaction_id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expirée');
        setClosingTransaction(false);
        return;
      }

      console.log('[CloseTransaction] Calling Edge Function...');
      const response = await fetch(
        'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/universign-cancel-transaction',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            transactionId: signature.transaction_id
          })
        }
      );

      console.log('[CloseTransaction] Response status:', response.status);
      const result = await response.json();
      console.log('[CloseTransaction] Result:', result);

      if (!response.ok) {
        console.error('[CloseTransaction] Error from API:', result);
        const errorMsg = result.details || result.error || 'Erreur lors de la clôture';
        toast.error(errorMsg);
        setClosingTransaction(false);
        return;
      }

      toast.success(`Transaction clôturée - ${result.signedCount || 0} signataire(s) comptabilisé(s)`);
      
      // Recharger la signature pour voir le nouveau statut
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('[CloseTransaction] Exception:', error);
      toast.error('Erreur lors de la clôture de la transaction');
      setClosingTransaction(false);
    }
  }

  // Badge pour le statut GLOBAL de la transaction
  function getGlobalStatusBadge(status: string) {
    const statusLower = status.toLowerCase();
    if (statusLower === 'signed' || statusLower === 'completed' || statusLower === 'signé' || statusLower === 'signee' || statusLower === 'signe') {
      return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Signé</Badge>;
    }
    if (statusLower === 'pending' || statusLower === 'en attente' || statusLower === 'en_attente') {
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
    }
    if (statusLower === 'closed' || statusLower === 'fermée' || statusLower === 'fermee' || statusLower === 'cancelled' || statusLower === 'annulee' || statusLower === 'annulée') {
      return <Badge className="bg-gray-100 text-gray-700 border-gray-200"><XCircle className="h-3 w-3 mr-1" />Fermée</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  }

  // Badge pour le statut d'un SIGNATAIRE
  function getStatusBadge(status: string) {
    const statusLower = status.toLowerCase();
    if (statusLower === 'signed' || statusLower === 'completed' || statusLower === 'signé' || statusLower === 'signee' || statusLower === 'signe') {
      return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Signé</Badge>;
    }
    if (statusLower === 'pending' || statusLower === 'en attente' || statusLower === 'en_attente') {
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
    }
    if (statusLower === 'closed' || statusLower === 'fermée' || statusLower === 'fermee' || statusLower === 'cancelled' || statusLower === 'annulee' || statusLower === 'annulée' || statusLower === 'expired' || statusLower === 'expiré' || statusLower === 'non_signe' || statusLower === 'non signé') {
      return <Badge className="bg-gray-100 text-gray-700 border-gray-200"><XCircle className="h-3 w-3 mr-1" />Non signé</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  }

  // Fonction pour déterminer le statut d'un signataire en fonction du statut global
  function getSignerDisplayStatus(signerStatus: string | undefined, globalStatus: string): string {
    const globalLower = globalStatus.toLowerCase();
    const isTransactionClosed = globalLower === 'closed' || globalLower === 'fermée' || globalLower === 'fermee' || globalLower === 'cancelled' || globalLower === 'annulee' || globalLower === 'annulée';
    
    // Si le signataire a un statut spécifique, l'utiliser
    if (signerStatus) {
      const signerLower = signerStatus.toLowerCase();
      // Si le signataire a signé, toujours afficher "signé"
      if (signerLower === 'signed' || signerLower === 'completed' || signerLower === 'signé' || signerLower === 'signee' || signerLower === 'signe') {
        return signerStatus;
      }
    }
    
    // Si la transaction est fermée et que le signataire n'a pas signé, afficher "non_signe"
    if (isTransactionClosed) {
      return 'non_signe';
    }
    
    // Sinon, utiliser le statut du signataire ou "en_attente" par défaut
    return signerStatus || 'en_attente';
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
              {getGlobalStatusBadge(signature.status)}
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
                      Télécharger le document original
                    </Button>
                    {signature.transaction_id && (
                      <Button 
                        className={mainButtonColor + " w-full"}
                        onClick={async () => {
                          try {
                            const { data: { session } } = await supabase.auth.getSession();
                            if (!session) {
                              toast.error('Session expirée');
                              return;
                            }

                            const response = await fetch(
                              'https://elysrdqujzlbvnjfilvh.supabase.co/functions/v1/download-signed-document',
                              {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${session.access_token}`
                                },
                                body: JSON.stringify({
                                  transactionId: signature.transaction_id
                                })
                              }
                            );

                            if (!response.ok) {
                              toast.error('Erreur lors du téléchargement');
                              return;
                            }

                            const result = await response.json();
                            if (result.success && result.pdfBase64) {
                              // Convertir base64 en blob et télécharger
                              const byteCharacters = atob(result.pdfBase64);
                              const byteNumbers = new Array(byteCharacters.length);
                              for (let i = 0; i < byteCharacters.length; i++) {
                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                              }
                              const byteArray = new Uint8Array(byteNumbers);
                              const blob = new Blob([byteArray], { type: 'application/pdf' });
                              const url = URL.createObjectURL(blob);
                              
                              // Télécharger
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = result.filename || 'document_signe.pdf';
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                              
                              toast.success('Document signé téléchargé');
                            }
                          } catch (error) {
                            console.error('Download error:', error);
                            toast.error('Erreur lors du téléchargement');
                          }
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger le document signé
                      </Button>
                    )}
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
                          {getStatusBadge(getSignerDisplayStatus(signer.status, signature.status))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 mt-4">
                  {signature.universign_url && (
                    <Button
                      className={mainButtonColor + " w-full"}
                      onClick={() => window.open(signature.universign_url!, '_blank')}
                    >
                      Ouvrir dans Universign
                    </Button>
                  )}
                  
                  {signature.transaction_id && signature.status !== 'cancelled' && signature.status !== 'closed' && signature.status !== 'completed' && signature.status !== 'signed' && (
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={handleCloseTransaction}
                      disabled={closingTransaction}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {closingTransaction ? 'Clôture en cours...' : 'Clore la transaction'}
                    </Button>
                  )}
                </div>
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
