import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, RefreshCw, Edit, Save, X, FileEdit } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { generateContractWithAI, getClientInfo } from "@/lib/contractAIHelper";

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
  const [clients, setClients] = useState<any[]>([]);
  
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
      
      // Si on utilise le système multi-parties
      if (Object.keys(editedPartiesClients).length > 0) {
        // ÉTAPE 1 : Remplacer les anciennes infos clients par les nouvelles (si le client a changé)
        const oldPartiesClients = contrat.parties_clients || {};
        
        for (const [partyName, newClientId] of Object.entries(editedPartiesClients)) {
          const oldClientId = oldPartiesClients[partyName];
          
          // Si le client a changé et qu'il y avait un ancien client
          if (oldClientId && oldClientId !== newClientId && newClientId) {
            const oldClientInfo = getClientInfo(oldClientId, clients);
            const newClientInfo = getClientInfo(newClientId, clients);
            
            if (oldClientInfo && newClientInfo) {
              // Remplacer les anciennes valeurs par les nouvelles
              if (oldClientInfo.nom && newClientInfo.nom) {
                const oldFullName = `${oldClientInfo.prenom || ''} ${oldClientInfo.nom}`.trim();
                const newFullName = `${newClientInfo.prenom || ''} ${newClientInfo.nom}`.trim();
                updatedContent = updatedContent.replace(new RegExp(oldFullName, 'g'), newFullName);
              }
              
              if (oldClientInfo.adresse && newClientInfo.adresse) {
                updatedContent = updatedContent.replace(new RegExp(oldClientInfo.adresse, 'g'), newClientInfo.adresse);
              }
              
              if (oldClientInfo.date_naissance && newClientInfo.date_naissance) {
                updatedContent = updatedContent.replace(new RegExp(oldClientInfo.date_naissance, 'g'), newClientInfo.date_naissance);
              }
              
              if (oldClientInfo.nationalite && newClientInfo.nationalite) {
                updatedContent = updatedContent.replace(new RegExp(oldClientInfo.nationalite, 'g'), newClientInfo.nationalite);
              }
              
              if (oldClientInfo.telephone && newClientInfo.telephone) {
                updatedContent = updatedContent.replace(new RegExp(oldClientInfo.telephone, 'g'), newClientInfo.telephone);
              }
              
              if (oldClientInfo.email && newClientInfo.email) {
                updatedContent = updatedContent.replace(new RegExp(oldClientInfo.email, 'g'), newClientInfo.email);
              }
              
              if (oldClientInfo.profession && newClientInfo.profession) {
                updatedContent = updatedContent.replace(new RegExp(oldClientInfo.profession, 'g'), newClientInfo.profession);
              }
            }
          }
        }
        
        // ÉTAPE 2 : Remplacer les [À COMPLÉTER] restants
        updatedContent = updatedContent.replace(/\[À COMPLÉTER\]/g, (match, offset) => {
          // Chercher dans les 1500 caractères avant le placeholder (contexte élargi)
          const contextBefore = updatedContent.substring(Math.max(0, offset - 1500), offset);
          
          // Trouver quelle partie est mentionnée en dernier (la plus proche)
          let selectedClientId: string | null = null;
          let selectedPartyName: string | null = null;
          let lastMentionPosition = -1;
          
          for (const [partyName, clientId] of Object.entries(editedPartiesClients)) {
            if (!clientId) continue;
            
            const partyLower = partyName.toLowerCase();
            const contextLower = contextBefore.toLowerCase();
            const position = contextLower.lastIndexOf(partyLower);
            
            if (position > lastMentionPosition) {
              lastMentionPosition = position;
              selectedClientId = clientId;
              selectedPartyName = partyName;
            }
          }
          
          // Si aucune partie trouvée dans le contexte, on garde [À COMPLÉTER]
          if (!selectedClientId) {
            console.log('⚠️ Aucune partie détectée pour ce [À COMPLÉTER] - conservation du placeholder');
            return '[À COMPLÉTER]';
          }
          
          const clientInfo = getClientInfo(selectedClientId, clients);
          if (!clientInfo) {
            console.log(`⚠️ Client non trouvé pour ${selectedPartyName} - conservation du placeholder`);
            return '[À COMPLÉTER]';
          }
          
          console.log(`✅ Remplacement pour ${selectedPartyName} avec client ${clientInfo.prenom} ${clientInfo.nom}`);
          
          // Analyser les 200 caractères juste avant pour savoir quel champ mettre
          const immediateContext = updatedContent.substring(Math.max(0, offset - 200), offset);
          
          // PATTERNS TRÈS SPÉCIFIQUES - ordre important!
          
          // 1. Date de naissance (doit être AVANT les autres patterns "né")
          if (immediateContext.match(/né\s*\(?\s*e?\s*\)?\s*le\s*$/i)) {
            return clientInfo.date_naissance || '[À COMPLÉTER]';
          }
          
          // 2. Lieu de naissance (après "à" qui suit "né")
          if (immediateContext.match(/né.*à\s*$/i)) {
            return clientInfo.lieu_naissance || '[À COMPLÉTER]';
          }
          
          // 3. Nationalité
          if (immediateContext.match(/(?:de\s+)?nationalité\s*$/i)) {
            return clientInfo.nationalite || '[À COMPLÉTER]';
          }
          
          // 4. Adresse / domicile
          if (immediateContext.match(/(?:demeurant|domicilié|sise?)\s+(?:à|au)?\s*$/i)) {
            return clientInfo.adresse || '[À COMPLÉTER]';
          }
          if (immediateContext.match(/(?:^|[^a-zà-ÿ])adresse\s*:?\s*$/i)) {
            return clientInfo.adresse || '[À COMPLÉTER]';
          }
          
          // 5. Code postal / Ville / Pays
          if (immediateContext.match(/code\s*postal\s*:?\s*$/i)) {
            return clientInfo.code_postal || '[À COMPLÉTER]';
          }
          if (immediateContext.match(/\bville\s*:?\s*$/i)) {
            return clientInfo.ville || '[À COMPLÉTER]';
          }
          if (immediateContext.match(/\bpays\s*:?\s*$/i)) {
            return clientInfo.pays || '[À COMPLÉTER]';
          }
          
          // 6. Contact
          if (immediateContext.match(/(?:téléphone|tél\.?|portable|mobile)\s*:?\s*$/i)) {
            return clientInfo.telephone || '[À COMPLÉTER]';
          }
          if (immediateContext.match(/(?:e-?mail|courriel)\s*:?\s*$/i)) {
            return clientInfo.email || '[À COMPLÉTER]';
          }
          
          // 7. Sexe / Genre
          if (immediateContext.match(/(?:sexe|genre)\s*:?\s*$/i)) {
            return clientInfo.sexe || '[À COMPLÉTER]';
          }
          
          // 8. État civil / Situation matrimoniale
          if (immediateContext.match(/(?:état|etat)\s+civil\s*:?\s*$/i)) {
            return clientInfo.etat_civil || '[À COMPLÉTER]';
          }
          if (immediateContext.match(/(?:régime|regime)\s+matrimonial\s*:?\s*$/i)) {
            return clientInfo.situation_matrimoniale || '[À COMPLÉTER]';
          }
          if (immediateContext.match(/situation\s+matrimoniale\s*:?\s*$/i)) {
            return clientInfo.situation_matrimoniale || '[À COMPLÉTER]';
          }
          
          // 9. Pièce d'identité
          if (immediateContext.match(/type\s+(?:de\s+)?(?:pièce|piece)\s+(?:d')?identité\s*:?\s*$/i)) {
            return clientInfo.type_identite || '[À COMPLÉTER]';
          }
          if (immediateContext.match(/numéro\s+(?:de\s+)?(?:pièce|piece)\s*:?\s*$/i)) {
            return clientInfo.numero_identite || '[À COMPLÉTER]';
          }
          if (immediateContext.match(/(?:délivr|delivr|expir).*le\s*$/i)) {
            return clientInfo.date_expiration_identite || '[À COMPLÉTER]';
          }
          
          // 10. Profession/qualité
          if (immediateContext.match(/(?:profession|qualité|activité|fonction)\s+(?:de\s+)?$/i)) {
            return clientInfo.profession || '[À COMPLÉTER]';
          }
          if (immediateContext.match(/employeur\s*:?\s*$/i)) {
            return clientInfo.employeur || '[À COMPLÉTER]';
          }
          if (immediateContext.match(/adresse\s+professionnelle\s*:?\s*$/i)) {
            return clientInfo.adresse_professionnelle || '[À COMPLÉTER]';
          }
          
          // 11. Nom de naissance
          if (immediateContext.match(/nom\s+de\s+naissance\s*:?\s*$/i)) {
            return clientInfo.nom_naissance || '[À COMPLÉTER]';
          }
          
          // 12. Prénom seul
          if (immediateContext.match(/prénom\s*:?\s*$/i)) {
            return clientInfo.prenom || '[À COMPLÉTER]';
          }
          
          // 13. Nom seul (mais PAS dans "dénommé" ni "nom de naissance")
          if (immediateContext.match(/\bnom\s*:?\s*$/i) && !immediateContext.match(/dénomm|naissance/i)) {
            return clientInfo.nom || '[À COMPLÉTER]';
          }
          
          // 14. Nom complet (représenté par, dénommé, etc.)
          if (immediateContext.match(/(?:représent|dénomm|désign|soussign|ci-après)\w*\s*$/i)) {
            const fullName = `${clientInfo.prenom || ''} ${clientInfo.nom || ''}`.trim();
            return fullName || '[À COMPLÉTER]';
          }
          
          // 15. Société
          if (immediateContext.match(/(?:société|entreprise|raison\s+sociale)\s*$/i)) {
            return clientInfo.nom_entreprise || clientInfo.nom || '[À COMPLÉTER]';
          }
          if (immediateContext.match(/siret\s*:?\s*$/i)) {
            return clientInfo.siret || '[À COMPLÉTER]';
          }
          if (immediateContext.match(/(?:immatricul|rcs)\s*$/i)) {
            return clientInfo.ville_rcs || '[À COMPLÉTER]';
          }
          
          // Fallback : si on ne sait pas quel champ, mettre le nom complet ou garder [À COMPLÉTER]
          const fullName = `${clientInfo.prenom || ''} ${clientInfo.nom || ''}`.trim();
          return fullName || '[À COMPLÉTER]';
        });
      }
      // Ancien système avec client_id unique (rétro-compatibilité)
      else if (editedClientId && editedClientId !== 'none') {
        const clientInfo = getClientInfo(editedClientId, clients);
        if (clientInfo) {
          updatedContent = updatedContent.replace(/\[À COMPLÉTER\]/g, (match, offset, string) => {
            const before = string.substring(Math.max(0, offset - 50), offset).toLowerCase();
            
            if (before.includes('nom')) {
              return `${clientInfo.prenom || ''} ${clientInfo.nom || ''}`.trim() || match;
            }
            if (before.includes('adresse') || before.includes('domicilié')) {
              return clientInfo.adresse || match;
            }
            if (before.includes('né le') || before.includes('naissance')) {
              return clientInfo.date_naissance || match;
            }
            if (before.includes('nationalité')) {
              return clientInfo.nationalite || match;
            }
            if (before.includes('téléphone')) {
              return clientInfo.telephone || match;
            }
            if (before.includes('email')) {
              return clientInfo.email || match;
            }
            if (before.includes('profession')) {
              return clientInfo.profession || match;
            }
            
            return match;
          });
        }
      }
      
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
      
      setEditingInfo(false);
      toast.success("Informations mises à jour");
      
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      toast.error("Erreur lors de la sauvegarde");
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
    </AppLayout>
  );
}
