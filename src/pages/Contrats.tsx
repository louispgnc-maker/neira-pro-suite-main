import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Eye, Search, MoreHorizontal, Trash2, Plus, ArrowRight, Upload } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { NOTAIRE_CONTRACT_CATEGORIES } from "@/components/dashboard/ContractSelectorNotaire";
import { AVOCAT_CONTRACT_CATEGORIES } from "@/components/dashboard/ContractSelectorAvocat";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { ShareToCollaborativeDialog } from "@/components/cabinet/ShareToCollaborativeDialog";

type ContratRow = {
  id: string;
  name: string;
  category: string;
  type: string;
  created_at: string;
  updated_at: string;
};

// Catégories filtrage dynamiques selon le rôle
const categoriesNotaire = [
  "Tous",
  "Immobilier",
  "Famille & Patrimoine",
  "Succession",
  "Procurations & Actes divers"
];

const categoriesAvocat = [
  "Tous",
  "Droit des affaires / Commercial",
  "Droit du travail",
  "Droit immobilier",
  "Droit civil / Vie privée",
  "Propriété intellectuelle & Numérique",
];

export default function Contrats() {
  const { user } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [contrats, setContrats] = useState<ContratRow[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Tous");
  const [debounced, setDebounced] = useState("");

  // Dialog questionnaire pour compromis de vente
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [pendingContractType, setPendingContractType] = useState<string>("");
  const [pendingCategory, setPendingCategory] = useState<string>("");
  const [clients, setClients] = useState<Array<{id: string, nom: string, prenom: string, adresse: string}>>([]);
  const [questionnaireData, setQuestionnaireData] = useState({
    // Type de contrat
    typeContrat: "", // "compromis" ou "promesse_unilaterale"
    
    // Informations sur le bien
    adresseBien: "",
    typeBien: "",
    surfaceHabitable: "",
    nombrePieces: "",
    naturePropriete: "", // Pleine propriété / Usufruit / Nue-propriété / Indivision
    bienCopropriete: "", // Oui / Non
    numeroLot: "",
    tantièmes: "",
    occupationBien: "", // Libre / Occupé par le vendeur / Occupé par un locataire / Bail en cours
    servitudesConnues: "", // Oui / Non
    descriptionServitudes: "",
    bienLibre: "", // Oui / Non
    
    // Client et son rôle
    clientId: "",
    clientRole: "", // "acheteur" ou "vendeur"
    
    // Statut matrimonial client
    statutMatrimonialClient: "", // Célibataire / Marié / Pacsé / Divorcé / Veuf
    regimeMatrimonialClient: "", // Communauté légale / Séparation de biens / Autre
    precisionRegimeClient: "",
    
    // Informations autre partie (saisie manuelle)
    nomAutrePartie: "",
    prenomAutrePartie: "",
    adresseAutrePartie: "",
    
    // Statut matrimonial autre partie
    statutMatrimonialAutrePartie: "",
    regimeMatrimonialAutrePartie: "",
    precisionRegimeAutrePartie: "",
    
    // Conditions financières
    prixVente: "",
    depotGarantie: "",
    modalitesPaiement: "",
    
    // Conditions suspensives - Prêt immobilier
    conditionPret: "", // Oui / Non
    montantPret: "",
    dureePret: "",
    tauxInteretMax: "",
    delaiAccordPret: "",
    
    // Conditions suspensives - Autres
    conditionDiagnostics: "",
    autresConditions: "",
    
    // Droit de préemption
    droitPreemptionUrbain: "", // Oui / Non / Inconnu
    locatairePreemption: "", // Oui / Non
    
    // Délais
    dateSignatureActeDefinitif: "",
    delaiReflexion: "",
    
    // Promesse unilatérale spécifique
    dureeOption: "",
    dateLimiteOption: "",
    indemniteImmobilisation: "",
    
    // Informations complémentaires
    chargesCopropriete: "",
    travauxAPrevenir: "",
    autresInformations: "",
  });

  const navigate = useNavigate();

  // debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Détecte le rôle depuis l'URL
  let role: 'avocat' | 'notaire' = 'avocat';
  if (location.pathname.includes('/notaires')) role = 'notaire';
  if (location.pathname.includes('/avocats')) role = 'avocat';

  const mainButtonColor = role === 'notaire'
    ? 'bg-orange-600 hover:bg-orange-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  // Role-based menu/select styling
  const menuContentClass = role === 'notaire' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200';
  const menuItemClass = role === 'notaire' ? 'focus:bg-orange-600 focus:text-white hover:bg-orange-600 hover:text-white' : 'focus:bg-blue-600 focus:text-white hover:bg-blue-600 hover:text-white';
  const selectContentClass = role === 'notaire' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200';
  const selectItemClass = role === 'notaire' ? 'cursor-pointer hover:bg-orange-600 hover:text-white' : 'cursor-pointer hover:bg-blue-600 hover:text-white';

  // Charger les clients
  useEffect(() => {
    let isMounted = true;
    async function loadClients() {
      if (!user) return;
      const { data, error } = await supabase
        .from('clients')
        .select('id, nom, prenom, adresse, telephone, email, date_naissance, lieu_naissance, nationalite, profession')
        .eq('owner_id', user.id)
        .eq('role', role)
        .order('nom', { ascending: true });
      
      if (error) {
        console.error('Erreur chargement clients:', error);
      } else if (isMounted && data) {
        setClients(data);
      }
    }
    loadClients();
    return () => { isMounted = false; };
  }, [user, role]);

  // Pré-remplir les informations du client sélectionné
  useEffect(() => {
    if (questionnaireData.clientId && clients.length > 0) {
      const selectedClient = clients.find(c => c.id === questionnaireData.clientId);
      if (selectedClient) {
        // Les informations du client sont déjà affichées via la sélection
        // Pas besoin de modifier questionnaireData ici car les infos sont récupérées dans handleQuestionnaireSubmit
      }
    }
  }, [questionnaireData.clientId, clients]);

  // Détecter les paramètres URL pour ouvrir le questionnaire automatiquement
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldCreate = params.get('create') === 'true';
    const type = params.get('type');
    const category = params.get('category');
    
    if (shouldCreate && type && category) {
      setPendingContractType(type);
      setPendingCategory(category);
      setShowQuestionDialog(true);
      
      // Nettoyer l'URL
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location]);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!user) {
        setContrats([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      let query = supabase
        .from('contrats')
        .select('id,name,category,type,created_at,updated_at')
        .eq('owner_id', user.id)
        .eq('role', role)
        .order('created_at', { ascending: false });
      if (debounced) {
        query = query.or(`name.ilike.%${debounced}%,type.ilike.%${debounced}%`);
      }
      if (categoryFilter && categoryFilter !== 'Tous') {
        query = query.eq('category', categoryFilter);
      }
      const { data, error } = await query;
      if (error) {
        console.error('Erreur chargement contrats:', error);
        if (isMounted) setContrats([]);
      } else if (isMounted) {
        setContrats(data as ContratRow[]);
      }
      if (isMounted) setLoading(false);
    }
    load();
    return () => { isMounted = false; };
  }, [user, role, debounced, categoryFilter]);

  const createContract = async (contractType: string, categoryKey: string) => {
    if (!user) {
      toast.error("Connexion requise");
      return;
    }
    
    // Si c'est un compromis de vente immobilier, ouvrir le questionnaire
    if (contractType === "Compromis de vente / Promesse unilatérale de vente" && categoryKey === "Immobilier") {
      setPendingContractType(contractType);
      setPendingCategory(categoryKey);
      setShowQuestionDialog(true);
      return;
    }
    
    // Si c'est un acte de vente immobilière, ouvrir le questionnaire spécifique
    if (contractType === "Acte de vente immobilière" && categoryKey === "Immobilier") {
      setPendingContractType(contractType);
      setPendingCategory(categoryKey);
      setShowQuestionDialog(true);
      return;
    }
    
    // Sinon, créer directement le contrat
    try {
      const { data, error } = await supabase
        .from('contrats')
        .insert({
          owner_id: user.id,
          name: contractType,
          type: contractType,
          category: categoryKey,
          role: role,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Contrat créé', { description: contractType });
      refreshContrats();
    } catch (err: unknown) {
      console.error('Erreur création contrat:', err);
      const message = err instanceof Error ? err.message : String(err);
      toast.error('Erreur lors de la création', { description: message });
    }
  };

  const handleQuestionnaireSubmit = async () => {
    if (!user) return;
    
    try {
      // Récupérer les infos du client sélectionné
      const selectedClient = clients.find(c => c.id === questionnaireData.clientId);
      if (!selectedClient) {
        toast.error('Veuillez sélectionner un client');
        return;
      }

      // Déterminer qui est le vendeur et qui est l'acquéreur
      const isClientAcheteur = questionnaireData.clientRole === "acheteur";
      const vendeurInfo = isClientAcheteur 
        ? {
            nom: questionnaireData.nomAutrePartie,
            prenom: questionnaireData.prenomAutrePartie,
            adresse: questionnaireData.adresseAutrePartie
          }
        : {
            nom: selectedClient.nom,
            prenom: selectedClient.prenom,
            adresse: selectedClient.adresse
          };
      
      const acquereurInfo = isClientAcheteur
        ? {
            nom: selectedClient.nom,
            prenom: selectedClient.prenom,
            adresse: selectedClient.adresse
          }
        : {
            nom: questionnaireData.nomAutrePartie,
            prenom: questionnaireData.prenomAutrePartie,
            adresse: questionnaireData.adresseAutrePartie
          };

      // Créer le contrat avec les données du questionnaire en description
      const descriptionData = `
TYPE DE CONTRAT: ${questionnaireData.typeContrat === "compromis" ? "Compromis de vente" : "Promesse unilatérale de vente"}

INFORMATIONS SUR LE BIEN:
- Adresse: ${questionnaireData.adresseBien}
- Type de bien: ${questionnaireData.typeBien}
- Surface habitable: ${questionnaireData.surfaceHabitable} m²
- Nombre de pièces: ${questionnaireData.nombrePieces}
- Nature de la propriété: ${questionnaireData.naturePropriete}
- Bien en copropriété: ${questionnaireData.bienCopropriete}
${questionnaireData.bienCopropriete === "oui" ? `- Numéro de lot: ${questionnaireData.numeroLot}\n- Tantièmes: ${questionnaireData.tantièmes}` : ''}
- Occupation du bien: ${questionnaireData.occupationBien}
- Servitudes connues: ${questionnaireData.servitudesConnues}
${questionnaireData.servitudesConnues === "oui" ? `- Description des servitudes: ${questionnaireData.descriptionServitudes}` : ''}
- Bien vendu libre de toute occupation: ${questionnaireData.bienLibre}

VENDEUR:
- Nom: ${vendeurInfo.nom}
- Prénom: ${vendeurInfo.prenom}
- Adresse: ${vendeurInfo.adresse}
- Statut matrimonial: ${isClientAcheteur ? questionnaireData.statutMatrimonialAutrePartie : questionnaireData.statutMatrimonialClient}
${(isClientAcheteur ? questionnaireData.statutMatrimonialAutrePartie : questionnaireData.statutMatrimonialClient) === "marie" || (isClientAcheteur ? questionnaireData.statutMatrimonialAutrePartie : questionnaireData.statutMatrimonialClient) === "pacse" ? `- Régime matrimonial: ${isClientAcheteur ? questionnaireData.regimeMatrimonialAutrePartie : questionnaireData.regimeMatrimonialClient}` : ''}

ACQUÉREUR:
- Nom: ${acquereurInfo.nom}
- Prénom: ${acquereurInfo.prenom}
- Adresse: ${acquereurInfo.adresse}
- Statut matrimonial: ${isClientAcheteur ? questionnaireData.statutMatrimonialClient : questionnaireData.statutMatrimonialAutrePartie}
${(isClientAcheteur ? questionnaireData.statutMatrimonialClient : questionnaireData.statutMatrimonialAutrePartie) === "marie" || (isClientAcheteur ? questionnaireData.statutMatrimonialClient : questionnaireData.statutMatrimonialAutrePartie) === "pacse" ? `- Régime matrimonial: ${isClientAcheteur ? questionnaireData.regimeMatrimonialClient : questionnaireData.regimeMatrimonialAutrePartie}` : ''}

CONDITIONS FINANCIÈRES:
- Prix de vente: ${questionnaireData.prixVente} €
- Dépôt de garantie: ${questionnaireData.depotGarantie} €
- Modalités de paiement: ${questionnaireData.modalitesPaiement}

${questionnaireData.typeContrat === "compromis" ? `
CONDITIONS SUSPENSIVES:
- Condition de prêt: ${questionnaireData.conditionPret}
${questionnaireData.conditionPret === "oui" ? `
DÉTAILS DU PRÊT IMMOBILIER:
- Montant du prêt: ${questionnaireData.montantPret} €
- Durée du prêt: ${questionnaireData.dureePret} années
- Taux d'intérêt maximal: ${questionnaireData.tauxInteretMax} %
- Délai pour accord de prêt: ${questionnaireData.delaiAccordPret}` : ''}
- Diagnostics: ${questionnaireData.conditionDiagnostics}
- Autres conditions: ${questionnaireData.autresConditions}` : ''}

DROIT DE PRÉEMPTION:
- Droit de préemption urbain: ${questionnaireData.droitPreemptionUrbain}
- Locataire avec droit de préemption: ${questionnaireData.locatairePreemption}

${questionnaireData.typeContrat === "promesse_unilaterale" ? `
PROMESSE UNILATÉRALE:
- Durée de l'option: ${questionnaireData.dureeOption} jours
- Date limite de levée d'option: ${questionnaireData.dateLimiteOption}
- Indemnité d'immobilisation: ${questionnaireData.indemniteImmobilisation}` : ''}

DÉLAIS:
- Date signature acte définitif: ${questionnaireData.dateSignatureActeDefinitif}
- Délai de réflexion: ${questionnaireData.delaiReflexion} jours

INFORMATIONS COMPLÉMENTAIRES:
- Charges de copropriété: ${questionnaireData.chargesCopropriete}
- Travaux à prévoir: ${questionnaireData.travauxAPrevenir}
- Autres informations: ${questionnaireData.autresInformations}
      `.trim();

      const { data, error } = await supabase
        .from('contrats')
        .insert({
          owner_id: user.id,
          name: pendingContractType,
          type: pendingContractType,
          category: pendingCategory,
          role: role,
          description: descriptionData,
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Contrat créé avec succès', { 
        description: 'Les informations ont été enregistrées et pourront être utilisées pour générer le document'
      });
      
      setShowQuestionDialog(false);
      // Réinitialiser le questionnaire
      setQuestionnaireData({
        typeContrat: "",
        adresseBien: "",
        typeBien: "",
        surfaceHabitable: "",
        nombrePieces: "",
        naturePropriete: "",
        bienCopropriete: "",
        numeroLot: "",
        tantièmes: "",
        occupationBien: "",
        servitudesConnues: "",
        descriptionServitudes: "",
        bienLibre: "",
        clientId: "",
        clientRole: "",
        statutMatrimonialClient: "",
        regimeMatrimonialClient: "",
        precisionRegimeClient: "",
        nomAutrePartie: "",
        prenomAutrePartie: "",
        adresseAutrePartie: "",
        statutMatrimonialAutrePartie: "",
        regimeMatrimonialAutrePartie: "",
        precisionRegimeAutrePartie: "",
        prixVente: "",
        depotGarantie: "",
        modalitesPaiement: "",
        conditionPret: "",
        montantPret: "",
        dureePret: "",
        tauxInteretMax: "",
        delaiAccordPret: "",
        conditionDiagnostics: "",
        autresConditions: "",
        droitPreemptionUrbain: "",
        locatairePreemption: "",
        dateSignatureActeDefinitif: "",
        delaiReflexion: "",
        dureeOption: "",
        dateLimiteOption: "",
        indemniteImmobilisation: "",
        chargesCopropriete: "",
        travauxAPrevenir: "",
        autresInformations: "",
      });
      
      refreshContrats();
    } catch (err: unknown) {
      console.error('Erreur création contrat:', err);
      const message = err instanceof Error ? err.message : String(err);
      toast.error('Erreur lors de la création', { description: message });
    }
  };

  const refreshContrats = () => {
    // Force un rechargement
    if (!user) return;
    supabase
      .from('contrats')
      .select('id,name,category,type,created_at,updated_at')
      .eq('owner_id', user.id)
      .eq('role', role)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('Erreur rechargement contrats:', error);
        } else {
          setContrats(data as ContratRow[]);
        }
      });
  };

  const handleDelete = async (contrat: ContratRow) => {
    if (!user) return;
    if (!confirm(`Supprimer "${contrat.name}" ?`)) return;
    
    try {
      const { error } = await supabase
        .from('contrats')
        .delete()
        .eq('id', contrat.id)
        .eq('owner_id', user.id);
      
      if (error) throw error;
      
      setContrats((prev) => prev.filter((c) => c.id !== contrat.id));
      toast.success('Contrat supprimé');
    } catch (err: unknown) {
      console.error('Erreur suppression contrat:', err);
      const message = err instanceof Error ? err.message : String(err);
      toast.error('Erreur lors de la suppression', { description: message });
    }
  };

  const handleView = (contrat: ContratRow) => {
    navigate(role === 'notaire' ? `/notaires/contrats/${contrat.id}` : `/avocats/contrats/${contrat.id}`);
  };

  // Résultats déjà filtrés côté SQL
  const filteredContrats = contrats;

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">{role === 'notaire' ? 'Actes' : 'Contrats'}</h1>
            <p className="text-foreground mt-1">
              Centralisez et créez vos modèles de contrats
            </p>
          </div>
          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className={mainButtonColor}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={menuContentClass}>
                <DropdownMenuItem className={role === 'notaire' ? 'focus:bg-orange-600 focus:text-white' : 'focus:bg-blue-600 focus:text-white'} onClick={() => window.location.href = (role === 'notaire' ? '/notaires/documents?openImport=1' : '/avocats/documents?openImport=1')}>
                  <Upload className="mr-2 h-4 w-4" />
                  Importer depuis mon appareil
                </DropdownMenuItem>

                <DropdownMenuSub>
                    <DropdownMenuSubTrigger className={role === 'notaire' ? 'font-semibold hover:bg-orange-600 hover:text-white focus:bg-orange-600 focus:text-white data-[state=open]:bg-orange-600 data-[state=open]:text-white' : 'font-semibold hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white data-[state=open]:bg-blue-600 data-[state=open]:text-white'}>Créer un contrat</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className={menuContentClass}>
                    {(role === 'notaire' ? NOTAIRE_CONTRACT_CATEGORIES : AVOCAT_CONTRACT_CATEGORIES).map((cat) => (
                      <DropdownMenuSub key={cat.key}>
                          <DropdownMenuSubTrigger className={role === 'notaire' ? 'font-semibold hover:bg-orange-600 hover:text-white focus:bg-orange-600 focus:text-white data-[state=open]:bg-orange-600 data-[state=open]:text-white' : 'font-semibold hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white data-[state=open]:bg-blue-600 data-[state=open]:text-white'}>{cat.label}</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className={menuContentClass}>
                          {cat.contracts.map((contract) => (
                            <DropdownMenuItem
                              key={contract}
                              className={role === 'notaire' ? 'cursor-pointer hover:bg-orange-600 hover:text-white focus:bg-orange-600 focus:text-white' : 'cursor-pointer hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white'}
                              onClick={() => createContract(contract, cat.key)}
                            >
                              {contract}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[400px] border border-dashed border-border rounded-lg">
            <p className="text-foreground">Chargement…</p>
          </div>
        ) : contrats.length === 0 ? (
          <div className="flex items-center justify-center h-[400px] border border-dashed border-border rounded-lg">
            <div className="text-center">
              <p className="text-foreground">Aucun contrat pour le moment</p>
              <div className="mt-4 flex justify-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className={mainButtonColor}>
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className={menuContentClass}>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className={`font-semibold ${role === 'notaire' ? 'hover:bg-orange-600 hover:text-white focus:bg-orange-600 focus:text-white' : 'hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white'}`}>Créer un contrat</DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className={menuContentClass}>
                        {(role === 'notaire' ? NOTAIRE_CONTRACT_CATEGORIES : AVOCAT_CONTRACT_CATEGORIES).map((cat) => (
                          <DropdownMenuSub key={cat.key}>
                            <DropdownMenuSubTrigger className={`font-semibold ${role === 'notaire' ? 'hover:bg-orange-600 hover:text-white focus:bg-orange-600 focus:text-white' : 'hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white'}`}>{cat.label}</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className={menuContentClass}>
                              {cat.contracts.map((contract) => (
                                <DropdownMenuItem
                                  key={contract}
                                  className={role === 'notaire' ? 'cursor-pointer hover:bg-orange-600 hover:text-white focus:bg-orange-600 focus:text-white' : 'cursor-pointer hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white'}
                                  onClick={() => createContract(contract, cat.key)}
                                >
                                  {contract}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-4 bg-white p-4 rounded-lg border">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground" />
                <Input
                  placeholder="Rechercher un contrat..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-white text-foreground placeholder:text-foreground/50"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent className={selectContentClass}>
                  {(role === 'notaire' ? categoriesNotaire : categoriesAvocat).map((cat) => (
                    <SelectItem key={cat} value={cat} className={selectItemClass}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{role === 'notaire' ? 'Liste des actes' : 'Liste des contrats'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg bg-white">
                  <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom du contrat</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContrats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-foreground">
                        Aucun contrat trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredContrats.map((contrat) => (
                      <TableRow key={contrat.id}>
                        <TableCell className="font-medium">{contrat.name}</TableCell>
                        <TableCell className="text-sm text-foreground">{contrat.type}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            role === 'notaire'
                              ? 'bg-orange-100 text-orange-600 border-orange-200'
                              : 'bg-blue-100 text-blue-600 border-blue-200'
                          }>
                            {contrat.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-foreground">
                          {new Date(contrat.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <ShareToCollaborativeDialog
                              itemId={contrat.id}
                              itemName={contrat.name}
                              itemType="contrat"
                              role={role}
                              onSuccess={() => {
                                toast.success('Contrat partagé');
                              }}
                            />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className={role === 'notaire' ? 'hover:bg-orange-100 hover:text-orange-600' : 'hover:bg-blue-100 hover:text-blue-600'}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className={menuContentClass}>
                                <DropdownMenuItem 
                                  className={menuItemClass}
                                  onClick={() => handleView(contrat)}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Voir
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className={`text-destructive ${menuItemClass}`}
                                  onClick={() => handleDelete(contrat)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Dialog questionnaire pour compromis de vente / acte de vente */}
      <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {pendingContractType === "Acte de vente immobilière" 
                ? "Informations pour l'acte de vente immobilière" 
                : "Informations pour le compromis de vente"}
            </DialogTitle>
            <DialogDescription>
              Remplissez les informations suivantes pour préparer le document. Ces informations aideront l'IA à rédiger un contrat personnalisé.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Formulaire spécifique pour Compromis de vente */}
            {pendingContractType === "Compromis de vente / Promesse unilatérale de vente" && (
              <>
            {/* Choix du type de contrat */}
            <div className="space-y-4 bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg">Type de contrat *</h3>
              <RadioGroup 
                value={questionnaireData.typeContrat}
                onValueChange={(value) => setQuestionnaireData({...questionnaireData, typeContrat: value})}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="compromis" id="compromis" />
                  <Label htmlFor="compromis" className="cursor-pointer">Compromis de vente</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="promesse_unilaterale" id="promesse_unilaterale" />
                  <Label htmlFor="promesse_unilaterale" className="cursor-pointer">Promesse unilatérale de vente</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Informations sur le bien */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Informations sur le bien</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adresseBien">Adresse complète du bien *</Label>
                  <Input 
                    id="adresseBien"
                    value={questionnaireData.adresseBien}
                    onChange={(e) => setQuestionnaireData({...questionnaireData, adresseBien: e.target.value})}
                    placeholder="Ex: 12 rue de la Paix, 75002 Paris"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="typeBien">Type de bien *</Label>
                  <Select value={questionnaireData.typeBien} onValueChange={(value) => setQuestionnaireData({...questionnaireData, typeBien: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="appartement">Appartement</SelectItem>
                      <SelectItem value="maison">Maison</SelectItem>
                      <SelectItem value="terrain">Terrain</SelectItem>
                      <SelectItem value="immeuble">Immeuble</SelectItem>
                      <SelectItem value="local_commercial">Local commercial</SelectItem>
                      <SelectItem value="parking">Parking/Garage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surfaceHabitable">Surface habitable (m²) *</Label>
                  <Input 
                    id="surfaceHabitable"
                    type="number"
                    value={questionnaireData.surfaceHabitable}
                    onChange={(e) => setQuestionnaireData({...questionnaireData, surfaceHabitable: e.target.value})}
                    placeholder="Ex: 75"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nombrePieces">Nombre de pièces</Label>
                  <Input 
                    id="nombrePieces"
                    type="number"
                    value={questionnaireData.nombrePieces}
                    onChange={(e) => setQuestionnaireData({...questionnaireData, nombrePieces: e.target.value})}
                    placeholder="Ex: 3"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="naturePropriete">Nature de la propriété *</Label>
                  <Select value={questionnaireData.naturePropriete} onValueChange={(value) => setQuestionnaireData({...questionnaireData, naturePropriete: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pleine_propriete">Pleine propriété</SelectItem>
                      <SelectItem value="usufruit">Usufruit</SelectItem>
                      <SelectItem value="nue_propriete">Nue-propriété</SelectItem>
                      <SelectItem value="indivision">Indivision</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bienCopropriete">Bien en copropriété ? *</Label>
                  <Select value={questionnaireData.bienCopropriete} onValueChange={(value) => setQuestionnaireData({...questionnaireData, bienCopropriete: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oui">Oui</SelectItem>
                      <SelectItem value="non">Non</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {questionnaireData.bienCopropriete === "oui" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="numeroLot">Numéro de lot</Label>
                      <Input 
                        id="numeroLot"
                        value={questionnaireData.numeroLot}
                        onChange={(e) => setQuestionnaireData({...questionnaireData, numeroLot: e.target.value})}
                        placeholder="Ex: 123"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tantièmes">Tantièmes / Quote-part des parties communes</Label>
                      <Input 
                        id="tantièmes"
                        value={questionnaireData.tantièmes}
                        onChange={(e) => setQuestionnaireData({...questionnaireData, tantièmes: e.target.value})}
                        placeholder="Ex: 150/10000"
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="occupationBien">Occupation du bien *</Label>
                  <Select value={questionnaireData.occupationBien} onValueChange={(value) => setQuestionnaireData({...questionnaireData, occupationBien: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="libre">Libre</SelectItem>
                      <SelectItem value="occupe_vendeur">Occupé par le vendeur</SelectItem>
                      <SelectItem value="occupe_locataire">Occupé par un locataire</SelectItem>
                      <SelectItem value="bail_en_cours">Bail en cours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="servitudesConnues">Servitudes connues ? *</Label>
                  <Select value={questionnaireData.servitudesConnues} onValueChange={(value) => setQuestionnaireData({...questionnaireData, servitudesConnues: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oui">Oui</SelectItem>
                      <SelectItem value="non">Non</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {questionnaireData.servitudesConnues === "oui" && (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="descriptionServitudes">Description des servitudes</Label>
                    <Textarea 
                      id="descriptionServitudes"
                      value={questionnaireData.descriptionServitudes}
                      onChange={(e) => setQuestionnaireData({...questionnaireData, descriptionServitudes: e.target.value})}
                      placeholder="Décrivez les servitudes..."
                      rows={3}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="bienLibre">Bien vendu libre de toute occupation à la signature ? *</Label>
                  <Select value={questionnaireData.bienLibre} onValueChange={(value) => setQuestionnaireData({...questionnaireData, bienLibre: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oui">Oui</SelectItem>
                      <SelectItem value="non">Non</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Informations client */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Client</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clientId">Sélectionner un client *</Label>
                  <Select 
                    value={questionnaireData.clientId}
                    onValueChange={(value) => setQuestionnaireData({...questionnaireData, clientId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.nom} {client.prenom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Afficher les informations du client sélectionné */}
                {questionnaireData.clientId && clients.find(c => c.id === questionnaireData.clientId) && (
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                    <p><strong>Nom complet:</strong> {clients.find(c => c.id === questionnaireData.clientId)?.nom} {clients.find(c => c.id === questionnaireData.clientId)?.prenom}</p>
                    {clients.find(c => c.id === questionnaireData.clientId)?.adresse && (
                      <p><strong>Adresse:</strong> {clients.find(c => c.id === questionnaireData.clientId)?.adresse}</p>
                    )}
                    {clients.find(c => c.id === questionnaireData.clientId)?.telephone && (
                      <p><strong>Téléphone:</strong> {clients.find(c => c.id === questionnaireData.clientId)?.telephone}</p>
                    )}
                    {clients.find(c => c.id === questionnaireData.clientId)?.email && (
                      <p><strong>Email:</strong> {clients.find(c => c.id === questionnaireData.clientId)?.email}</p>
                    )}
                    {clients.find(c => c.id === questionnaireData.clientId)?.date_naissance && (
                      <p><strong>Date de naissance:</strong> {new Date(clients.find(c => c.id === questionnaireData.clientId)?.date_naissance).toLocaleDateString('fr-FR')}</p>
                    )}
                    {clients.find(c => c.id === questionnaireData.clientId)?.nationalite && (
                      <p><strong>Nationalité:</strong> {clients.find(c => c.id === questionnaireData.clientId)?.nationalite}</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Rôle du client *</Label>
                  <RadioGroup 
                    value={questionnaireData.clientRole}
                    onValueChange={(value) => setQuestionnaireData({...questionnaireData, clientRole: value})}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="acheteur" id="acheteur" />
                      <Label htmlFor="acheteur" className="cursor-pointer">Acheteur</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="vendeur" id="vendeur" />
                      <Label htmlFor="vendeur" className="cursor-pointer">Vendeur</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Statut matrimonial du client */}
                <div className="space-y-2">
                  <Label htmlFor="statutMatrimonialClient">Statut matrimonial *</Label>
                  <Select value={questionnaireData.statutMatrimonialClient} onValueChange={(value) => setQuestionnaireData({...questionnaireData, statutMatrimonialClient: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="celibataire">Célibataire</SelectItem>
                      <SelectItem value="marie">Marié</SelectItem>
                      <SelectItem value="pacse">Pacsé</SelectItem>
                      <SelectItem value="divorce">Divorcé</SelectItem>
                      <SelectItem value="veuf">Veuf</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(questionnaireData.statutMatrimonialClient === "marie" || questionnaireData.statutMatrimonialClient === "pacse") && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="regimeMatrimonialClient">Régime matrimonial *</Label>
                      <Select value={questionnaireData.regimeMatrimonialClient} onValueChange={(value) => setQuestionnaireData({...questionnaireData, regimeMatrimonialClient: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="communaute_legale">Communauté légale</SelectItem>
                          <SelectItem value="separation_biens">Séparation de biens</SelectItem>
                          <SelectItem value="autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {questionnaireData.regimeMatrimonialClient === "autre" && (
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="precisionRegimeClient">Préciser le régime</Label>
                        <Input 
                          id="precisionRegimeClient"
                          value={questionnaireData.precisionRegimeClient}
                          onChange={(e) => setQuestionnaireData({...questionnaireData, precisionRegimeClient: e.target.value})}
                          placeholder="Précisez le régime matrimonial..."
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Informations autre partie */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">
                {questionnaireData.clientRole === "acheteur" ? "Vendeur" : "Acquéreur"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nomAutrePartie">Nom *</Label>
                  <Input 
                    id="nomAutrePartie"
                    value={questionnaireData.nomAutrePartie}
                    onChange={(e) => setQuestionnaireData({...questionnaireData, nomAutrePartie: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prenomAutrePartie">Prénom *</Label>
                  <Input 
                    id="prenomAutrePartie"
                    value={questionnaireData.prenomAutrePartie}
                    onChange={(e) => setQuestionnaireData({...questionnaireData, prenomAutrePartie: e.target.value})}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="adresseAutrePartie">Adresse complète *</Label>
                  <Input 
                    id="adresseAutrePartie"
                    value={questionnaireData.adresseAutrePartie}
                    onChange={(e) => setQuestionnaireData({...questionnaireData, adresseAutrePartie: e.target.value})}
                  />
                </div>

                {/* Statut matrimonial autre partie */}
                <div className="space-y-2">
                  <Label htmlFor="statutMatrimonialAutrePartie">Statut matrimonial *</Label>
                  <Select value={questionnaireData.statutMatrimonialAutrePartie} onValueChange={(value) => setQuestionnaireData({...questionnaireData, statutMatrimonialAutrePartie: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="celibataire">Célibataire</SelectItem>
                      <SelectItem value="marie">Marié</SelectItem>
                      <SelectItem value="pacse">Pacsé</SelectItem>
                      <SelectItem value="divorce">Divorcé</SelectItem>
                      <SelectItem value="veuf">Veuf</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(questionnaireData.statutMatrimonialAutrePartie === "marie" || questionnaireData.statutMatrimonialAutrePartie === "pacse") && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="regimeMatrimonialAutrePartie">Régime matrimonial *</Label>
                      <Select value={questionnaireData.regimeMatrimonialAutrePartie} onValueChange={(value) => setQuestionnaireData({...questionnaireData, regimeMatrimonialAutrePartie: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="communaute_legale">Communauté légale</SelectItem>
                          <SelectItem value="separation_biens">Séparation de biens</SelectItem>
                          <SelectItem value="autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {questionnaireData.regimeMatrimonialAutrePartie === "autre" && (
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="precisionRegimeAutrePartie">Préciser le régime</Label>
                        <Input 
                          id="precisionRegimeAutrePartie"
                          value={questionnaireData.precisionRegimeAutrePartie}
                          onChange={(e) => setQuestionnaireData({...questionnaireData, precisionRegimeAutrePartie: e.target.value})}
                          placeholder="Précisez le régime matrimonial..."
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Conditions financières */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Conditions financières</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prixVente">Prix de vente (€) *</Label>
                  <Input 
                    id="prixVente"
                    type="number"
                    value={questionnaireData.prixVente}
                    onChange={(e) => setQuestionnaireData({...questionnaireData, prixVente: e.target.value})}
                    placeholder="Ex: 350000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depotGarantie">Dépôt de garantie (€)</Label>
                  <Input 
                    id="depotGarantie"
                    type="number"
                    value={questionnaireData.depotGarantie}
                    onChange={(e) => setQuestionnaireData({...questionnaireData, depotGarantie: e.target.value})}
                    placeholder="Ex: 35000"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="modalitesPaiement">Modalités de paiement</Label>
                  <Textarea 
                    id="modalitesPaiement"
                    rows={2}
                    value={questionnaireData.modalitesPaiement}
                    onChange={(e) => setQuestionnaireData({...questionnaireData, modalitesPaiement: e.target.value})}
                    placeholder="Décrivez les modalités de paiement (comptant, crédit, etc.)"
                  />
                </div>
              </div>
            </div>

            {/* Conditions suspensives - Uniquement pour Compromis */}
            {questionnaireData.typeContrat === "compromis" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Conditions suspensives</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="conditionPret">Condition d'obtention de prêt ? *</Label>
                    <Select value={questionnaireData.conditionPret} onValueChange={(value) => setQuestionnaireData({...questionnaireData, conditionPret: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oui">Oui</SelectItem>
                        <SelectItem value="non">Non</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {questionnaireData.conditionPret === "oui" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                    <div className="md:col-span-2">
                      <h4 className="font-medium text-sm mb-4">Détails du prêt immobilier</h4>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="montantPret">Montant du prêt envisagé (€) *</Label>
                      <Input 
                        id="montantPret"
                        type="number"
                        value={questionnaireData.montantPret}
                        onChange={(e) => setQuestionnaireData({...questionnaireData, montantPret: e.target.value})}
                        placeholder="Ex: 280000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dureePret">Durée maximale du prêt (années) *</Label>
                      <Input 
                        id="dureePret"
                        type="number"
                        value={questionnaireData.dureePret}
                        onChange={(e) => setQuestionnaireData({...questionnaireData, dureePret: e.target.value})}
                        placeholder="Ex: 25"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tauxInteretMax">Taux d'intérêt maximal accepté (%) *</Label>
                      <Input 
                        id="tauxInteretMax"
                        type="number"
                        step="0.01"
                        value={questionnaireData.tauxInteretMax}
                        onChange={(e) => setQuestionnaireData({...questionnaireData, tauxInteretMax: e.target.value})}
                        placeholder="Ex: 3.5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="delaiAccordPret">Délai pour obtenir l'accord de prêt *</Label>
                      <Input 
                        id="delaiAccordPret"
                        value={questionnaireData.delaiAccordPret}
                        onChange={(e) => setQuestionnaireData({...questionnaireData, delaiAccordPret: e.target.value})}
                        placeholder="Ex: 45 jours ou date limite"
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="conditionDiagnostics">Diagnostics et contrôles techniques</Label>
                  <Textarea 
                    id="conditionDiagnostics"
                    rows={2}
                    value={questionnaireData.conditionDiagnostics}
                    onChange={(e) => setQuestionnaireData({...questionnaireData, conditionDiagnostics: e.target.value})}
                    placeholder="Ex: DPE, diagnostic amiante, plomb, termites..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="autresConditions">Autres conditions suspensives</Label>
                  <Textarea 
                    id="autresConditions"
                    rows={2}
                    value={questionnaireData.autresConditions}
                    onChange={(e) => setQuestionnaireData({...questionnaireData, autresConditions: e.target.value})}
                    placeholder="Autres conditions éventuelles"
                  />
                </div>
              </div>
            </div>
            )}

            {/* Droit de préemption */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Droit de préemption</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="droitPreemptionUrbain">Bien soumis au droit de préemption urbain ? *</Label>
                  <Select value={questionnaireData.droitPreemptionUrbain} onValueChange={(value) => setQuestionnaireData({...questionnaireData, droitPreemptionUrbain: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oui">Oui</SelectItem>
                      <SelectItem value="non">Non</SelectItem>
                      <SelectItem value="inconnu">Inconnu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="locatairePreemption">Présence d'un locataire avec droit de préemption ? *</Label>
                  <Select value={questionnaireData.locatairePreemption} onValueChange={(value) => setQuestionnaireData({...questionnaireData, locatairePreemption: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oui">Oui</SelectItem>
                      <SelectItem value="non">Non</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Promesse unilatérale spécifique */}
            {questionnaireData.typeContrat === "promesse_unilaterale" && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Spécifique à la promesse unilatérale de vente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dureeOption">Durée de l'option (en jours) *</Label>
                    <Input 
                      id="dureeOption"
                      type="number"
                      value={questionnaireData.dureeOption}
                      onChange={(e) => setQuestionnaireData({...questionnaireData, dureeOption: e.target.value})}
                      placeholder="Ex: 60"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateLimiteOption">Date limite de levée d'option *</Label>
                    <Input 
                      id="dateLimiteOption"
                      type="date"
                      value={questionnaireData.dateLimiteOption}
                      onChange={(e) => setQuestionnaireData({...questionnaireData, dateLimiteOption: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="indemniteImmobilisation">Indemnité d'immobilisation (€ ou %) *</Label>
                    <Input 
                      id="indemniteImmobilisation"
                      value={questionnaireData.indemniteImmobilisation}
                      onChange={(e) => setQuestionnaireData({...questionnaireData, indemniteImmobilisation: e.target.value})}
                      placeholder="Ex: 5000 € ou 5% du prix de vente"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Délais */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Délais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateSignatureActeDefinitif">Date prévue signature acte définitif</Label>
                  <Input 
                    id="dateSignatureActeDefinitif"
                    type="date"
                    value={questionnaireData.dateSignatureActeDefinitif}
                    onChange={(e) => setQuestionnaireData({...questionnaireData, dateSignatureActeDefinitif: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delaiReflexion">Délai de rétractation (jours)</Label>
                  <Input 
                    id="delaiReflexion"
                    type="number"
                    value={questionnaireData.delaiReflexion}
                    onChange={(e) => setQuestionnaireData({...questionnaireData, delaiReflexion: e.target.value})}
                    placeholder="Ex: 10"
                  />
                </div>
              </div>
            </div>

            {/* Informations complémentaires */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Informations complémentaires</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="chargesCopropriete">Charges de copropriété (si applicable)</Label>
                  <Textarea 
                    id="chargesCopropriete"
                    rows={2}
                    value={questionnaireData.chargesCopropriete}
                    onChange={(e) => setQuestionnaireData({...questionnaireData, chargesCopropriete: e.target.value})}
                    placeholder="Montant annuel, répartition, détails..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="travauxAPrevenir">Travaux à prévoir</Label>
                  <Textarea 
                    id="travauxAPrevenir"
                    rows={2}
                    value={questionnaireData.travauxAPrevenir}
                    onChange={(e) => setQuestionnaireData({...questionnaireData, travauxAPrevenir: e.target.value})}
                    placeholder="Description des travaux prévus ou nécessaires"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="autresInformations">Autres informations utiles</Label>
                  <Textarea 
                    id="autresInformations"
                    rows={3}
                    value={questionnaireData.autresInformations}
                    onChange={(e) => setQuestionnaireData({...questionnaireData, autresInformations: e.target.value})}
                    placeholder="Toute information complémentaire pertinente pour le contrat"
                  />
                </div>
              </div>
            </div>
          </>
            )}

            {/* Formulaire spécifique pour Acte de vente immobilière */}
            {pendingContractType === "Acte de vente immobilière" && (
              <>
                {/* TODO: Ajouter le formulaire complet pour l'acte de vente */}
                <div className="space-y-4 bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-800">
                    Le formulaire détaillé pour l'acte de vente immobilière est en cours de développement.
                    Il comportera toutes les sections nécessaires : informations détaillées sur le bien, 
                    références cadastrales, diagnostics, urbanisme, etc.
                  </p>
                </div>
              </>
            )}

          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setShowQuestionDialog(false)}
            >
              Annuler
            </Button>
            <Button 
              className={role === 'notaire' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}
              onClick={handleQuestionnaireSubmit}
            >
              Créer le contrat
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
