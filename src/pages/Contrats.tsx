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
  
  // State pour l'acte de vente
  const [acteVenteData, setActeVenteData] = useState({
    // Sélection du client et son rôle
    clientId: "",
    clientRole: "", // "vendeur" ou "acheteur"
    
    // Informations détaillées sur le bien
    adresseBien: "",
    typeBien: "",
    naturePropriete: "",
    referencesCadastrales: "",
    sectionCadastrale: "",
    numeroCadastral: "",
    contenanceCadastrale: "",
    surfaceHabitable: "",
    surfaceTerrain: "",
    nombrePieces: "",
    equipements: [] as string[],
    // Copropriété
    bienCopropriete: "",
    numerosLots: "",
    tantièmes: "",
    reglementCopro: "",
    chargesAnnuelles: "",
    // État juridique
    servitudesExistantes: "",
    hypotheques: "",
    destinationBien: "",
    bienLibreOuOccupe: "",
    informationsBail: "",
    
    // Vendeur (soit client sélectionné avec auto-fill, soit manuel)
    vendeurNom: "",
    vendeurPrenom: "",
    vendeurAdresse: "",
    vendeurDateNaissance: "",
    vendeurLieuNaissance: "",
    vendeurNationalite: "",
    vendeurProfession: "",
    vendeurStatutMatrimonial: "",
    vendeurRegimeMatrimonial: "",
    vendeurPieceIdentite: "",
    vendeurNumeroIdentite: "",
    
    // Acheteur (soit client sélectionné avec auto-fill, soit manuel)
    acheteurNom: "",
    acheteurPrenom: "",
    acheteurAdresse: "",
    acheteurDateNaissance: "",
    acheteurLieuNaissance: "",
    acheteurNationalite: "",
    acheteurProfession: "",
    acheteurStatutMatrimonial: "",
    acheteurRegimeMatrimonial: "",
    acheteurModeAcquisition: "",
    acheteurQuotePart: "",
    
    // Conditions financières
    prixVente: "",
    origineFonds: "",
    depotGarantie: "",
    fraisNotaire: "",
    repartitionProrata: "",
    modalitesPaiement: "",
    
    // Prêt immobilier
    pretImmobilier: "",
    montantPret: "",
    banquePreteur: "",
    tauxPret: "",
    dureePret: "",
    typePret: "",
    dateAccordPret: "",
    conditionsPret: "",
    
    // Documents et diagnostics
    diagnosticsFournis: "",
    
    // Origine de propriété
    origineProprieteDateAcquisition: "",
    origineReferenceActe: "",
    travauxDerniers10ans: "",
    conformiteUrbanisme: "",
    assuranceDommageOuvrage: "",
    taxesFoncieres: "",
    sinistreRecent: "",
    
    // Urbanisme
    zonePLU: "",
    droitPreemption: "",
    declarationsUrbanisme: "",
    documentsUrbanisme: "",
    
    // Délais et signature
    dateSignatureActe: "",
    lieuSignature: "",
    remiseCles: "",
    procuration: "",
    identiteMandataire: "",
    
    // Annexes
    titrePropriete: "",
    diagnostics: "",
    planBien: "",
    reglementCopropriete: "",
    etatDate: "",
    attestationAssurance: "",
    releveSyndic: "",
    
    // Informations complémentaires
    travauxPrevusCopro: "",
    proceduresEnCours: "",
    differendsVoisins: "",
    particularitesBien: "",
  });

  // State pour le bail d'habitation
  const [bailHabitationData, setBailHabitationData] = useState({
    // Sélection du bailleur (client)
    bailleurClientId: "",
    bailleurNom: "",
    bailleurPrenom: "",
    bailleurAdresse: "",
    bailleurDateNaissance: "",
    bailleurLieuNaissance: "",
    bailleurNationalite: "",
    bailleurProfession: "",
    bailleurStatutMatrimonial: "",
    bailleurPieceIdentite: "",
    bailleurNumeroIdentite: "",
    
    // Locataire(s) - saisie manuelle
    locataireNom: "",
    locatairePrenom: "",
    locataireAdresse: "",
    locataireDateNaissance: "",
    locataireLieuNaissance: "",
    locataireNationalite: "",
    locataireProfession: "",
    locataireStatutMatrimonial: "",
    locatairePieceIdentite: "",
    locataireNumeroIdentite: "",
    nombreOccupants: "",
    
    // Garant
    aGarant: "",
    garantNom: "",
    garantPrenom: "",
    garantAdresse: "",
    garantDateNaissance: "",
    garantLieuNaissance: "",
    garantStatutMatrimonial: "",
    garantProfession: "",
    garantPieceIdentite: "",
    garantNumeroIdentite: "",
    typeCaution: "",
    
    // Logement
    adresseLogement: "",
    typeLogement: "",
    etageNumeroLot: "",
    surfaceHabitable: "",
    surfaceAnnexes: "",
    anneeConstruction: "",
    etatUsage: "",
    dependances: [] as string[], // cave, parking, grenier, jardin
    logementCopropriete: "",
    reglementCoproFourni: "",
    
    // Si meublé
    typeBail: "", // "vide" ou "meuble"
    mobilierListeComplete: [] as string[],
    inventaireFourni: "",
    
    // Nature du bailleur
    natureBailleur: "", // "physique" ou "morale"
    
    // Usage
    residencePrincipale: "", // Oui/Non - obligatoire pour bail vide
    destinationBien: "",
    souslocationAutorisee: "",
    colocationPossible: "",
    
    // Conditions financières
    loyerMensuel: "",
    chargesMensuelles: "",
    typeCharges: "", // "provision" ou "forfait"
    typologieCharges: "",
    depotGarantie: "",
    premierLoyerDate: "",
    modePaiement: "",
    revisionLoyerPrevue: "", // Oui/Non
    indiceIRL: "",
    trimestreReference: "",
    
    // Dates
    typeBailDuree: "", // "3ans" "6ans" "1an" "9mois"
    dateDebutBail: "",
    dureeBail: "",
    
    // Diagnostics obligatoires
    diagnosticsFournis: "", // Oui/Non
    diagnosticDPE: "",
    diagnosticElectricite: "",
    diagnosticGaz: "",
    diagnosticERP: "",
    diagnosticPlomb: "",
    diagnosticAmiante: "",
    
    // État logement
    etatLieuxFourni: "",
    inventaireMobilierFourni: "",
    travauxRecents: "",
    
    // Obligations techniques
    typeChauffage: "",
    compteursIndividuels: "",
    releveCompteurs: "",
    
    // Assurance
    attestationAssurance: "",
    
    // Particularités juridiques
    servitudes: "",
    logementZoneERP: "",
    usageProfessionnel: "",
    
    // Informations complémentaires
    informationsComplementaires: "",
  });
  
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
        .select('id, nom, prenom, adresse, telephone, email, date_naissance, lieu_naissance, nationalite, profession, situation_matrimoniale, situation_familiale, type_identite, numero_identite')
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

  // Pré-remplir les informations du client sélectionné (Compromis de vente)
  useEffect(() => {
    if (questionnaireData.clientId && clients.length > 0) {
      const selectedClient = clients.find(c => c.id === questionnaireData.clientId) as any;
      if (selectedClient) {
        // Extraire la situation familiale de l'objet JSON
        let situationFamiliale = "";
        if (typeof selectedClient.situation_familiale === 'object' && selectedClient.situation_familiale !== null) {
          situationFamiliale = selectedClient.situation_familiale.situation_familiale || "";
        } else if (typeof selectedClient.situation_familiale === 'string') {
          situationFamiliale = selectedClient.situation_familiale;
        }
        
        setQuestionnaireData(prev => ({
          ...prev,
          statutMatrimonialClient: situationFamiliale || selectedClient.situation_matrimoniale || "",
        }));
      }
    }
  }, [questionnaireData.clientId, clients]);

  // Auto-fill depuis le client sélectionné selon son rôle (Acte de vente)
  useEffect(() => {
    if (acteVenteData.clientId && acteVenteData.clientRole && clients.length > 0) {
      const selectedClient = clients.find(c => c.id === acteVenteData.clientId) as any;
      if (selectedClient) {
        // Extraire la situation familiale de l'objet JSON
        let situationFamiliale = "";
        if (typeof selectedClient.situation_familiale === 'object' && selectedClient.situation_familiale !== null) {
          situationFamiliale = selectedClient.situation_familiale.situation_familiale || "";
        } else if (typeof selectedClient.situation_familiale === 'string') {
          situationFamiliale = selectedClient.situation_familiale;
        }
        
        const statutMatrimonial = situationFamiliale || selectedClient.situation_matrimoniale || "";

        if (acteVenteData.clientRole === "vendeur") {
          setActeVenteData(prev => ({
            ...prev,
            vendeurNom: selectedClient.nom || "",
            vendeurPrenom: selectedClient.prenom || "",
            vendeurAdresse: selectedClient.adresse || "",
            vendeurDateNaissance: selectedClient.date_naissance || "",
            vendeurLieuNaissance: selectedClient.lieu_naissance || "",
            vendeurNationalite: selectedClient.nationalite || "",
            vendeurProfession: selectedClient.profession || "",
            vendeurStatutMatrimonial: statutMatrimonial,
            vendeurPieceIdentite: selectedClient.type_identite || "",
            vendeurNumeroIdentite: selectedClient.numero_identite || "",
          }));
        } else if (acteVenteData.clientRole === "acheteur") {
          setActeVenteData(prev => ({
            ...prev,
            acheteurNom: selectedClient.nom || "",
            acheteurPrenom: selectedClient.prenom || "",
            acheteurAdresse: selectedClient.adresse || "",
            acheteurDateNaissance: selectedClient.date_naissance || "",
            acheteurLieuNaissance: selectedClient.lieu_naissance || "",
            acheteurNationalite: selectedClient.nationalite || "",
            acheteurProfession: selectedClient.profession || "",
            acheteurStatutMatrimonial: statutMatrimonial,
          }));
        }
      }
    }
  }, [acteVenteData.clientId, acteVenteData.clientRole, clients]);

  // Auto-fill depuis le client sélectionné comme bailleur (Bail d'habitation)
  useEffect(() => {
    if (bailHabitationData.bailleurClientId && clients.length > 0) {
      const selectedClient = clients.find(c => c.id === bailHabitationData.bailleurClientId) as any;
      if (selectedClient) {
        // Extraire la situation familiale de l'objet JSON
        let situationFamiliale = "";
        if (typeof selectedClient.situation_familiale === 'object' && selectedClient.situation_familiale !== null) {
          situationFamiliale = selectedClient.situation_familiale.situation_familiale || "";
        } else if (typeof selectedClient.situation_familiale === 'string') {
          situationFamiliale = selectedClient.situation_familiale;
        }

        setBailHabitationData(prev => ({
          ...prev,
          bailleurNom: selectedClient.nom || "",
          bailleurPrenom: selectedClient.prenom || "",
          bailleurAdresse: selectedClient.adresse || "",
          bailleurDateNaissance: selectedClient.date_naissance || "",
          bailleurLieuNaissance: selectedClient.lieu_naissance || "",
          bailleurNationalite: selectedClient.nationalite || "",
          bailleurProfession: selectedClient.profession || "",
          bailleurStatutMatrimonial: situationFamiliale || selectedClient.situation_matrimoniale || "",
          bailleurPieceIdentite: selectedClient.type_identite || "",
          bailleurNumeroIdentite: selectedClient.numero_identite || "",
        }));
      }
    }
  }, [bailHabitationData.bailleurClientId, clients]);

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
    
    // Si c'est un bail d'habitation, ouvrir le questionnaire spécifique
    if ((contractType === "Bail d'habitation vide" || contractType === "Bail d'habitation meublé") && categoryKey === "Immobilier") {
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

  // Handler pour la soumission du questionnaire Acte de vente immobilière
  const handleActeVenteSubmit = async () => {
    try {
      if (!user) {
        toast.error('Utilisateur non connecté');
        return;
      }

      // Validation des champs requis
      if (!acteVenteData.clientId || !acteVenteData.clientRole) {
        toast.error('Veuillez sélectionner un client et son rôle');
        return;
      }

      if (!acteVenteData.vendeurNom || !acteVenteData.acheteurNom) {
        toast.error('Veuillez remplir les informations du vendeur et de l\'acheteur');
        return;
      }

      if (!acteVenteData.adresseBien || !acteVenteData.typeBien || !acteVenteData.prixVente) {
        toast.error('Veuillez remplir les champs obligatoires (adresse, type de bien, prix)');
        return;
      }

      // Créer le contrat avec les données complètes en description
      const descriptionData = `
TYPE DE CONTRAT: Acte de vente immobilière

═══════════════════════════════════════════════════════════════
INFORMATIONS SUR LE BIEN
═══════════════════════════════════════════════════════════════
- Adresse complète: ${acteVenteData.adresseBien}
- Type de bien: ${acteVenteData.typeBien}
- Nature de propriété: ${acteVenteData.naturePropriete}
- Destination: ${acteVenteData.destinationBien}

RÉFÉRENCES CADASTRALES:
- Section cadastrale: ${acteVenteData.sectionCadastrale}
- Numéro cadastral: ${acteVenteData.numeroCadastral}
- Contenance cadastrale: ${acteVenteData.contenanceCadastrale}

SURFACES:
- Surface habitable: ${acteVenteData.surfaceHabitable} m²
- Surface terrain: ${acteVenteData.surfaceTerrain} m²
- Nombre de pièces: ${acteVenteData.nombrePieces}

${acteVenteData.bienCopropriete === "oui" ? `
COPROPRIÉTÉ:
- Bien en copropriété: Oui
- Numéros de lot(s): ${acteVenteData.numerosLots}
- Tantièmes / Quote-parts: ${acteVenteData.tantièmes}
- Règlement disponible: ${acteVenteData.reglementCopro}
- Charges annuelles: ${acteVenteData.chargesAnnuelles} €` : `
COPROPRIÉTÉ: Non`}

═══════════════════════════════════════════════════════════════
ÉTAT JURIDIQUE DU BIEN
═══════════════════════════════════════════════════════════════
- Servitudes existantes: ${acteVenteData.servitudesExistantes || 'Aucune'}
- Hypothèques / Inscriptions: ${acteVenteData.hypotheques || 'Aucune'}
- Bien libre ou occupé: ${acteVenteData.bienLibreOuOccupe}
${acteVenteData.bienLibreOuOccupe === "occupe" ? `- Informations bail: ${acteVenteData.informationsBail}` : ''}

═══════════════════════════════════════════════════════════════
VENDEUR
═══════════════════════════════════════════════════════════════
- Nom complet: ${acteVenteData.vendeurNom} ${acteVenteData.vendeurPrenom}
- Adresse: ${acteVenteData.vendeurAdresse}
- Date de naissance: ${acteVenteData.vendeurDateNaissance}
- Lieu de naissance: ${acteVenteData.vendeurLieuNaissance}
- Nationalité: ${acteVenteData.vendeurNationalite}
- Profession: ${acteVenteData.vendeurProfession}
- Statut matrimonial: ${acteVenteData.vendeurStatutMatrimonial}
${(acteVenteData.vendeurStatutMatrimonial === "marie" || acteVenteData.vendeurStatutMatrimonial === "pacse") ? `- Régime matrimonial: ${acteVenteData.vendeurRegimeMatrimonial}` : ''}
- Pièce d'identité: ${acteVenteData.vendeurPieceIdentite} n° ${acteVenteData.vendeurNumeroIdentite}

═══════════════════════════════════════════════════════════════
ACHETEUR
═══════════════════════════════════════════════════════════════
- Nom complet: ${acteVenteData.acheteurNom} ${acteVenteData.acheteurPrenom}
- Adresse: ${acteVenteData.acheteurAdresse}
- Date de naissance: ${acteVenteData.acheteurDateNaissance}
- Lieu de naissance: ${acteVenteData.acheteurLieuNaissance}
- Nationalité: ${acteVenteData.acheteurNationalite}
- Profession: ${acteVenteData.acheteurProfession}
- Statut matrimonial: ${acteVenteData.acheteurStatutMatrimonial}
${(acteVenteData.acheteurStatutMatrimonial === "marie" || acteVenteData.acheteurStatutMatrimonial === "pacse") ? `- Régime matrimonial: ${acteVenteData.acheteurRegimeMatrimonial}` : ''}
- Mode d'acquisition: ${acteVenteData.acheteurModeAcquisition}
${acteVenteData.acheteurModeAcquisition === "indivision" ? `- Quote-part: ${acteVenteData.acheteurQuotePart}%` : ''}

═══════════════════════════════════════════════════════════════
CONDITIONS FINANCIÈRES
═══════════════════════════════════════════════════════════════
- Prix de vente: ${acteVenteData.prixVente} €
- Origine des fonds: ${acteVenteData.origineFonds}
- Dépôt de garantie: ${acteVenteData.depotGarantie} €
- Frais de notaire: ${acteVenteData.fraisNotaire} €
- Répartition prorata: ${acteVenteData.repartitionProrata}
- Modalités de paiement: ${acteVenteData.modalitesPaiement}

${acteVenteData.pretImmobilier === "oui" ? `
PRÊT IMMOBILIER:
- Montant du prêt: ${acteVenteData.montantPret} €
- Banque prêteuse: ${acteVenteData.banquePreteur}
- Taux réel: ${acteVenteData.tauxPret} %
- Durée: ${acteVenteData.dureePret} années
- Type de prêt: ${acteVenteData.typePret}
- Date accord: ${acteVenteData.dateAccordPret}
- Conditions: ${acteVenteData.conditionsPret}` : ''}

═══════════════════════════════════════════════════════════════
DOCUMENTS & DIAGNOSTICS
═══════════════════════════════════════════════════════════════
${acteVenteData.diagnosticsFournis}

═══════════════════════════════════════════════════════════════
ORIGINE DE PROPRIÉTÉ & DÉCLARATIONS
═══════════════════════════════════════════════════════════════
- Date d'acquisition précédente: ${acteVenteData.origineProprieteDateAcquisition}
- Référence acte: ${acteVenteData.origineReferenceActe}
- Travaux (10 ans): ${acteVenteData.travauxDerniers10ans || 'Aucun'}
- Conformité urbanisme: ${acteVenteData.conformiteUrbanisme}
- Assurance dommage-ouvrage: ${acteVenteData.assuranceDommageOuvrage}
- Taxes foncières N-1: ${acteVenteData.taxesFoncieres} €
- Sinistre récent: ${acteVenteData.sinistreRecent}

═══════════════════════════════════════════════════════════════
URBANISME
═══════════════════════════════════════════════════════════════
- Zone PLU/POS: ${acteVenteData.zonePLU}
- Droit de préemption: ${acteVenteData.droitPreemption}
- Déclarations d'urbanisme: ${acteVenteData.declarationsUrbanisme}
- Documents fournis: ${acteVenteData.documentsUrbanisme}

═══════════════════════════════════════════════════════════════
DÉLAIS & SIGNATURE
═══════════════════════════════════════════════════════════════
- Date de signature: ${acteVenteData.dateSignatureActe}
- Lieu de signature: ${acteVenteData.lieuSignature}
- Remise des clés: ${acteVenteData.remiseCles}
${acteVenteData.procuration === "oui" ? `- Procuration: Oui\n- Mandataire: ${acteVenteData.identiteMandataire}` : '- Procuration: Non'}

═══════════════════════════════════════════════════════════════
ANNEXES
═══════════════════════════════════════════════════════════════
- Titre de propriété: ${acteVenteData.titrePropriete}
- Diagnostics: ${acteVenteData.diagnostics}
- Plan du bien: ${acteVenteData.planBien}
- Règlement copropriété: ${acteVenteData.reglementCopropriete}
- État daté: ${acteVenteData.etatDate}
- Attestation assurance: ${acteVenteData.attestationAssurance}
- Relevé syndic: ${acteVenteData.releveSyndic}

═══════════════════════════════════════════════════════════════
INFORMATIONS COMPLÉMENTAIRES
═══════════════════════════════════════════════════════════════
- Travaux prévus copropriété: ${acteVenteData.travauxPrevusCopro || 'Aucun'}
- Procédures en cours: ${acteVenteData.proceduresEnCours || 'Aucune'}
- Différends voisins: ${acteVenteData.differendsVoisins || 'Aucun'}
- Particularités: ${acteVenteData.particularitesBien || 'Aucune'}
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
      
      toast.success('Acte de vente créé avec succès', { 
        description: 'Toutes les informations ont été enregistrées et pourront être utilisées pour générer le document'
      });
      
      setShowQuestionDialog(false);
      
      // Réinitialiser le formulaire acte de vente
      setActeVenteData({
        clientId: "",
        clientRole: "",
        adresseBien: "",
        typeBien: "",
        naturePropriete: "",
        sectionCadastrale: "",
        numeroCadastral: "",
        contenanceCadastrale: "",
        surfaceHabitable: "",
        surfaceTerrain: "",
        nombrePieces: "",
        equipements: [],
        bienCopropriete: "",
        numerosLots: "",
        tantièmes: "",
        reglementCopro: "",
        chargesAnnuelles: "",
        servitudesExistantes: "",
        hypotheques: "",
        destinationBien: "",
        bienLibreOuOccupe: "",
        informationsBail: "",
        vendeurNom: "",
        vendeurPrenom: "",
        vendeurAdresse: "",
        vendeurDateNaissance: "",
        vendeurLieuNaissance: "",
        vendeurNationalite: "",
        vendeurProfession: "",
        vendeurStatutMatrimonial: "",
        vendeurRegimeMatrimonial: "",
        vendeurPieceIdentite: "",
        vendeurNumeroIdentite: "",
        acheteurNom: "",
        acheteurPrenom: "",
        acheteurAdresse: "",
        acheteurDateNaissance: "",
        acheteurLieuNaissance: "",
        acheteurNationalite: "",
        acheteurProfession: "",
        acheteurStatutMatrimonial: "",
        acheteurRegimeMatrimonial: "",
        acheteurModeAcquisition: "",
        acheteurQuotePart: "",
        prixVente: "",
        origineFonds: "",
        depotGarantie: "",
        fraisNotaire: "",
        repartitionProrata: "",
        modalitesPaiement: "",
        pretImmobilier: "",
        montantPret: "",
        banquePreteur: "",
        tauxPret: "",
        dureePret: "",
        typePret: "",
        dateAccordPret: "",
        conditionsPret: "",
        diagnosticsFournis: "",
        origineProprieteDateAcquisition: "",
        origineReferenceActe: "",
        travauxDerniers10ans: "",
        conformiteUrbanisme: "",
        assuranceDommageOuvrage: "",
        taxesFoncieres: "",
        sinistreRecent: "",
        zonePLU: "",
        droitPreemption: "",
        declarationsUrbanisme: "",
        documentsUrbanisme: "",
        dateSignatureActe: "",
        lieuSignature: "",
        remiseCles: "",
        procuration: "",
        identiteMandataire: "",
        titrePropriete: "",
        diagnostics: "",
        planBien: "",
        reglementCopropriete: "",
        etatDate: "",
        attestationAssurance: "",
        releveSyndic: "",
        travauxPrevusCopro: "",
        proceduresEnCours: "",
        differendsVoisins: "",
        particularitesBien: "",
      });
      
      refreshContrats();
    } catch (err: unknown) {
      console.error('Erreur création acte de vente:', err);
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

  // Handler pour la soumission du bail d'habitation
  const handleBailHabitationSubmit = async () => {
    try {
      if (!user) {
        toast.error('Utilisateur non connecté');
        return;
      }

      if (!bailHabitationData.bailleurClientId) {
        toast.error('Veuillez sélectionner un client bailleur');
        return;
      }

      if (!bailHabitationData.locataireNom || !bailHabitationData.adresseLogement || !bailHabitationData.loyerMensuel) {
        toast.error('Veuillez remplir les champs obligatoires (locataire, adresse logement, loyer)');
        return;
      }

      const descriptionData = `
TYPE DE CONTRAT: Bail d'habitation ${bailHabitationData.typeBail === "meuble" ? "meublé" : "vide"}

═══════════════════════════════════════════════════════════════
BAILLEUR
═══════════════════════════════════════════════════════════════
- Nom complet: ${bailHabitationData.bailleurNom} ${bailHabitationData.bailleurPrenom}
- Adresse: ${bailHabitationData.bailleurAdresse}
- Date de naissance: ${bailHabitationData.bailleurDateNaissance}
- Lieu de naissance: ${bailHabitationData.bailleurLieuNaissance}
- Nationalité: ${bailHabitationData.bailleurNationalite}
- Profession: ${bailHabitationData.bailleurProfession}
- Statut matrimonial: ${bailHabitationData.bailleurStatutMatrimonial}
- Pièce d'identité: ${bailHabitationData.bailleurPieceIdentite} n° ${bailHabitationData.bailleurNumeroIdentite}

═══════════════════════════════════════════════════════════════
LOCATAIRE
═══════════════════════════════════════════════════════════════
- Nom complet: ${bailHabitationData.locataireNom} ${bailHabitationData.locatairePrenom}
- Adresse: ${bailHabitationData.locataireAdresse}
- Date de naissance: ${bailHabitationData.locataireDateNaissance}
- Lieu de naissance: ${bailHabitationData.locataireLieuNaissance}
- Nationalité: ${bailHabitationData.locataireNationalite}
- Profession: ${bailHabitationData.locataireProfession}
- Statut matrimonial: ${bailHabitationData.locataireStatutMatrimonial}
- Pièce d'identité: ${bailHabitationData.locatairePieceIdentite} n° ${bailHabitationData.locataireNumeroIdentite}
- Nombre d'occupants: ${bailHabitationData.nombreOccupants}

${bailHabitationData.aGarant === "oui" ? `═══════════════════════════════════════════════════════════════
GARANT
═══════════════════════════════════════════════════════════════
- Nom complet: ${bailHabitationData.garantNom} ${bailHabitationData.garantPrenom}
- Adresse: ${bailHabitationData.garantAdresse}
- Profession: ${bailHabitationData.garantProfession}
- Type de caution: ${bailHabitationData.typeCaution}
` : ''}

═══════════════════════════════════════════════════════════════
LOGEMENT
═══════════════════════════════════════════════════════════════
- Adresse complète: ${bailHabitationData.adresseLogement}
- Type de logement: ${bailHabitationData.typeLogement}
- Surface habitable: ${bailHabitationData.surfaceHabitable} m²
- Année construction: ${bailHabitationData.anneeConstruction || 'Non renseignée'}
- État d'usage: ${bailHabitationData.etatUsage}
- Copropriété: ${bailHabitationData.logementCopropriete}

═══════════════════════════════════════════════════════════════
CONDITIONS FINANCIÈRES
═══════════════════════════════════════════════════════════════
- Loyer mensuel: ${bailHabitationData.loyerMensuel} €
- Charges mensuelles: ${bailHabitationData.chargesMensuelles} €
- Type de charges: ${bailHabitationData.typologieCharges}
- Dépôt de garantie: ${bailHabitationData.depotGarantie} €
- Premier loyer payable le: ${bailHabitationData.premierLoyerDate}
- Mode de paiement: ${bailHabitationData.modePaiement}

═══════════════════════════════════════════════════════════════
DATES DU BAIL
═══════════════════════════════════════════════════════════════
- Type: ${bailHabitationData.typeBail === "meuble" ? "Location meublée" : "Location vide"}
- Durée: ${bailHabitationData.typeBailDuree}
- Date de début: ${bailHabitationData.dateDebutBail}

═══════════════════════════════════════════════════════════════
INFORMATIONS COMPLÉMENTAIRES
═══════════════════════════════════════════════════════════════
${bailHabitationData.informationsComplementaires || 'Aucune'}
      `.trim();

      const { data, error } = await supabase
        .from('contrats')
        .insert({
          owner_id: user.id,
          name: `Bail d'habitation - ${bailHabitationData.locataireNom} ${bailHabitationData.locatairePrenom}`,
          type: pendingContractType,
          category: pendingCategory,
          role: role,
          description: descriptionData,
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success("Bail d'habitation créé avec succès");
      setShowQuestionDialog(false);
      
      // Réinitialiser le formulaire
      setBailHabitationData({
        bailleurClientId: "",
        bailleurNom: "",
        bailleurPrenom: "",
        bailleurAdresse: "",
        bailleurDateNaissance: "",
        bailleurLieuNaissance: "",
        bailleurNationalite: "",
        bailleurProfession: "",
        bailleurStatutMatrimonial: "",
        bailleurPieceIdentite: "",
        bailleurNumeroIdentite: "",
        locataireNom: "",
        locatairePrenom: "",
        locataireAdresse: "",
        locataireDateNaissance: "",
        locataireLieuNaissance: "",
        locataireNationalite: "",
        locataireProfession: "",
        locataireStatutMatrimonial: "",
        locatairePieceIdentite: "",
        locataireNumeroIdentite: "",
        nombreOccupants: "",
        aGarant: "",
        garantNom: "",
        garantPrenom: "",
        garantAdresse: "",
        garantDateNaissance: "",
        garantLieuNaissance: "",
        garantStatutMatrimonial: "",
        garantProfession: "",
        garantPieceIdentite: "",
        garantNumeroIdentite: "",
        typeCaution: "",
        adresseLogement: "",
        typeLogement: "",
        etageNumeroLot: "",
        surfaceHabitable: "",
        surfaceAnnexes: "",
        anneeConstruction: "",
        etatUsage: "",
        dependances: [],
        logementCopropriete: "",
        reglementCoproFourni: "",
        typeBail: "",
        mobilierListeComplete: [],
        inventaireFourni: "",
        natureBailleur: "",
        residencePrincipale: "",
        destinationBien: "",
        souslocationAutorisee: "",
        colocationPossible: "",
        loyerMensuel: "",
        chargesMensuelles: "",
        typeCharges: "",
        typologieCharges: "",
        depotGarantie: "",
        premierLoyerDate: "",
        modePaiement: "",
        revisionLoyerPrevue: "",
        indiceIRL: "",
        trimestreReference: "",
        typeBailDuree: "",
        dateDebutBail: "",
        dureeBail: "",
        diagnosticsFournis: "",
        diagnosticDPE: "",
        diagnosticElectricite: "",
        diagnosticGaz: "",
        diagnosticERP: "",
        diagnosticPlomb: "",
        diagnosticAmiante: "",
        etatLieuxFourni: "",
        inventaireMobilierFourni: "",
        travauxRecents: "",
        typeChauffage: "",
        compteursIndividuels: "",
        releveCompteurs: "",
        attestationAssurance: "",
        servitudes: "",
        logementZoneERP: "",
        usageProfessionnel: "",
        informationsComplementaires: "",
      });

      loadContrats();
    } catch (err) {
      console.error('Erreur création bail:', err);
      toast.error('Erreur lors de la création du bail');
    }
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
                : (pendingContractType === "Bail d'habitation vide" || pendingContractType === "Bail d'habitation meublé")
                ? "Informations pour le bail d'habitation"
                : questionnaireData.typeContrat === "promesse_unilaterale"
                ? "Informations pour la promesse unilatérale de vente"
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

            {/* Sélection du rôle du client */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Rôle du client</h3>
              <div className="space-y-2">
                <Label>Votre client est : *</Label>
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
            </div>

            {/* Section Vendeur */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">👤 Vendeur</h3>
              <div className="space-y-4">
                {questionnaireData.clientRole === "vendeur" ? (
                  <>
                    {/* Le client est le vendeur */}
                    <div className="space-y-2">
                      <Label htmlFor="clientId">Sélectionner votre client *</Label>
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

                    {/* Statut matrimonial du client vendeur */}
                    <div className="space-y-2">
                      <Label htmlFor="statutMatrimonialClient">Statut matrimonial *</Label>
                      <Input 
                        id="statutMatrimonialClient"
                        value={questionnaireData.statutMatrimonialClient} 
                        onChange={(e) => setQuestionnaireData({...questionnaireData, statutMatrimonialClient: e.target.value})}
                        placeholder="Ex: Célibataire, Marié, Pacsé, Divorcé, Veuf"
                      />
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
                          <div className="space-y-2">
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
                  </>
                ) : (
                  <>
                    {/* Saisie manuelle vendeur (le client est acheteur) */}
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
                  </>
                )}
              </div>
            </div>

            {/* Section Acquéreur */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">👥 Acquéreur</h3>
              <div className="space-y-4">
                {questionnaireData.clientRole === "acheteur" ? (
                  <>
                    {/* Le client est l'acheteur */}
                    <div className="space-y-2">
                      <Label htmlFor="clientId">Sélectionner votre client *</Label>
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

                    {/* Statut matrimonial du client acheteur */}
                    <div className="space-y-2">
                      <Label htmlFor="statutMatrimonialClient">Statut matrimonial *</Label>
                      <Input 
                        id="statutMatrimonialClient"
                        value={questionnaireData.statutMatrimonialClient} 
                        onChange={(e) => setQuestionnaireData({...questionnaireData, statutMatrimonialClient: e.target.value})}
                        placeholder="Ex: Célibataire, Marié, Pacsé, Divorcé, Veuf"
                      />
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
                          <div className="space-y-2">
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
                  </>
                ) : (
                  <>
                    {/* Saisie manuelle acquéreur (le client est vendeur) */}
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
                  </>
                )}
              </div>
              <div className="space-y-2">
                <Label>📎 Pièces d'identité des parties</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    multiple
                    className="hidden"
                    id="compromis-identite-upload"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) {
                        toast.success(`${files.length} pièce(s) d'identité ajoutée(s)`);
                      }
                    }}
                  />
                  <label htmlFor="compromis-identite-upload" className="cursor-pointer flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Joindre les pièces d'identité</p>
                      <p className="text-xs text-muted-foreground">Vendeur et acquéreur - PDF, images</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Informations sur le bien */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">🏠 Informations sur le bien</h3>
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
                  <Label>📎 Joindre les diagnostics</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                    <input
                      type="file"
                      accept="application/pdf"
                      multiple
                      className="hidden"
                      id="compromis-diagnostics-upload"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) {
                          toast.success(`${files.length} diagnostic(s) joint(s)`);
                        }
                      }}
                    />
                    <label htmlFor="compromis-diagnostics-upload" className="cursor-pointer flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Ajouter des documents</p>
                        <p className="text-xs text-muted-foreground">DPE, diagnostics, plans...</p>
                      </div>
                    </label>
                  </div>
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
                {/* Sélection du client */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">👤 Sélection du client</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="acte_client">Sélectionner votre client *</Label>
                      <Select value={acteVenteData.clientId} onValueChange={(value) => setActeVenteData({...acteVenteData, clientId: value})}>
                        <SelectTrigger><SelectValue placeholder="Choisir un client" /></SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>{client.nom} {client.prenom}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {acteVenteData.clientId && clients.find(c => c.id === acteVenteData.clientId) && (
                      <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                        <p><strong>Client:</strong> {clients.find(c => c.id === acteVenteData.clientId)?.nom} {clients.find(c => c.id === acteVenteData.clientId)?.prenom}</p>
                        {clients.find(c => c.id === acteVenteData.clientId)?.adresse && (
                          <p><strong>Adresse:</strong> {clients.find(c => c.id === acteVenteData.clientId)?.adresse}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Sélection du rôle du client */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">🎭 Rôle du client</h3>
                  <div className="space-y-2">
                    <Label>Le client est * :</Label>
                    <RadioGroup value={acteVenteData.clientRole} onValueChange={(value) => setActeVenteData({...acteVenteData, clientRole: value})}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="vendeur" id="role-vendeur" />
                        <Label htmlFor="role-vendeur" className="cursor-pointer">Vendeur</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="acheteur" id="role-acheteur" />
                        <Label htmlFor="role-acheteur" className="cursor-pointer">Acheteur</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                {/* Vendeur - avec auto-fill si client sélectionné comme vendeur, sinon manuel */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">👤 Vendeur</h3>
                  {acteVenteData.clientRole === "vendeur" && acteVenteData.clientId ? (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
                      <p className="font-medium mb-2">✓ Informations automatiquement remplies depuis la fiche client</p>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground mb-2">
                      Saisir manuellement les informations du vendeur
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="acte_vendeurNom">Nom *</Label>
                      <Input 
                        id="acte_vendeurNom" 
                        value={acteVenteData.vendeurNom} 
                        onChange={(e) => setActeVenteData({...acteVenteData, vendeurNom: e.target.value})} 
                        
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_vendeurPrenom">Prénom *</Label>
                      <Input 
                        id="acte_vendeurPrenom" 
                        value={acteVenteData.vendeurPrenom} 
                        onChange={(e) => setActeVenteData({...acteVenteData, vendeurPrenom: e.target.value})} 
                        
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="acte_vendeurAdresse">Adresse *</Label>
                      <Input 
                        id="acte_vendeurAdresse" 
                        value={acteVenteData.vendeurAdresse} 
                        onChange={(e) => setActeVenteData({...acteVenteData, vendeurAdresse: e.target.value})} 
                        
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_vendeurDateNaissance">Date de naissance *</Label>
                      <Input 
                        id="acte_vendeurDateNaissance" 
                        type="date" 
                        value={acteVenteData.vendeurDateNaissance} 
                        onChange={(e) => setActeVenteData({...acteVenteData, vendeurDateNaissance: e.target.value})} 
                        
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_vendeurLieuNaissance">Lieu de naissance *</Label>
                      <Input 
                        id="acte_vendeurLieuNaissance" 
                        value={acteVenteData.vendeurLieuNaissance} 
                        onChange={(e) => setActeVenteData({...acteVenteData, vendeurLieuNaissance: e.target.value})} 
                        
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_vendeurNationalite">Nationalité *</Label>
                      <Input 
                        id="acte_vendeurNationalite" 
                        value={acteVenteData.vendeurNationalite} 
                        onChange={(e) => setActeVenteData({...acteVenteData, vendeurNationalite: e.target.value})} 
                        
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_vendeurProfession">Profession *</Label>
                      <Input 
                        id="acte_vendeurProfession" 
                        value={acteVenteData.vendeurProfession} 
                        onChange={(e) => setActeVenteData({...acteVenteData, vendeurProfession: e.target.value})} 
                        
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_vendeurStatut">Statut matrimonial *</Label>
                      <Input 
                        id="acte_vendeurStatut"
                        value={acteVenteData.vendeurStatutMatrimonial} 
                        onChange={(e) => setActeVenteData({...acteVenteData, vendeurStatutMatrimonial: e.target.value})}
                        placeholder="Ex: Célibataire, Marié, Pacsé, Divorcé, Veuf"
                      />
                    </div>
                    {(acteVenteData.vendeurStatutMatrimonial === "marie" || acteVenteData.vendeurStatutMatrimonial === "pacse") && (
                      <div className="space-y-2">
                        <Label htmlFor="acte_vendeurRegime">Régime matrimonial *</Label>
                        <Input id="acte_vendeurRegime" value={acteVenteData.vendeurRegimeMatrimonial} onChange={(e) => setActeVenteData({...acteVenteData, vendeurRegimeMatrimonial: e.target.value})} />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="acte_vendeurPiece">Type de pièce d'identité *</Label>
                      <Input 
                        id="acte_vendeurPiece" 
                        value={acteVenteData.vendeurPieceIdentite} 
                        onChange={(e) => setActeVenteData({...acteVenteData, vendeurPieceIdentite: e.target.value})} 
                        placeholder="Ex: CNI, Passeport" 
                        
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_vendeurNumero">Numéro de pièce d'identité *</Label>
                      <Input 
                        id="acte_vendeurNumero" 
                        value={acteVenteData.vendeurNumeroIdentite} 
                        onChange={(e) => setActeVenteData({...acteVenteData, vendeurNumeroIdentite: e.target.value})} 
                        
                      />
                    </div>
                  </div>
                </div>

                {/* Acheteur - avec auto-fill si client sélectionné comme acheteur, sinon manuel */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">👥 Acheteur</h3>
                  {acteVenteData.clientRole === "acheteur" && acteVenteData.clientId ? (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
                      <p className="font-medium mb-2">✓ Informations automatiquement remplies depuis la fiche client</p>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground mb-2">
                      Saisir manuellement les informations de l'acheteur
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="acte_acheteurNom">Nom *</Label>
                      <Input 
                        id="acte_acheteurNom" 
                        value={acteVenteData.acheteurNom} 
                        onChange={(e) => setActeVenteData({...acteVenteData, acheteurNom: e.target.value})} 
                        
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_acheteurPrenom">Prénom *</Label>
                      <Input 
                        id="acte_acheteurPrenom" 
                        value={acteVenteData.acheteurPrenom} 
                        onChange={(e) => setActeVenteData({...acteVenteData, acheteurPrenom: e.target.value})} 
                        
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="acte_acheteurAdresse">Adresse *</Label>
                      <Input 
                        id="acte_acheteurAdresse" 
                        value={acteVenteData.acheteurAdresse} 
                        onChange={(e) => setActeVenteData({...acteVenteData, acheteurAdresse: e.target.value})} 
                        
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_acheteurDateNaissance">Date de naissance *</Label>
                      <Input 
                        id="acte_acheteurDateNaissance" 
                        type="date" 
                        value={acteVenteData.acheteurDateNaissance} 
                        onChange={(e) => setActeVenteData({...acteVenteData, acheteurDateNaissance: e.target.value})} 
                        
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_acheteurLieuNaissance">Lieu de naissance *</Label>
                      <Input 
                        id="acte_acheteurLieuNaissance" 
                        value={acteVenteData.acheteurLieuNaissance} 
                        onChange={(e) => setActeVenteData({...acteVenteData, acheteurLieuNaissance: e.target.value})} 
                        
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_acheteurNationalite">Nationalité *</Label>
                      <Input 
                        id="acte_acheteurNationalite" 
                        value={acteVenteData.acheteurNationalite} 
                        onChange={(e) => setActeVenteData({...acteVenteData, acheteurNationalite: e.target.value})} 
                        
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_acheteurProfession">Profession *</Label>
                      <Input 
                        id="acte_acheteurProfession" 
                        value={acteVenteData.acheteurProfession} 
                        onChange={(e) => setActeVenteData({...acteVenteData, acheteurProfession: e.target.value})} 
                        
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_acheteurStatut">Statut matrimonial *</Label>
                      <Input 
                        id="acte_acheteurStatut"
                        value={acteVenteData.acheteurStatutMatrimonial} 
                        onChange={(e) => setActeVenteData({...acteVenteData, acheteurStatutMatrimonial: e.target.value})}
                        placeholder="Ex: Célibataire, Marié, Pacsé, Divorcé, Veuf"
                      />
                    </div>
                    {(acteVenteData.acheteurStatutMatrimonial === "marie" || acteVenteData.acheteurStatutMatrimonial === "pacse") && (
                      <div className="space-y-2">
                        <Label htmlFor="acte_acheteurRegime">Régime matrimonial *</Label>
                        <Input id="acte_acheteurRegime" value={acteVenteData.acheteurRegimeMatrimonial} onChange={(e) => setActeVenteData({...acteVenteData, acheteurRegimeMatrimonial: e.target.value})} />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="acte_modeAcquisition">Mode d'acquisition *</Label>
                      <Select value={acteVenteData.acheteurModeAcquisition} onValueChange={(value) => setActeVenteData({...acteVenteData, acheteurModeAcquisition: value})}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="seul">Achat seul</SelectItem>
                          <SelectItem value="couple">En couple</SelectItem>
                          <SelectItem value="indivision">En indivision</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {acteVenteData.acheteurModeAcquisition === "indivision" && (
                      <div className="space-y-2">
                        <Label htmlFor="acte_quotePart">Quote-part d'acquisition (%)</Label>
                        <Input id="acte_quotePart" type="number" value={acteVenteData.acheteurQuotePart} onChange={(e) => setActeVenteData({...acteVenteData, acheteurQuotePart: e.target.value})} placeholder="Ex: 50" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>📎 Pièces d'identité vendeur et acquéreur</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        multiple
                        className="hidden"
                        id="acte-identite-upload"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            toast.success(`${files.length} pièce(s) d'identité ajoutée(s)`);
                          }
                        }}
                      />
                      <label htmlFor="acte-identite-upload" className="cursor-pointer flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Joindre les pièces d'identité</p>
                          <p className="text-xs text-muted-foreground">CNI, passeport, livret de famille - PDF, images</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Informations sur le bien */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">🏠 Informations sur le bien</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="acte_adresse">Adresse complète du bien *</Label>
                      <Input 
                        id="acte_adresse"
                        value={acteVenteData.adresseBien}
                        onChange={(e) => setActeVenteData({...acteVenteData, adresseBien: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_typeBien">Type de bien *</Label>
                      <Select value={acteVenteData.typeBien} onValueChange={(value) => setActeVenteData({...acteVenteData, typeBien: value})}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="appartement">Appartement</SelectItem>
                          <SelectItem value="maison">Maison</SelectItem>
                          <SelectItem value="terrain">Terrain</SelectItem>
                          <SelectItem value="immeuble">Immeuble</SelectItem>
                          <SelectItem value="local_commercial">Local commercial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_naturePropriete">Nature de propriété *</Label>
                      <Select value={acteVenteData.naturePropriete} onValueChange={(value) => setActeVenteData({...acteVenteData, naturePropriete: value})}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pleine_propriete">Pleine propriété</SelectItem>
                          <SelectItem value="usufruit">Usufruit</SelectItem>
                          <SelectItem value="nue_propriete">Nue-propriété</SelectItem>
                          <SelectItem value="indivision">Indivision</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_sectionCadastrale">Section cadastrale *</Label>
                      <Input id="acte_sectionCadastrale" value={acteVenteData.sectionCadastrale} onChange={(e) => setActeVenteData({...acteVenteData, sectionCadastrale: e.target.value})} placeholder="Ex: AB" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_numeroCadastral">Numéro cadastral *</Label>
                      <Input id="acte_numeroCadastral" value={acteVenteData.numeroCadastral} onChange={(e) => setActeVenteData({...acteVenteData, numeroCadastral: e.target.value})} placeholder="Ex: 123" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_contenanceCadastrale">Contenance cadastrale *</Label>
                      <Input id="acte_contenanceCadastrale" value={acteVenteData.contenanceCadastrale} onChange={(e) => setActeVenteData({...acteVenteData, contenanceCadastrale: e.target.value})} placeholder="Ex: 500 m²" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_surfaceHabitable">Surface habitable (m²) *</Label>
                      <Input id="acte_surfaceHabitable" type="number" value={acteVenteData.surfaceHabitable} onChange={(e) => setActeVenteData({...acteVenteData, surfaceHabitable: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_surfaceTerrain">Surface du terrain (m²)</Label>
                      <Input id="acte_surfaceTerrain" type="number" value={acteVenteData.surfaceTerrain} onChange={(e) => setActeVenteData({...acteVenteData, surfaceTerrain: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_nombrePieces">Nombre de pièces</Label>
                      <Input id="acte_nombrePieces" type="number" value={acteVenteData.nombrePieces} onChange={(e) => setActeVenteData({...acteVenteData, nombrePieces: e.target.value})} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="acte_destinationBien">Destination du bien *</Label>
                      <Select value={acteVenteData.destinationBien} onValueChange={(value) => setActeVenteData({...acteVenteData, destinationBien: value})}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="habitation">Habitation</SelectItem>
                          <SelectItem value="commerciale">Commerciale</SelectItem>
                          <SelectItem value="mixte">Mixte</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Copropriété */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">🏢 Copropriété</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="acte_bienCopropriete">Bien en copropriété ? *</Label>
                      <Select value={acteVenteData.bienCopropriete} onValueChange={(value) => setActeVenteData({...acteVenteData, bienCopropriete: value})}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="oui">Oui</SelectItem>
                          <SelectItem value="non">Non</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {acteVenteData.bienCopropriete === "oui" && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="acte_numerosLots">Numéros de lot(s)</Label>
                          <Input id="acte_numerosLots" value={acteVenteData.numerosLots} onChange={(e) => setActeVenteData({...acteVenteData, numerosLots: e.target.value})} placeholder="Ex: 12, 13, 14" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="acte_tantiemes">Tantièmes / Quote-parts</Label>
                          <Input id="acte_tantiemes" value={acteVenteData.tantièmes} onChange={(e) => setActeVenteData({...acteVenteData, tantièmes: e.target.value})} placeholder="Ex: 150/10000" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="acte_reglementCopro">Règlement de copropriété disponible ?</Label>
                          <Select value={acteVenteData.reglementCopro} onValueChange={(value) => setActeVenteData({...acteVenteData, reglementCopro: value})}>
                            <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="oui">Oui</SelectItem>
                              <SelectItem value="non">Non</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="acte_chargesAnnuelles">Charges annuelles (€)</Label>
                          <Input id="acte_chargesAnnuelles" type="number" value={acteVenteData.chargesAnnuelles} onChange={(e) => setActeVenteData({...acteVenteData, chargesAnnuelles: e.target.value})} />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* État juridique */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">⚖️ État juridique du bien</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="acte_servitudes">Servitudes existantes</Label>
                      <Textarea id="acte_servitudes" value={acteVenteData.servitudesExistantes} onChange={(e) => setActeVenteData({...acteVenteData, servitudesExistantes: e.target.value})} rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_hypotheques">Hypothèques / Inscriptions existantes</Label>
                      <Textarea id="acte_hypotheques" value={acteVenteData.hypotheques} onChange={(e) => setActeVenteData({...acteVenteData, hypotheques: e.target.value})} rows={2} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="acte_bienLibre">Bien libre ou occupé à l'acte ?</Label>
                        <Select value={acteVenteData.bienLibreOuOccupe} onValueChange={(value) => setActeVenteData({...acteVenteData, bienLibreOuOccupe: value})}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="libre">Libre</SelectItem>
                            <SelectItem value="occupe">Occupé</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {acteVenteData.bienLibreOuOccupe === "occupe" && (
                        <div className="space-y-2">
                          <Label htmlFor="acte_infoBail">Informations sur le bail</Label>
                          <Input id="acte_infoBail" value={acteVenteData.informationsBail} onChange={(e) => setActeVenteData({...acteVenteData, informationsBail: e.target.value})} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Conditions financières */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">💶 Conditions financières</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="acte_prixVente">Prix de vente (€) *</Label>
                      <Input id="acte_prixVente" type="number" value={acteVenteData.prixVente} onChange={(e) => setActeVenteData({...acteVenteData, prixVente: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_origineFonds">Origine des fonds</Label>
                      <Input id="acte_origineFonds" value={acteVenteData.origineFonds} onChange={(e) => setActeVenteData({...acteVenteData, origineFonds: e.target.value})} placeholder="Épargne / Revente / Prêt" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_depotGarantie">Dépôt de garantie versé (€)</Label>
                      <Input id="acte_depotGarantie" type="number" value={acteVenteData.depotGarantie} onChange={(e) => setActeVenteData({...acteVenteData, depotGarantie: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_fraisNotaire">Frais de notaire estimés (€)</Label>
                      <Input id="acte_fraisNotaire" type="number" value={acteVenteData.fraisNotaire} onChange={(e) => setActeVenteData({...acteVenteData, fraisNotaire: e.target.value})} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="acte_repartition">Répartition prorata temporis</Label>
                      <Textarea id="acte_repartition" value={acteVenteData.repartitionProrata} onChange={(e) => setActeVenteData({...acteVenteData, repartitionProrata: e.target.value})} rows={2} placeholder="Taxe foncière, charges, loyers..." />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="acte_modalitesPaiement">Modalités de paiement</Label>
                      <Textarea id="acte_modalitesPaiement" value={acteVenteData.modalitesPaiement} onChange={(e) => setActeVenteData({...acteVenteData, modalitesPaiement: e.target.value})} rows={2} placeholder="Virement notarial / Prêts bancaires" />
                    </div>
                  </div>
                </div>

                {/* Prêt immobilier */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">🏦 Prêt immobilier</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="acte_pretImmobilier">Achat financé par prêt ?</Label>
                      <Select value={acteVenteData.pretImmobilier} onValueChange={(value) => setActeVenteData({...acteVenteData, pretImmobilier: value})}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="oui">Oui</SelectItem>
                          <SelectItem value="non">Non</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {acteVenteData.pretImmobilier === "oui" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                        <div className="space-y-2">
                          <Label htmlFor="acte_montantPret">Montant du prêt (€) *</Label>
                          <Input id="acte_montantPret" type="number" value={acteVenteData.montantPret} onChange={(e) => setActeVenteData({...acteVenteData, montantPret: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="acte_banque">Banque prêteuse *</Label>
                          <Input id="acte_banque" value={acteVenteData.banquePreteur} onChange={(e) => setActeVenteData({...acteVenteData, banquePreteur: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="acte_tauxPret">Taux réel obtenu (%) *</Label>
                          <Input id="acte_tauxPret" type="number" step="0.01" value={acteVenteData.tauxPret} onChange={(e) => setActeVenteData({...acteVenteData, tauxPret: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="acte_dureePret">Durée du prêt (années) *</Label>
                          <Input id="acte_dureePret" type="number" value={acteVenteData.dureePret} onChange={(e) => setActeVenteData({...acteVenteData, dureePret: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="acte_typePret">Type de prêt *</Label>
                          <Input id="acte_typePret" value={acteVenteData.typePret} onChange={(e) => setActeVenteData({...acteVenteData, typePret: e.target.value})} placeholder="Amortissable / Relais / PTZ" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="acte_dateAccordPret">Date accord de prêt *</Label>
                          <Input id="acte_dateAccordPret" type="date" value={acteVenteData.dateAccordPret} onChange={(e) => setActeVenteData({...acteVenteData, dateAccordPret: e.target.value})} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="acte_conditionsPret">Conditions particulières du prêt</Label>
                          <Textarea id="acte_conditionsPret" value={acteVenteData.conditionsPret} onChange={(e) => setActeVenteData({...acteVenteData, conditionsPret: e.target.value})} rows={2} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Documents et diagnostics */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">📜 Documents & diagnostics obligatoires</h3>
                  <div className="space-y-2">
                    <Label htmlFor="acte_diagnostics">Diagnostics fournis</Label>
                    <Textarea id="acte_diagnostics" value={acteVenteData.diagnosticsFournis} onChange={(e) => setActeVenteData({...acteVenteData, diagnosticsFournis: e.target.value})} rows={4} placeholder="DPE, Amiante, Plomb, Termites, Électricité, Gaz, Assainissement, Loi Carrez, ERP, Audit énergétique..." />
                  </div>
                  <div className="space-y-2">
                    <Label>📎 Joindre les diagnostics et documents obligatoires</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 hover:border-muted-foreground/50 transition-colors">
                      <input
                        type="file"
                        accept="application/pdf"
                        multiple
                        className="hidden"
                        id="acte-diagnostics-upload"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            toast.success(`${files.length} document(s) sélectionné(s): ${files.map(f => f.name).join(', ')}`);
                          }
                        }}
                      />
                      <label htmlFor="acte-diagnostics-upload" className="cursor-pointer flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium">Cliquez pour parcourir</p>
                          <p className="text-xs text-muted-foreground">DPE, diagnostics, titre de propriété, plans...</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Déclarations vendeur */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Déclarations & attestations du vendeur</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="acte_origineDate">Date d'acquisition précédente *</Label>
                      <Input id="acte_origineDate" type="date" value={acteVenteData.origineProprieteDateAcquisition} onChange={(e) => setActeVenteData({...acteVenteData, origineProprieteDateAcquisition: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_origineRef">Référence acte d'acquisition *</Label>
                      <Input id="acte_origineRef" value={acteVenteData.origineReferenceActe} onChange={(e) => setActeVenteData({...acteVenteData, origineReferenceActe: e.target.value})} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="acte_travaux">Travaux réalisés (10 dernières années)</Label>
                      <Textarea id="acte_travaux" value={acteVenteData.travauxDerniers10ans} onChange={(e) => setActeVenteData({...acteVenteData, travauxDerniers10ans: e.target.value})} rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_conformiteUrbanisme">Conformité urbanisme</Label>
                      <Input id="acte_conformiteUrbanisme" value={acteVenteData.conformiteUrbanisme} onChange={(e) => setActeVenteData({...acteVenteData, conformiteUrbanisme: e.target.value})} placeholder="Permis, déclarations..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_assuranceDO">Assurance dommage-ouvrage</Label>
                      <Input id="acte_assuranceDO" value={acteVenteData.assuranceDommageOuvrage} onChange={(e) => setActeVenteData({...acteVenteData, assuranceDommageOuvrage: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_taxesFoncieres">Taxes foncières N-1 (€)</Label>
                      <Input id="acte_taxesFoncieres" type="number" value={acteVenteData.taxesFoncieres} onChange={(e) => setActeVenteData({...acteVenteData, taxesFoncieres: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_sinistre">Sinistre récent ?</Label>
                      <Select value={acteVenteData.sinistreRecent} onValueChange={(value) => setActeVenteData({...acteVenteData, sinistreRecent: value})}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="oui">Oui</SelectItem>
                          <SelectItem value="non">Non</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Urbanisme */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">🏛️ Urbanisme</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="acte_zonePLU">Zone PLU / POS</Label>
                      <Input id="acte_zonePLU" value={acteVenteData.zonePLU} onChange={(e) => setActeVenteData({...acteVenteData, zonePLU: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_droitPreemption">Droit de préemption</Label>
                      <Input id="acte_droitPreemption" value={acteVenteData.droitPreemption} onChange={(e) => setActeVenteData({...acteVenteData, droitPreemption: e.target.value})} placeholder="Exercé / Levé + date" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="acte_declarationsUrbanisme">Déclarations d'urbanisme passées</Label>
                      <Textarea id="acte_declarationsUrbanisme" value={acteVenteData.declarationsUrbanisme} onChange={(e) => setActeVenteData({...acteVenteData, declarationsUrbanisme: e.target.value})} rows={2} placeholder="DP, permis de construire, etc." />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="acte_documentsUrbanisme">Documents d'urbanisme fournis</Label>
                      <Input id="acte_documentsUrbanisme" value={acteVenteData.documentsUrbanisme} onChange={(e) => setActeVenteData({...acteVenteData, documentsUrbanisme: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* Délais et signature */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">📅 Délais & modalités de signature</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="acte_dateSignature">Date de signature de l'acte *</Label>
                      <Input id="acte_dateSignature" type="date" value={acteVenteData.dateSignatureActe} onChange={(e) => setActeVenteData({...acteVenteData, dateSignatureActe: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_lieuSignature">Lieu de signature *</Label>
                      <Input id="acte_lieuSignature" value={acteVenteData.lieuSignature} onChange={(e) => setActeVenteData({...acteVenteData, lieuSignature: e.target.value})} placeholder="Étude notariale" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_remiseCles">Remise des clés</Label>
                      <Select value={acteVenteData.remiseCles} onValueChange={(value) => setActeVenteData({...acteVenteData, remiseCles: value})}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="signature">À la signature</SelectItem>
                          <SelectItem value="differee">Différée</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_procuration">Procuration ?</Label>
                      <Select value={acteVenteData.procuration} onValueChange={(value) => setActeVenteData({...acteVenteData, procuration: value})}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="oui">Oui</SelectItem>
                          <SelectItem value="non">Non</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {acteVenteData.procuration === "oui" && (
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="acte_mandataire">Identité du mandataire</Label>
                        <Input id="acte_mandataire" value={acteVenteData.identiteMandataire} onChange={(e) => setActeVenteData({...acteVenteData, identiteMandataire: e.target.value})} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Annexes */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">🧩 Annexes à joindre</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="acte_titrePropriete">Titre de propriété précédent</Label>
                      <Input id="acte_titrePropriete" value={acteVenteData.titrePropriete} onChange={(e) => setActeVenteData({...acteVenteData, titrePropriete: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_diagnosticsAnnexes">Diagnostics (fichiers)</Label>
                      <Input id="acte_diagnosticsAnnexes" value={acteVenteData.diagnostics} onChange={(e) => setActeVenteData({...acteVenteData, diagnostics: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_plan">Plan du bien</Label>
                      <Input id="acte_plan" value={acteVenteData.planBien} onChange={(e) => setActeVenteData({...acteVenteData, planBien: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_reglementCoproAnnexe">Copie règlement de copropriété</Label>
                      <Input id="acte_reglementCoproAnnexe" value={acteVenteData.reglementCopropriete} onChange={(e) => setActeVenteData({...acteVenteData, reglementCopropriete: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_etatDate">État daté</Label>
                      <Input id="acte_etatDate" value={acteVenteData.etatDate} onChange={(e) => setActeVenteData({...acteVenteData, etatDate: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_attestationAssurance">Attestation d'assurance (PNO)</Label>
                      <Input id="acte_attestationAssurance" value={acteVenteData.attestationAssurance} onChange={(e) => setActeVenteData({...acteVenteData, attestationAssurance: e.target.value})} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="acte_releveSyndic">Relevé du syndic</Label>
                      <Input id="acte_releveSyndic" value={acteVenteData.releveSyndic} onChange={(e) => setActeVenteData({...acteVenteData, releveSyndic: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* Informations complémentaires */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">🎯 Informations complémentaires</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="acte_travauxPrevus">Travaux prévus par la copropriété</Label>
                      <Textarea id="acte_travauxPrevus" value={acteVenteData.travauxPrevusCopro} onChange={(e) => setActeVenteData({...acteVenteData, travauxPrevusCopro: e.target.value})} rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_procedures">Procédures en cours</Label>
                      <Textarea id="acte_procedures" value={acteVenteData.proceduresEnCours} onChange={(e) => setActeVenteData({...acteVenteData, proceduresEnCours: e.target.value})} rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_differends">Différends connus avec un voisin</Label>
                      <Textarea id="acte_differends" value={acteVenteData.differendsVoisins} onChange={(e) => setActeVenteData({...acteVenteData, differendsVoisins: e.target.value})} rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_particularites">Particularités du bien</Label>
                      <Textarea id="acte_particularites" value={acteVenteData.particularitesBien} onChange={(e) => setActeVenteData({...acteVenteData, particularitesBien: e.target.value})} rows={3} />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Formulaire spécifique pour Bail d'habitation */}
            {(pendingContractType === "Bail d'habitation vide" || pendingContractType === "Bail d'habitation meublé") && (
              <>
                {/* Sélection du bailleur */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">👤 Bailleur (client)</h3>
                  <div className="space-y-2">
                    <Label htmlFor="bail_bailleur">Sélectionner le client bailleur *</Label>
                    <Select value={bailHabitationData.bailleurClientId} onValueChange={(value) => setBailHabitationData({...bailHabitationData, bailleurClientId: value})}>
                      <SelectTrigger><SelectValue placeholder="Choisir un client" /></SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>{client.nom} {client.prenom}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {bailHabitationData.bailleurClientId && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
                      <p className="font-medium">✓ Informations automatiquement remplies depuis la fiche client</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nom *</Label>
                      <Input value={bailHabitationData.bailleurNom} onChange={(e) => setBailHabitationData({...bailHabitationData, bailleurNom: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Prénom *</Label>
                      <Input value={bailHabitationData.bailleurPrenom} onChange={(e) => setBailHabitationData({...bailHabitationData, bailleurPrenom: e.target.value})} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Adresse *</Label>
                      <Input value={bailHabitationData.bailleurAdresse} onChange={(e) => setBailHabitationData({...bailHabitationData, bailleurAdresse: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* Locataire */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">👥 Locataire</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nom *</Label>
                      <Input value={bailHabitationData.locataireNom} onChange={(e) => setBailHabitationData({...bailHabitationData, locataireNom: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Prénom *</Label>
                      <Input value={bailHabitationData.locatairePrenom} onChange={(e) => setBailHabitationData({...bailHabitationData, locatairePrenom: e.target.value})} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Adresse actuelle *</Label>
                      <Input value={bailHabitationData.locataireAdresse} onChange={(e) => setBailHabitationData({...bailHabitationData, locataireAdresse: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Date de naissance *</Label>
                      <Input type="date" value={bailHabitationData.locataireDateNaissance} onChange={(e) => setBailHabitationData({...bailHabitationData, locataireDateNaissance: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Lieu de naissance *</Label>
                      <Input value={bailHabitationData.locataireLieuNaissance} onChange={(e) => setBailHabitationData({...bailHabitationData, locataireLieuNaissance: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Profession *</Label>
                      <Input value={bailHabitationData.locataireProfession} onChange={(e) => setBailHabitationData({...bailHabitationData, locataireProfession: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Statut matrimonial *</Label>
                      <Input value={bailHabitationData.locataireStatutMatrimonial} onChange={(e) => setBailHabitationData({...bailHabitationData, locataireStatutMatrimonial: e.target.value})} placeholder="Ex: Célibataire, Marié..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Nombre d'occupants *</Label>
                      <Input type="number" value={bailHabitationData.nombreOccupants} onChange={(e) => setBailHabitationData({...bailHabitationData, nombreOccupants: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>📎 Documents du locataire (pièce d'identité, justificatifs de revenus)</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        multiple
                        className="hidden"
                        id="locataire-docs-upload"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            toast.success(`${files.length} document(s) sélectionné(s)`);
                          }
                        }}
                      />
                      <label htmlFor="locataire-docs-upload" className="cursor-pointer flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Joindre les documents</p>
                          <p className="text-xs text-muted-foreground">PDF, images acceptés</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Logement */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">🏠 Logement</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Adresse complète du logement *</Label>
                      <Input value={bailHabitationData.adresseLogement} onChange={(e) => setBailHabitationData({...bailHabitationData, adresseLogement: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Type de logement *</Label>
                      <Input value={bailHabitationData.typeLogement} onChange={(e) => setBailHabitationData({...bailHabitationData, typeLogement: e.target.value})} placeholder="Ex: T2, Studio, Maison..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Étage / N° appartement</Label>
                      <Input value={bailHabitationData.etageNumeroLot} onChange={(e) => setBailHabitationData({...bailHabitationData, etageNumeroLot: e.target.value})} placeholder="Ex: 3ème étage, Appt 12..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Surface habitable (m²) *</Label>
                      <Input type="number" value={bailHabitationData.surfaceHabitable} onChange={(e) => setBailHabitationData({...bailHabitationData, surfaceHabitable: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Logement en copropriété ? *</Label>
                      <Select value={bailHabitationData.logementCopropriete} onValueChange={(value) => setBailHabitationData({...bailHabitationData, logementCopropriete: value})}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="oui">Oui</SelectItem>
                          <SelectItem value="non">Non</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {bailHabitationData.logementCopropriete === "oui" && (
                      <div className="space-y-2">
                        <Label>Règlement de copropriété fourni ?</Label>
                        <Select value={bailHabitationData.reglementCoproFourni} onValueChange={(value) => setBailHabitationData({...bailHabitationData, reglementCoproFourni: value})}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="oui">Oui</SelectItem>
                            <SelectItem value="non">Non</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2 md:col-span-2">
                      <Label>Dépendances incluses *</Label>
                      <div className="flex flex-wrap gap-3">
                        {["Cave", "Parking", "Grenier", "Jardin"].map((dep) => (
                          <label key={dep} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={bailHabitationData.dependances.includes(dep)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setBailHabitationData({...bailHabitationData, dependances: [...bailHabitationData.dependances, dep]});
                                } else {
                                  setBailHabitationData({...bailHabitationData, dependances: bailHabitationData.dependances.filter(d => d !== dep)});
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm">{dep}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nature du bailleur et durée */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">⚖️ Nature du bailleur et durée du bail</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nature du bailleur *</Label>
                      <Select value={bailHabitationData.natureBailleur} onValueChange={(value) => setBailHabitationData({...bailHabitationData, natureBailleur: value})}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="physique">Personne physique (3 ans pour bail vide)</SelectItem>
                          <SelectItem value="morale">Personne morale (6 ans pour bail vide)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Résidence principale du locataire ? *</Label>
                      <Select value={bailHabitationData.residencePrincipale} onValueChange={(value) => setBailHabitationData({...bailHabitationData, residencePrincipale: value})}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="oui">Oui</SelectItem>
                          <SelectItem value="non">Non</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Garant */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">👥 Garant (si applicable)</h3>
                  <div className="space-y-2">
                    <Label>A-t-il un garant ?</Label>
                    <Select value={bailHabitationData.aGarant} onValueChange={(value) => setBailHabitationData({...bailHabitationData, aGarant: value})}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oui">Oui</SelectItem>
                        <SelectItem value="non">Non</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {bailHabitationData.aGarant === "oui" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                      <div className="space-y-2">
                        <Label>Nom du garant *</Label>
                        <Input value={bailHabitationData.garantNom} onChange={(e) => setBailHabitationData({...bailHabitationData, garantNom: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Prénom *</Label>
                        <Input value={bailHabitationData.garantPrenom} onChange={(e) => setBailHabitationData({...bailHabitationData, garantPrenom: e.target.value})} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Adresse *</Label>
                        <Input value={bailHabitationData.garantAdresse} onChange={(e) => setBailHabitationData({...bailHabitationData, garantAdresse: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Date de naissance *</Label>
                        <Input type="date" value={bailHabitationData.garantDateNaissance} onChange={(e) => setBailHabitationData({...bailHabitationData, garantDateNaissance: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Lieu de naissance *</Label>
                        <Input value={bailHabitationData.garantLieuNaissance} onChange={(e) => setBailHabitationData({...bailHabitationData, garantLieuNaissance: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Profession *</Label>
                        <Input value={bailHabitationData.garantProfession} onChange={(e) => setBailHabitationData({...bailHabitationData, garantProfession: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Type de caution *</Label>
                        <Select value={bailHabitationData.typeCaution} onValueChange={(value) => setBailHabitationData({...bailHabitationData, typeCaution: value})}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="simple">Caution simple</SelectItem>
                            <SelectItem value="solidaire">Caution solidaire</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>📎 Documents du garant (pièce d'identité, justificatifs de revenus)</Label>
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            multiple
                            className="hidden"
                            id="garant-docs-upload"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              if (files.length > 0) {
                                toast.success(`${files.length} document(s) du garant sélectionné(s)`);
                              }
                            }}
                          />
                          <label htmlFor="garant-docs-upload" className="cursor-pointer flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">Joindre les documents du garant</p>
                              <p className="text-xs text-muted-foreground">PDF, images acceptés</p>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Conditions financières */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">💶 Conditions financières</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Loyer mensuel (€) *</Label>
                      <Input type="number" value={bailHabitationData.loyerMensuel} onChange={(e) => setBailHabitationData({...bailHabitationData, loyerMensuel: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Charges mensuelles (€)</Label>
                      <Input type="number" value={bailHabitationData.chargesMensuelles} onChange={(e) => setBailHabitationData({...bailHabitationData, chargesMensuelles: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Type de charges *</Label>
                      <Select value={bailHabitationData.typeCharges} onValueChange={(value) => setBailHabitationData({...bailHabitationData, typeCharges: value})}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="provision">Provision + régularisation annuelle</SelectItem>
                          <SelectItem value="forfait">Forfait</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Dépôt de garantie (€) *</Label>
                      <Input type="number" value={bailHabitationData.depotGarantie} onChange={(e) => setBailHabitationData({...bailHabitationData, depotGarantie: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Révision du loyer prévue ? *</Label>
                      <Select value={bailHabitationData.revisionLoyerPrevue} onValueChange={(value) => setBailHabitationData({...bailHabitationData, revisionLoyerPrevue: value})}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="oui">Oui</SelectItem>
                          <SelectItem value="non">Non</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {bailHabitationData.revisionLoyerPrevue === "oui" && (
                      <div className="space-y-2">
                        <Label>Trimestre de référence IRL *</Label>
                        <Input value={bailHabitationData.trimestreReference} onChange={(e) => setBailHabitationData({...bailHabitationData, trimestreReference: e.target.value})} placeholder="Ex: 2e trimestre 2025" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Type de bail</Label>
                      <Select value={bailHabitationData.typeBail} onValueChange={(value) => setBailHabitationData({...bailHabitationData, typeBail: value})}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vide">Location vide</SelectItem>
                          <SelectItem value="meuble">Location meublée</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">📅 Dates du bail</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date de début du bail *</Label>
                      <Input type="date" value={bailHabitationData.dateDebutBail} onChange={(e) => setBailHabitationData({...bailHabitationData, dateDebutBail: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Durée du bail</Label>
                      <Select value={bailHabitationData.typeBailDuree} onValueChange={(value) => setBailHabitationData({...bailHabitationData, typeBailDuree: value})}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3ans">3 ans (vide)</SelectItem>
                          <SelectItem value="6ans">6 ans (vide - personne morale)</SelectItem>
                          <SelectItem value="1an">1 an (meublé)</SelectItem>
                          <SelectItem value="9mois">9 mois (étudiant)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Caractéristiques techniques ALUR */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">🔌 Caractéristiques techniques (obligatoires ALUR)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type de chauffage *</Label>
                      <Select value={bailHabitationData.typeChauffage} onValueChange={(value) => setBailHabitationData({...bailHabitationData, typeChauffage: value})}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="electrique">Électrique</SelectItem>
                          <SelectItem value="gaz">Gaz</SelectItem>
                          <SelectItem value="fioul">Fioul</SelectItem>
                          <SelectItem value="collectif">Collectif</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Compteurs individuels ? *</Label>
                      <Select value={bailHabitationData.compteursIndividuels} onValueChange={(value) => setBailHabitationData({...bailHabitationData, compteursIndividuels: value})}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="oui">Oui</SelectItem>
                          <SelectItem value="non">Non</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Relevé des compteurs à l'entrée</Label>
                      <Input value={bailHabitationData.releveCompteurs} onChange={(e) => setBailHabitationData({...bailHabitationData, releveCompteurs: e.target.value})} placeholder="Électricité: XX kWh, Eau: XX m3..." />
                    </div>
                  </div>
                </div>

                {/* Diagnostics obligatoires */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">📁 Diagnostics obligatoires</h3>
                  <div className="space-y-2">
                    <Label>Diagnostics fournis ? *</Label>
                    <Select value={bailHabitationData.diagnosticsFournis} onValueChange={(value) => setBailHabitationData({...bailHabitationData, diagnosticsFournis: value})}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oui">Oui - Tous les diagnostics obligatoires sont fournis</SelectItem>
                        <SelectItem value="non">Non - Diagnostics manquants</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                    <p className="font-medium mb-2">Diagnostics obligatoires pour un bail vide :</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>DPE (Diagnostic de Performance Énergétique)</li>
                      <li>État de l'installation électrique (si + de 15 ans)</li>
                      <li>État de l'installation gaz (si + de 15 ans)</li>
                      <li>ERP (État des Risques et Pollutions)</li>
                      <li>CREP - Plomb (si immeuble avant 1949)</li>
                      <li>Amiante (information obligatoire)</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <Label>📎 Joindre les diagnostics (PDF)</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 hover:border-muted-foreground/50 transition-colors">
                      <input
                        type="file"
                        accept="application/pdf"
                        multiple
                        className="hidden"
                        id="diagnostics-upload"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            toast.success(`${files.length} fichier(s) sélectionné(s): ${files.map(f => f.name).join(', ')}`);
                          }
                        }}
                      />
                      <label htmlFor="diagnostics-upload" className="cursor-pointer flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium">Cliquez pour parcourir</p>
                          <p className="text-xs text-muted-foreground">Depuis votre ordinateur ou espace Documents</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* État des lieux */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">🛠️ État des lieux</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>État des lieux d'entrée fourni ? *</Label>
                      <Select value={bailHabitationData.etatLieuxFourni} onValueChange={(value) => setBailHabitationData({...bailHabitationData, etatLieuxFourni: value})}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="oui">Oui</SelectItem>
                          <SelectItem value="non">Non - À établir lors de la remise des clés</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Assurance */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">🛡️ Assurance habitation</h3>
                  <div className="space-y-2">
                    <Label>Attestation d'assurance fournie par le locataire ? *</Label>
                    <Select value={bailHabitationData.attestationAssurance} onValueChange={(value) => setBailHabitationData({...bailHabitationData, attestationAssurance: value})}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oui">Oui - Attestation fournie</SelectItem>
                        <SelectItem value="non">Non - À fournir avant la remise des clés</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-sm text-muted-foreground">L'assurance habitation est obligatoire pour le locataire avant l'entrée dans les lieux.</p>
                </div>

                {/* Informations complémentaires */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">🎯 Informations complémentaires</h3>
                  <div className="space-y-2">
                    <Label>Précisions, particularités...</Label>
                    <Textarea 
                      value={bailHabitationData.informationsComplementaires} 
                      onChange={(e) => setBailHabitationData({...bailHabitationData, informationsComplementaires: e.target.value})} 
                      rows={4}
                      placeholder="Garant, travaux récents, diagnostics fournis, assurance, etc."
                    />
                  </div>
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
              onClick={() => {
                if (pendingContractType === "Acte de vente immobilière") {
                  handleActeVenteSubmit();
                } else if (pendingContractType === "Bail d'habitation vide" || pendingContractType === "Bail d'habitation meublé") {
                  handleBailHabitationSubmit();
                } else {
                  handleQuestionnaireSubmit();
                }
              }}
            >
              Créer le contrat
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
