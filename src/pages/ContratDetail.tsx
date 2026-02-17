import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, RefreshCw, Edit, Save, X, FileEdit, FileDown, Upload, ChevronDown, Copy, PenTool } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { generateContractWithAI, getClientInfo } from "@/lib/contractAIHelper";
import jsPDF from 'jspdf';

interface Contrat {
  id: string;
  name: string;
  category?: string | null;
  type?: string | null;
  description?: string | null;
  content?: string | null;
  created_at?: string | null;
  contenu_json?: any;
  client_id?: string | null;
  parties_clients?: Record<string, string> | null; // { "Le franchiseur": "uuid", "Le franchisé": "uuid" }
}

export default function ContratDetail() {
  const { user } = useAuth();
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const [contrat, setContrat] = useState<Contrat | null>(null);
  const [sharedBy, setSharedBy] = useState<string | null>(null);
  const [sharedById, setSharedById] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(true); // Par défaut, on suppose que c'est le propriétaire
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // État pour le chargement lors de la sauvegarde
  const [savingProgress, setSavingProgress] = useState(0); // Pourcentage de progression (0-100)
  const [displayedProgress, setDisplayedProgress] = useState(0); // Pourcentage affiché avec animation
  const [waitingProgress, setWaitingProgress] = useState<number | null>(null); // Progression cible pendant l'attente AI
  const [clients, setClients] = useState<any[]>([]);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  
  // États pour l'édition des informations
  const [editingInfo, setEditingInfo] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedCategory, setEditedCategory] = useState("");
  const [editedType, setEditedType] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedClientId, setEditedClientId] = useState("");
  const [editedPartiesClients, setEditedPartiesClients] = useState<Record<string, string>>({});
  
  // États pour l'édition du contenu
  const [editingContent, setEditingContent] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  
  // Détecter les parties du contrat depuis le contenu
  const [contractParties, setContractParties] = useState<string[]>([]);

  // Animation de la barre de progression
  useEffect(() => {
    // Déterminer la cible : soit waitingProgress (en attente AI), soit savingProgress (normal)
    const targetProgress = waitingProgress !== null ? waitingProgress : savingProgress;
    
    if (targetProgress > displayedProgress) {
      const timer = setInterval(() => {
        setDisplayedProgress(prev => {
          if (prev >= targetProgress) {
            clearInterval(timer);
            return targetProgress;
          }
          return prev + 1;
        });
      }, 15); // Animation rapide : 1% toutes les 15ms
      
      return () => clearInterval(timer);
    } else if (targetProgress < displayedProgress && savingProgress === 0) {
      // Reset uniquement si savingProgress est à 0 (nouveau démarrage)
      setDisplayedProgress(0);
    }
  }, [savingProgress, displayedProgress, waitingProgress]);

  // Fonction pour générer le PDF (commune) - VERSION CLIENT avec jsPDF
  const generatePdfBlob = async () => {
    if (!contrat || !contrat.content) {
      throw new Error("Aucun contenu à transformer en PDF");
    }
    
    try {
      // Créer un nouveau document PDF
      const doc = new jsPDF();
      
      // Configuration
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      let y = margin;

      // Titre du contrat
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      const titleLines = doc.splitTextToSize(contrat.name || "Contrat", maxWidth);
      titleLines.forEach((line: string) => {
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 8;
      });

      y += 5;

      // Métadonnées
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Type: ${contrat.type || contrat.category || "N/A"}`, margin, y);
      y += 7;
      if (contrat.client_nom) {
        doc.text(`Client: ${contrat.client_nom}`, margin, y);
        y += 7;
      }
      doc.text(`Date: ${new Date(contrat.created_at).toLocaleDateString('fr-FR')}`, margin, y);
      y += 10;

      // Ligne de séparation
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      // Contenu du contrat
      doc.setFontSize(11);
      
      // Nettoyer le HTML et extraire le texte
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = contrat.content;
      const textContent = tempDiv.textContent || tempDiv.innerText || "";
      
      const contentLines = doc.splitTextToSize(textContent, maxWidth);
      
      contentLines.forEach((line: string) => {
        if (y > pageHeight - margin - 10) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += 6;
      });

      // Convertir en blob
      const pdfBlob = doc.output('blob');
      return pdfBlob;
    } catch (error) {
      console.error("Erreur génération PDF côté client:", error);
      throw new Error("Impossible de générer le PDF");
    }
  };

  // Fonction pour sauvegarder le PDF dans l'espace personnel
  const handleSavePdf = async () => {
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }
    
    setGeneratingPdf(true);
    toast.info("Enregistrement dans vos documents...");
    
    try {
      const blob = await generatePdfBlob();
      
      // Utiliser un nom de fichier fixe basé sur l'ID du contrat pour permettre le remplacement
      const fileName = `contrat_${contrat.id}.pdf`;
      const filePath = `${user.id}/${fileName}`;
      
      // Uploader dans Supabase Storage (upsert pour remplacer si existe)
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, blob, {
          contentType: 'application/pdf',
          upsert: true  // Remplace le fichier s'il existe déjà
        });
      
      if (uploadError) throw uploadError;
      
      // Vérifier si le contrat a déjà un ID de document PDF enregistré
      const existingPdfDocId = contrat.contenu_json?.pdf_document_id;
      
      if (existingPdfDocId) {
        // Mettre à jour le document existant
        const { error: updateError } = await supabase
          .from('documents')
          .update({
            name: `${contrat.name}.pdf`,
            storage_path: filePath,
            status: 'Validé',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPdfDocId);
        
        if (updateError) throw updateError;
        toast.success("✅ PDF mis à jour dans vos documents !");
      } else {
        // Créer une nouvelle entrée et sauvegarder son ID
        const { data: newDoc, error: insertError } = await supabase
          .from('documents')
          .insert({
            owner_id: user.id,
            name: `${contrat.name}.pdf`,
            storage_path: filePath,
            status: 'Validé',
            role: contrat.role || 'avocat'
          })
          .select('id')
          .single();
        
        if (insertError) throw insertError;
        
        // Sauvegarder l'ID du document dans le contrat pour les prochaines mises à jour
        if (newDoc) {
          const updatedContenuJson = {
            ...(contrat.contenu_json || {}),
            pdf_document_id: newDoc.id
          };
          
          await supabase
            .from('contrats')
            .update({ contenu_json: updatedContenuJson })
            .eq('id', contrat.id);
          
          // Mettre à jour l'état local
          setContrat({ ...contrat, contenu_json: updatedContenuJson });
        }
        
        toast.success("✅ PDF enregistré dans vos documents !");
      }
    } catch (error) {
      console.error('Erreur sauvegarde PDF:', error);
      toast.error("Erreur lors de l'enregistrement du PDF", {
        description: error instanceof Error ? error.message : "Veuillez réessayer"
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Fonction pour télécharger le PDF sur l'ordinateur
  const handleDownloadPdf = async () => {
    setGeneratingPdf(true);
    toast.info("Génération du PDF...");
    
    try {
      const blob = await generatePdfBlob();
      
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${contrat.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("✅ PDF téléchargé !");
    } catch (error) {
      console.error('Erreur téléchargement PDF:', error);
      toast.error("Erreur lors du téléchargement du PDF", {
        description: error instanceof Error ? error.message : "Veuillez réessayer"
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Fonction pour copier le texte du contrat
  const handleCopyText = async () => {
    if (!contrat?.content) {
      toast.error("Aucun contenu à copier");
      return;
    }

    try {
      // Extraire le texte du HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = contrat.content;
      const textContent = tempDiv.textContent || tempDiv.innerText || "";
      
      await navigator.clipboard.writeText(textContent);
      toast.success("✅ Texte copié dans le presse-papiers !");
    } catch (error) {
      console.error('Erreur copie:', error);
      toast.error("Erreur lors de la copie du texte");
    }
  };

  // Fonction pour initier la signature du contrat
  const handleSignContract = () => {
    toast.info("Redirection vers la page de signature...");
    navigate('/signatures');
  };

  // Fonction pour régénérer le contrat avec l'IA
  const handleRegenerate = async () => {
    if (!user || !contrat) return;
    
    setRegenerating(true);
    toast.info("Régénération du contrat avec l'IA...");
    
    try {
      // Extraire le clientId du contenu_json (essayer plusieurs champs possibles)
      const formData = contrat.contenu_json || {};
      
      console.log('🔍 DEBUG Régénération:', {
        contrat_id: contrat.id,
        contrat_name: contrat.name,
        contenu_json_exists: !!contrat.contenu_json,
        formData_keys: Object.keys(formData),
        formData: formData
      });
      
      const clientId = formData.clientId || 
                       formData.bailleurClientId || 
                       formData.locataireClientId ||
                       formData.defuntClientId ||
                       formData.licencieClientId ||
                       formData.cedant?.clientId ||
                       formData.cessionnaire?.clientId ||
                       formData.donateur?.clientId ||
                       formData.donataire?.clientId ||
                       formData.epoux?.[0]?.clientId ||
                       formData.epoux?.[1]?.clientId ||
                       formData.partenaires?.[0]?.clientId ||
                       formData.partenaires?.[1]?.clientId ||
                       formData.indivisaires?.find((i: any) => i.clientId)?.clientId ||
                       formData.debiteurs?.find((d: any) => d.clientId)?.clientId ||
                       formData.heritiers?.[0]?.clientId;
      
      console.log('👤 Client ID extrait:', clientId);
      
      // Récupérer les infos client si un clientId existe
      const clientInfo = clientId ? getClientInfo(clientId, clients) : {};
      
      console.log('📋 Données envoyées à l\'IA:', {
        contractType: contrat.type || contrat.name,
        formData_is_empty: Object.keys(formData).length === 0,
        clientInfo_is_empty: Object.keys(clientInfo).length === 0
      });
      
      // Note: Les fichiers ne sont pas re-transmis lors de la régénération
      // car ils sont déjà uploadés et stockés. L'IA reçoit les données du formulaire uniquement.
      
      // Générer le nouveau contenu avec l'IA en utilisant les données du formulaire
      const generatedContract = await generateContractWithAI({
        contractType: contrat.type || contrat.name,
        formData: formData,
        clientInfo: clientInfo,
        user
      });

      // Mettre à jour le contrat dans la base de données
      const { error } = await supabase
        .from('contrats')
        .update({ content: generatedContract })
        .eq('id', contrat.id);

      if (error) throw error;

      // Mettre à jour l'état local
      setContrat({ ...contrat, content: generatedContract });
      
      toast.success("✅ Contrat régénéré avec succès !");
      
    } catch (error) {
      console.error('Erreur régénération:', error);
      toast.error("Erreur lors de la régénération", {
        description: error instanceof Error ? error.message : "Veuillez réessayer"
      });
    } finally {
      setRegenerating(false);
    }
  };

  // Fonction pour commencer l'édition des informations
  const startEditingInfo = () => {
    if (!contrat) return;
    setEditedName(contrat.name);
    setEditedCategory(contrat.category || "");
    setEditedClientId(contrat.client_id || "");
    setEditedType(contrat.type || "");
    setEditedDescription(contrat.description || "");
    setEditedPartiesClients(contrat.parties_clients || {});
    
    // Priorité 1 : client_roles du JSON (plus fiable)
    if (contrat.contenu_json?.client_roles && Array.isArray(contrat.contenu_json.client_roles)) {
      setContractParties(contrat.contenu_json.client_roles.slice(0, 5));
    }
    // Priorité 2 : Détecter depuis le contenu si disponible
    else if (contrat.content) {
      const parties = detectContractParties(contrat.content);
      setContractParties(parties);
    }
    // Priorité 3 : Vide (ancien système avec client_id unique)
    else {
      setContractParties([]);
    }
    
    setEditingInfo(true);
  };
  
  // Fonction pour détecter les parties du contrat
  const detectContractParties = (content: string): string[] => {
    const parties: string[] = [];
    
    // Liste de rôles contractuels connus avec leurs variations
    const knownRoles = [
      'franchiseur', 'franchisé', 'vendeur', 'acquéreur', 'acheteur',
      'bailleur', 'locataire', 'employeur', 'salarié', 'employé',
      'prestataire', 'client', 'donateur', 'donataire', 'cédant', 'cessionnaire',
      'prêteur', 'emprunteur', 'mandant', 'mandataire', 'propriétaire'
    ];
    
    // Pattern 1 : "D'une part, [ROLE]" ou "D'une part [ROLE]"
    const pattern1 = /D'une\s+part[,\s:]+(?:\[À COMPLÉTER\][,\s]*(?:ci-après\s+)?(?:dénommé|désigné)\s+"([^"]+)"|(?:le|la)\s+([a-zéèêàâûù]+))/gi;
    const matches1 = content.matchAll(pattern1);
    for (const match of matches1) {
      const role = (match[1] || match[2])?.trim().toLowerCase();
      if (role) {
        // Capitaliser proprement
        const capitalizedRole = role.includes(' ') 
          ? role.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
          : `Le ${role.charAt(0).toUpperCase() + role.slice(1)}`;
        
        if ((knownRoles.includes(role) || match[1]) && !parties.includes(capitalizedRole)) {
          parties.push(capitalizedRole);
        }
      }
    }
    
    // Pattern 2 : "Et d'autre part, [ROLE]"
    const pattern2 = /Et\s+d'autre\s+part[,\s:]+(?:\[À COMPLÉTER\][,\s]*(?:ci-après\s+)?(?:dénommé|désigné)\s+"([^"]+)"|(?:le|la)\s+([a-zéèêàâûù]+))/gi;
    const matches2 = content.matchAll(pattern2);
    for (const match of matches2) {
      const role = (match[1] || match[2])?.trim().toLowerCase();
      if (role) {
        const capitalizedRole = role.includes(' ')
          ? role.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
          : `Le ${role.charAt(0).toUpperCase() + role.slice(1)}`;
        
        if ((knownRoles.includes(role) || match[1]) && !parties.includes(capitalizedRole)) {
          parties.push(capitalizedRole);
        }
      }
    }
    
    // Pattern 3 : Détection directe dans le texte (fallback agressif)
    if (parties.length === 0) {
      const contentLower = content.toLowerCase();
      if (contentLower.includes('franchiseur') && contentLower.includes('franchisé')) {
        parties.push('Le Franchiseur', 'Le Franchisé');
      } else if (contentLower.includes('bailleur') && contentLower.includes('locataire')) {
        parties.push('Le Bailleur', 'Le Locataire');
      } else if (contentLower.includes('employeur') && contentLower.includes('salarié')) {
        parties.push('L\'Employeur', 'Le Salarié');
      } else if (contentLower.includes('vendeur') && contentLower.includes('acquéreur')) {
        parties.push('Le Vendeur', 'L\'Acquéreur');
      } else if (contentLower.includes('prestataire') && contentLower.includes('client')) {
        parties.push('Le Prestataire', 'Le Client');
      }
    }
    
    // Fallback JSON si toujours vide
    if (parties.length === 0 && contrat?.contenu_json?.client_roles) {
      return contrat.contenu_json.client_roles.slice(0, 5);
    }
    
    return parties.slice(0, 5); // Max 5 parties
  };

  // Fonction pour sauvegarder les informations
  const saveInfo = async () => {
    if (!contrat || !user) return;
    
    // Variable pour tracker si on utilise l'IA
    let usedAI = false;
    
    // Validation : vérifier qu'un même client n'est pas assigné à plusieurs parties
    if (Object.keys(editedPartiesClients).length > 1) {
      const assignedClients = Object.values(editedPartiesClients).filter(id => id && id !== 'none');
      const uniqueClients = new Set(assignedClients);
      
      if (assignedClients.length !== uniqueClients.size) {
        toast.error("Un même client ne peut pas être assigné à plusieurs parties");
        return;
      }
    }
    
    try {
      let updatedContent = contrat.content || '';
      
      // Vérifier si les parties_clients ont changé
      const originalPartiesClients = contrat.parties_clients || {};
      const partiesClientsChanged = JSON.stringify(originalPartiesClients) !== JSON.stringify(editedPartiesClients);
      
      // Vérifier si on doit appeler l'IA : 
      // - Les clients des parties ont CHANGÉ
      // - ET il y a des clients assignés
      // - ET il y a des [À COMPLÉTER] à remplir
      const hasAssignedClients = Object.keys(editedPartiesClients).length > 0 && 
                                 Object.values(editedPartiesClients).some(id => id && id !== 'none');
      const needsAICompletion = partiesClientsChanged && hasAssignedClients && updatedContent.includes('[À COMPLÉTER]');
      
      // Afficher l'overlay de chargement UNIQUEMENT si l'IA doit intervenir
      if (needsAICompletion) {
        usedAI = true;
        setIsSaving(true);
        setSavingProgress(0);
        setWaitingProgress(null);
        
        // Générer un nombre aléatoire entre 70 et 90 pour l'attente
        const randomWaitingTarget = Math.floor(Math.random() * 21) + 70; // 70-90
        
        // Étape 1 : Validation (10%)
        setSavingProgress(10);
        
        // Étape 2 : Préparation (20%)
        setSavingProgress(20);
        
        console.log('🤖 Appel de l\'IA pour compléter le contrat avec les clients assignés...');
        
        // Étape 3 : Préparation infos clients (30%)
        setSavingProgress(30);
        
        // Préparer les infos clients pour chaque partie
        const partiesClientsInfo: Record<string, any> = {};
        
        for (const [partyName, clientId] of Object.entries(editedPartiesClients)) {
          if (clientId && clientId !== 'none') {
            const clientInfo = getClientInfo(clientId, clients);
            if (clientInfo) {
              partiesClientsInfo[partyName] = clientInfo;
            }
          }
        }
        
        // Étape 4 : Appel IA - Définir la cible d'attente
        setSavingProgress(40);
        setWaitingProgress(randomWaitingTarget); // La barre s'arrêtera ici
        
        // Appeler l'Edge Function pour compléter avec l'IA
        try {
          const { data: functionData, error: functionError } = await supabase.functions.invoke(
            'complete-contract-with-clients',
            {
              body: {
                contractContent: updatedContent,
                partiesClients: partiesClientsInfo,
              }
            }
          );
          
          if (functionError) {
            console.error('❌ Erreur Edge Function:', functionError);
            toast.error("Erreur lors de la complétion automatique du contrat");
            // Continuer quand même pour sauvegarder
          } else if (functionData?.completedContract) {
            updatedContent = functionData.completedContract;
            console.log('✅ Contrat complété par l\'IA');
          }
          
          // Étape 5 : IA terminée - Retirer le waitingProgress et continuer jusqu'à 100
          setWaitingProgress(null);
          setSavingProgress(randomWaitingTarget); // Partir de là où on s'est arrêté
          
        } catch (aiError: any) {
          console.error('❌ Erreur appel IA:', aiError);
          toast.error("Impossible de compléter automatiquement le contrat");
          // Continuer quand même pour sauvegarder
          setWaitingProgress(null);
          setSavingProgress(randomWaitingTarget);
        }
        
        // Étape 6 : Sauvegarde en base (85%)
        setSavingProgress(85);
      }
      
      // Sauvegarder dans la base de données
      const { error } = await supabase
        .from('contrats')
        .update({
          name: editedName,
          category: editedCategory || null,
          type: editedType || null,
          description: editedDescription || null,
          client_id: editedClientId === 'none' ? null : (editedClientId || null),
          parties_clients: Object.keys(editedPartiesClients).length > 0 ? editedPartiesClients : null,
          content: updatedContent
        })
        .eq('id', contrat.id);

      if (error) throw error;

      // Mettre à jour l'état local avec les nouvelles valeurs
      const updatedContrat = {
        ...contrat,
        name: editedName,
        category: editedCategory || null,
        type: editedType || null,
        description: editedDescription || null,
        client_id: editedClientId === 'none' ? null : (editedClientId || null),
        parties_clients: Object.keys(editedPartiesClients).length > 0 ? editedPartiesClients : null,
        content: updatedContent
      };
      
      setContrat(updatedContrat);
      
      // Recalculer les parties pour l'affichage
      if (updatedContrat.contenu_json?.client_roles && Array.isArray(updatedContrat.contenu_json.client_roles)) {
        setContractParties(updatedContrat.contenu_json.client_roles.slice(0, 5));
      } else if (updatedContent) {
        const parties = detectContractParties(updatedContent);
        setContractParties(parties);
      }
      
      // Si on a utilisé l'IA, finaliser la progression
      if (needsAICompletion) {
        // Étape 7 : Finalisation (100%)
        setSavingProgress(100);
      }
      
      setEditingInfo(false);
      toast.success("Informations mises à jour");
      
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      // Reset uniquement si l'overlay était actif
      if (usedAI) {
        setTimeout(() => {
          setIsSaving(false);
          setSavingProgress(0);
          setDisplayedProgress(0);
          setWaitingProgress(null);
        }, 500);
      }
    }
  };

  // Fonction pour annuler l'édition des informations
  const cancelEditingInfo = () => {
    setEditingInfo(false);
  };

  // Fonction pour commencer l'édition du contenu
  const startEditingContent = () => {
    if (!contrat) return;
    setEditedContent(contrat.content || "");
    setEditingContent(true);
  };

  // Fonction pour sauvegarder le contenu
  const saveContent = async () => {
    if (!contrat || !user) return;
    
    try {
      const { error } = await supabase
        .from('contrats')
        .update({ content: editedContent })
        .eq('id', contrat.id);

      if (error) throw error;

      // Mettre à jour l'état local
      setContrat({ ...contrat, content: editedContent });
      
      setEditingContent(false);
      toast.success("Contenu mis à jour");
      
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  // Fonction pour annuler l'édition du contenu
  const cancelEditingContent = () => {
    setEditingContent(false);
  };

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user || !id) return;
      setLoading(true);

      // Charger les clients pour la régénération
      // Charger TOUS les clients accessibles (propres + partagés dans le cabinet)
      try {
        const { data: clientsData } = await supabase
          .from('clients')
          .select('*')
          .eq('role', role)
          .order('nom', { ascending: true });
        
        if (clientsData && mounted) {
          setClients(clientsData);
        }
      } catch (error) {
        console.error('Erreur chargement clients:', error);
      }

      // Try loading as owner first
      const { data: cData, error } = await supabase
        .from('contrats')
        .select('id,name,category,type,created_at,description,content,contenu_json,client_id,parties_clients')
        .eq('owner_id', user.id)
        .eq('role', role)
        .eq('id', id)
        .maybeSingle();

      if (!error && cData && mounted) {
        const loadedContrat = cData as Contrat;
        setContrat(loadedContrat);
        setIsOwner(true); // C'est bien le propriétaire
        
        // Détecter les parties dès le chargement
        if (loadedContrat.contenu_json?.client_roles && Array.isArray(loadedContrat.contenu_json.client_roles)) {
          setContractParties(loadedContrat.contenu_json.client_roles.slice(0, 5));
        } else if (loadedContrat.content) {
          const parties = detectContractParties(loadedContrat.content);
          setContractParties(parties);
        }
      } else {
        // Fallback: maybe this contract was shared to the cabinet. Try cabinet_contrats (visible to active members)
        try {
          const { data: shared, error: sErr } = await supabase
            .from('cabinet_contrats')
            .select('id, contrat_id, title, description, category, contrat_type, shared_by, shared_at')
            .or(`contrat_id.eq.${id},id.eq.${id}`)
            .maybeSingle();

          if (!sErr && shared && mounted) {
            // Si on a un contrat_id, charger le contrat original pour obtenir le contenu
            if (shared.contrat_id) {
              const { data: originalContrat, error: origErr } = await supabase
                .from('contrats')
                .select('id, name, category, type, description, content, created_at, contenu_json, client_id, parties_clients')
                .eq('id', shared.contrat_id)
                .maybeSingle();

              if (!origErr && originalContrat && mounted) {
                const loadedContrat = originalContrat as Contrat;
                setContrat(loadedContrat);
                
                // Détecter les parties dès le chargement (contrat partagé)
                if (loadedContrat.contenu_json?.client_roles && Array.isArray(loadedContrat.contenu_json.client_roles)) {
                  setContractParties(loadedContrat.contenu_json.client_roles.slice(0, 5));
                } else if (loadedContrat.content) {
                  const parties = detectContractParties(loadedContrat.content);
                  setContractParties(parties);
                }
              } else {
                // Fallback si le contrat original n'existe plus
                setContrat({
                  id: shared.id,
                  name: shared.title,
                  category: shared.category || null,
                  type: shared.contrat_type || null,
                  description: shared.description || null,
                  created_at: shared.shared_at || null,
                });
              }
            } else {
              // Pas de contrat_id, utiliser les données de cabinet_contrats
              setContrat({
                id: shared.id,
                name: shared.title,
                category: shared.category || null,
                type: shared.contrat_type || null,
                description: shared.description || null,
                created_at: shared.shared_at || null,
              });
            }

            // Fetch sharer name if possible
            try {
              if (shared.shared_by) {
                setSharedById(shared.shared_by);
                setIsOwner(shared.shared_by === user.id); // Vérifier si l'utilisateur actuel est le créateur
                const { data: p } = await supabase.from('profiles').select('full_name,nom').eq('id', shared.shared_by).maybeSingle();
                if (p) setSharedBy(p.full_name || p.nom || null);
              }
            } catch (e) {
              // ignore
            }
          }
        } catch (e) {
          // ignore fallback errors
        }
      }

      if (mounted) setLoading(false);
    }
    load();
    return () => { mounted = false };
  }, [user, id, role]);

  const goBack = () => {
    navigate(-1);
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className={role === 'notaire' ? 'hover:bg-orange-100 hover:text-orange-600' : 'hover:bg-blue-100 hover:text-blue-600'}
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{role === 'notaire' ? 'Acte' : 'Contrat'}</h1>
            {contrat?.name && <p className="text-gray-600 mt-1">{contrat.name}</p>}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[300px] border border-dashed border-border rounded-lg">
            <p className="text-gray-600">Chargement…</p>
          </div>
        ) : !contrat ? (
          <div className="text-gray-600">Contrat introuvable.</div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>1. Informations du contrat</CardTitle>
                {isOwner && !editingInfo ? (
                  <Button 
                    onClick={startEditingInfo} 
                    size="sm"
                    className={`gap-2 text-white ${
                      role === 'notaire' 
                        ? 'bg-orange-600 hover:bg-orange-700' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    <Edit className="h-4 w-4" />
                    Modifier
                  </Button>
                ) : isOwner && editingInfo ? (
                  <div className="flex gap-2">
                    <Button 
                      onClick={saveInfo} 
                      size="sm"
                      className={`gap-2 text-white ${
                        role === 'notaire' 
                          ? 'bg-orange-600 hover:bg-orange-700' 
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      <Save className="h-4 w-4" />
                      Enregistrer
                    </Button>
                    <Button 
                      onClick={cancelEditingInfo} 
                      size="sm"
                      className="gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700"
                    >
                      <X className="h-4 w-4" />
                      Annuler
                    </Button>
                  </div>
                ) : null}
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!editingInfo ? (
                  <>
                    <div>
                      <div className="text-sm text-gray-600">Nom</div>
                      <div className="font-medium">{contrat.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Catégorie</div>
                      <Badge variant="outline" className={role === 'notaire' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
                        {contrat.category || '—'}
                      </Badge>
                    </div>
                    
                    {/* Affichage clients assignés par partie */}
                    {contractParties.length > 0 ? (
                      <div className="md:col-span-2">
                        <div className="text-sm text-gray-600 mb-2">Clients assignés</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {contractParties.map((party, index) => {
                            const assignedClientId = contrat.parties_clients?.[party];
                            const client = assignedClientId ? clients.find(c => c.id === assignedClientId) : null;
                            return (
                              <div key={index} className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200">
                                <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                                  👤 {party}
                                </div>
                                <div className="font-medium">
                                  {client ? `${client.prenom || ''} ${client.nom || ''} ${client.email ? `(${client.email})` : ''}`.trim() : '— Non assigné —'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm text-gray-600">Client assigné</div>
                        <div className="font-medium">
                          {contrat.client_id ? (
                            (() => {
                              const client = clients.find(c => c.id === contrat.client_id);
                              return client ? `${client.nom}${client.prenom ? ' ' + client.prenom : ''}` : '—';
                            })()
                          ) : '—'}
                        </div>
                      </div>
                    )}
                    
                    <div className="md:col-span-2">
                      <div className="text-sm text-gray-600">Type</div>
                      <div className="font-medium">{contrat.type || '—'}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-sm text-gray-600">Description</div>
                      <div className="font-medium whitespace-pre-wrap">{contrat.description || '—'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Créé le</div>
                      <div className="font-medium">{contrat.created_at ? new Date(contrat.created_at).toLocaleDateString() : '—'}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="md:col-span-2">
                      <label className="text-sm text-gray-600">Nom *</label>
                      <Input 
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        placeholder="Nom du contrat"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Catégorie</label>
                      <Input 
                        value={editedCategory}
                        onChange={(e) => setEditedCategory(e.target.value)}
                        placeholder="Catégorie"
                        className="mt-1"
                      />
                    </div>
                    
                    {/* Section clients par partie */}
                    {contractParties.length > 0 ? (
                      <div className="md:col-span-2 space-y-3">
                        <label className="text-sm font-semibold text-gray-700">Clients assignés par partie</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          {contractParties.map((party, index) => {
                            // Filtrer les clients déjà assignés à d'autres parties
                            const assignedClientIds = Object.entries(editedPartiesClients)
                              .filter(([p, _]) => p !== party)
                              .map(([_, clientId]) => clientId)
                              .filter(Boolean);
                            
                            const availableClients = clients.filter(
                              client => !assignedClientIds.includes(client.id)
                            );
                            
                            return (
                              <div key={index}>
                                <label className="text-sm text-gray-600 mb-1 block">
                                  👤 {party}
                                </label>
                                <Select 
                                  value={editedPartiesClients[party] || "none"} 
                                  onValueChange={(value) => {
                                    setEditedPartiesClients(prev => ({
                                      ...prev,
                                      [party]: value === 'none' ? '' : value
                                    }));
                                  }}
                                >
                                  <SelectTrigger className="bg-white dark:bg-gray-900">
                                    <SelectValue placeholder="Sélectionner un client" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">— Aucun client —</SelectItem>
                                    {availableClients.map(client => (
                                      <SelectItem key={client.id} value={client.id}>
                                        {client.prenom || ''} {client.nom || ''} {client.email && `(${client.email})`}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      // Ancien système (rétro-compatibilité)
                      <div>
                        <label className="text-sm text-gray-600">Client assigné</label>
                        <Select value={editedClientId || "none"} onValueChange={setEditedClientId}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Sélectionner un client" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— Aucun client —</SelectItem>
                            {clients.map(client => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.nom} {client.prenom || ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm text-gray-600">Type</label>
                      <Input 
                        value={editedType}
                        onChange={(e) => setEditedType(e.target.value)}
                        placeholder="Type de contrat"
                        className="mt-1"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm text-gray-600">Description</label>
                      <Textarea 
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        placeholder="Description du contrat"
                        className="mt-1 min-h-[100px]"
                      />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Créé le</div>
                      <div className="font-medium">{contrat.created_at ? new Date(contrat.created_at).toLocaleDateString() : '—'}</div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {contrat.content && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle>2. Contenu du contrat</CardTitle>
                  {isOwner && (
                    <div className="flex gap-2">
                      {!editingContent && (
                        <>
                          <Button 
                            onClick={handleCopyText}
                            size="sm"
                            variant="outline"
                            className={`gap-2 ${
                              role === 'notaire' 
                                ? 'border-orange-300 text-orange-700 hover:bg-orange-50' 
                                : 'border-blue-300 text-blue-700 hover:bg-blue-50'
                            }`}
                          >
                            <Copy className="h-4 w-4" />
                            Copier
                          </Button>
                          <Button 
                            onClick={handleSignContract}
                            size="sm"
                            variant="outline"
                            className={`gap-2 ${
                              role === 'notaire' 
                                ? 'border-orange-300 text-orange-700 hover:bg-orange-50' 
                                : 'border-blue-300 text-blue-700 hover:bg-blue-50'
                            }`}
                          >
                            <PenTool className="h-4 w-4" />
                            Signer
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                disabled={generatingPdf}
                                size="sm"
                                className={`gap-2 text-white ${
                                  role === 'notaire' 
                                    ? 'bg-orange-600 hover:bg-orange-700' 
                                    : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                              >
                                {generatingPdf ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <FileDown className="h-4 w-4" />
                                )}
                                {generatingPdf ? 'Génération...' : 'Exporter'}
                                {!generatingPdf && <ChevronDown className="h-4 w-4 ml-1" />}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={handleSavePdf}>
                                <Upload className="mr-2 h-4 w-4" />
                                Enregistrer sur l'espace
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={handleDownloadPdf}>
                                <FileDown className="mr-2 h-4 w-4" />
                                Télécharger sur l'ordinateur
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button 
                            onClick={startEditingContent} 
                            size="sm"
                            className={`gap-2 text-white ${
                              role === 'notaire' 
                                ? 'bg-orange-600 hover:bg-orange-700' 
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                          >
                            <Edit className="h-4 w-4" />
                            Modifier
                          </Button>
                        </>
                      )}
                      {editingContent ? (
                        <>
                          <Button 
                            onClick={saveContent} 
                            size="sm"
                            className={`gap-2 text-white ${
                              role === 'notaire' 
                                ? 'bg-orange-600 hover:bg-orange-700' 
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                          >
                            <Save className="h-4 w-4" />
                            Enregistrer
                          </Button>
                          <Button 
                            onClick={cancelEditingContent} 
                            size="sm"
                            className="gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700"
                          >
                            <X className="h-4 w-4" />
                            Annuler
                        </Button>
                      </>
                    ) : null}
                  </div>
                )}
                </CardHeader>
                <CardContent>
                  {!editingContent ? (
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap bg-gray-50 p-6 rounded-lg border">
                      {contrat.content}
                    </div>
                  ) : (
                    <Textarea 
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      placeholder="Contenu du contrat"
                      className="min-h-[500px] font-mono text-sm"
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {sharedBy && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    Partagé
                    {!isOwner && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
                        📖 Lecture seule
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    Partagé par <span className="font-medium">{sharedBy}</span>
                    {!isOwner && (
                      <p className="text-xs text-gray-600 mt-2">
                        Vous pouvez consulter ce contrat mais seul le créateur peut le modifier.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
      
      {/* Overlay de chargement pour la sauvegarde */}
      {isSaving && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 shadow-2xl max-w-md w-full mx-4">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <RefreshCw className="h-12 w-12 text-blue-600 animate-spin" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Synchronisation en cours</h3>
              <p className="text-gray-600">
                {displayedProgress < 30 && "Validation des données..."}
                {displayedProgress >= 30 && displayedProgress < 40 && "Préparation des informations..."}
                {displayedProgress >= 40 && displayedProgress < 70 && "Complétion intelligente du contrat..."}
                {displayedProgress >= 70 && displayedProgress < 85 && "Traitement final..."}
                {displayedProgress >= 85 && "Sauvegarde en cours..."}
              </p>
              
              {/* Barre de progression réelle */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-150 ease-linear" 
                  style={{ width: `${displayedProgress}%` }}
                />
              </div>
              
              <p className="text-sm font-medium text-blue-600">{displayedProgress}%</p>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
