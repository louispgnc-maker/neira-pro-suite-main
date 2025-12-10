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
  const [clients, setClients] = useState<Array<{id: string, nom: string, prenom: string, adresse: string, telephone?: string, email?: string, date_naissance?: string, lieu_naissance?: string, nationalite?: string, profession?: string, situation_matrimoniale?: string, situation_familiale?: string, type_identite?: string, numero_identite?: string}>>([]);

  // States pour les fichiers uploadés
  const [compromisClientIdentiteUrl, setCompromisClientIdentiteUrl] = useState<string | null>(null); // URL du document du client
  const [compromisAutrePartieFiles, setCompromisAutrePartieFiles] = useState<File[]>([]); // Fichiers de l'autre partie
  const [compromisDiagnosticsFiles, setCompromisDiagnosticsFiles] = useState<File[]>([]);
  const [acteClientIdentiteUrl, setActeClientIdentiteUrl] = useState<string | null>(null); // URL du document du client acte
  const [bailClientIdentiteUrl, setBailClientIdentiteUrl] = useState<string | null>(null); // URL du document du client bail
  const [bailCommercialBailleurClientIdentiteUrl, setBailCommercialBailleurClientIdentiteUrl] = useState<string | null>(null); // URL du document du bailleur bail commercial
  const [bailCommercialPreneurClientIdentiteUrl, setBailCommercialPreneurClientIdentiteUrl] = useState<string | null>(null); // URL du document du preneur bail commercial
  const [acteAutrePartieFiles, setActeAutrePartieFiles] = useState<File[]>([]); // Fichiers de l'autre partie acte
  const [acteVendeurFiles, setActeVendeurFiles] = useState<File[]>([]); // Fichiers supplémentaires vendeur
  const [acteAcheteurFiles, setActeAcheteurFiles] = useState<File[]>([]); // Fichiers supplémentaires acheteur
  const [acteDiagnosticsFiles, setActeDiagnosticsFiles] = useState<File[]>([]);
  const [locataireDocsFiles, setLocataireDocsFiles] = useState<File[]>([]);
  const [bailleurIdFiles, setBailleurIdFiles] = useState<File[]>([]); // Pièce d'identité bailleur
  const [locataireIdFiles, setLocataireIdFiles] = useState<File[]>([]); // Documents locataire
  const [inventaireMobilierFiles, setInventaireMobilierFiles] = useState<File[]>([]); // Inventaire mobilier PDF/images
  const [bailCommercialBailleurFiles, setBailCommercialBailleurFiles] = useState<File[]>([]); // Kbis/ID bailleur commercial
  const [bailCommercialLocataireFiles, setBailCommercialLocataireFiles] = useState<File[]>([]); // Kbis/ID locataire commercial
  const [bailCommercialDiagnosticsFiles, setBailCommercialDiagnosticsFiles] = useState<File[]>([]); // Diagnostics bail commercial
  const [bailCommercialCautionFiles, setBailCommercialCautionFiles] = useState<File[]>([]); // Acte de caution
  const [bailCommercialEtatLieuxFiles, setBailCommercialEtatLieuxFiles] = useState<File[]>([]); // État des lieux
  const [bailCommercialCautionIdFiles, setBailCommercialCautionIdFiles] = useState<File[]>([]); // Pièce d'identité caution
  const [bailCommercialAssuranceFiles, setBailCommercialAssuranceFiles] = useState<File[]>([]); // Attestation d'assurance
  const [bailProfessionnelOrdreFiles, setBailProfessionnelOrdreFiles] = useState<File[]>([]); // Attestation inscription ordre professionnel
  const [garantDocsFiles, setGarantDocsFiles] = useState<File[]>([]);
  const [bailDiagnosticsFiles, setBailDiagnosticsFiles] = useState<File[]>([]);
  
  // States pour convention d'indivision
  const [indivisairesIdentiteUrls, setIndivisairesIdentiteUrls] = useState<Record<number, string | null>>({}); // URLs des documents identité indivisaires clients
  const [indivisairesIdentiteFiles, setIndivisairesIdentiteFiles] = useState<Record<number, File[]>>({}); // Fichiers identité indivisaires non-clients
  const [indivisairesDomicileFiles, setIndivisairesDomicileFiles] = useState<Record<number, File[]>>({}); // Justificatifs domicile
  const [indivisairesContratMariageFiles, setIndivisairesContratMariageFiles] = useState<Record<number, File[]>>({}); // Contrats de mariage
  const [indivisairesLivretFamilleFiles, setIndivisairesLivretFamilleFiles] = useState<Record<number, File[]>>({}); // Livrets de famille
  const [indivisionTitreProprietFiles, setIndivisionTitreProprietFiles] = useState<File[]>([]); // Titre de propriété
  const [indivisionEvaluationFiles, setIndivisionEvaluationFiles] = useState<File[]>([]); // Évaluation/estimation
  const [indivisionCadastreFiles, setIndivisionCadastreFiles] = useState<File[]>([]); // Relevé cadastral
  const [indivisionDiagnosticsFiles, setIndivisionDiagnosticsFiles] = useState<File[]>([]); // Diagnostics
  const [indivisionBailFiles, setIndivisionBailFiles] = useState<File[]>([]); // Bail si bien loué
  const [indivisionProcurationFiles, setIndivisionProcurationFiles] = useState<File[]>([]); // Procurations
  const [indivisionMandatGerantFiles, setIndivisionMandatGerantFiles] = useState<File[]>([]); // Mandat du gérant
  
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
    // Bien - Année et annexes
    anneeConstruction: "",
    bienGarage: "",
    bienParking: "",
    bienCave: "",
    bienGrenier: "",
    bienJardin: "",
    autresDependances: "",
    // Bien - Équipements inclus
    cuisineEquipee: "",
    electromenagersInclus: "",
    electromenagersListe: "",
    mobilierLaisse: "",
    autresEquipements: "",
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
    // Si occupé par locataire
    locataireNom: "",
    dateBail: "",
    dureeBail: "",
    montantLoyer: "",
    depotGarantieLocataire: "",
    // Si vendeur occupant
    dateLiberation: "",
    
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
    vendeurPrecisionRegime: "",
    vendeurPieceIdentite: "",
    vendeurNumeroIdentite: "",
    // Vendeur - Type de partie
    vendeurTypePartie: "personne_physique",
    vendeurDenominationSociale: "",
    vendeurFormeJuridique: "",
    vendeurSiren: "",
    vendeurSiegeSocial: "",
    vendeurRepresentantNom: "",
    vendeurRepresentantQualite: "",
    // Vendeur - Représentation
    vendeurRepresente: "",
    vendeurMandataireNom: "",
    vendeurMandatairePrenom: "",
    vendeurTypePouvoir: "",
    
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
    acheteurPrecisionRegime: "",
    acheteurModeAcquisition: "",
    acheteurQuotePart: "",
    // Acheteur - Type de partie
    acheteurTypePartie: "personne_physique",
    acheteurDenominationSociale: "",
    acheteurFormeJuridique: "",
    acheteurSiren: "",
    acheteurSiegeSocial: "",
    acheteurRepresentantNom: "",
    acheteurRepresentantQualite: "",
    // Acheteur - Représentation
    acheteurRepresente: "",
    acheteurMandataireNom: "",
    acheteurMandatairePrenom: "",
    acheteurTypePouvoir: "",
    
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
    tauxMaximal: "",
    conditionSuspensivePret: "",
    
    // Documents et diagnostics
    diagnosticsFournis: "",
    dateDPE: "",
    classeEnergetique: "",
    presenceAmiante: "",
    presencePlomb: "",
    presenceTermites: "",
    assainissementConforme: "",
    
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
    dateEnvoiDIA: "",
    reponseMairieDIA: "",
    
    // Délais et signature
    dateSignatureActe: "",
    lieuSignature: "",
    remiseCles: "",
    remiseClesAnticipee: "",
    dateRemiseAnticipee: "",
    indemnitéOccupation: "",
    montantIndemnite: "",
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
    // Rôle du client
    clientRole: "", // "bailleur" ou "locataire"
    clientId: "",
    
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
    
    // Locataire(s) - saisie manuelle ou client
    locataireClientId: "",
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
    
    // Situation financière du locataire
    locataireRevenusMensuelsNets: "",
    locataireTypeContrat: "",
    locataireEmployeur: "",
    locataireEmployeurAdresse: "",
    locataireAncienneteEmployeur: "",
    
    // Colocation
    colocation: "",
    solidariteColocataires: "",
    nombreColocataires: "",
    colocatairesNoms: "",
    
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
    placeParking: "",
    numeroPlaceParking: "",
    entretienJardin: "",
    logementCopropriete: "",
    reglementCoproFourni: "",
    
    // Si meublé
    typeBail: "", // "vide" ou "meuble"
    contratMeuble: "",
    mobilierListeComplete: [] as string[],
    inventaireFourni: "",
    inventaireMobilierTexte: "",
    etatMobilierEntree: "",
    entretienMobilier: "", // "locataire" ou "bailleur"
    
    // Liste légale mobilier minimal (décret 2015-981)
    mobilierLiterie: false,
    mobilierOccultation: false,
    mobilierPlaquesCuisson: false,
    mobilierFourMicroondes: false,
    mobilierRefrigo: false,
    mobilierCongelateur: false,
    mobilierVaisselle: false,
    mobilierUstensiles: false,
    mobilierTable: false,
    mobilierSieges: false,
    mobilierEtageres: false,
    mobilierLampes: false,
    mobilierMaterielEntretien: false,
    
    // Type et durée bail meublé
    typeDureeMeuble: "", // "1an" "9mois" "mobilite"
    motifBailMobilite: "", // si bail mobilité
    
    // Nature du bailleur
    natureBailleur: "", // "physique" ou "morale"
    
    // Usage
    residencePrincipale: "", // Oui/Non - obligatoire pour bail vide
    destinationBien: "",
    souslocationAutorisee: "",
    colocationPossible: "",
    animauxAutorises: "",
    precisionAnimaux: "",
    
    // Conditions financières
    loyerMensuel: "",
    chargesMensuelles: "",
    typeCharges: "", // "provision" ou "forfait"
    typologieCharges: "",
    depotGarantie: "",
    premierLoyerDate: "",
    modePaiement: "",
    ibanBailleur: "",
    periodiciteRegularisationCharges: "",
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
    travauxDerniers6Mois: "",
    descriptionTravaux: "",
    
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
    
    // Remise des clés
    nombreJeuxCles: "",
    typesCles: [] as string[], // portes, boites_aux_lettres, garage, badges
    codesFournis: "", // WIFI, interphone, digicode...
  });

  // State pour le bail commercial
  const [bailCommercialData, setBailCommercialData] = useState({
    // Type de bail
    typeBail: "commercial", // "commercial" ou "professionnel"
    
    // Rôle du client
    clientRole: "", // "bailleur" ou "preneur"
    clientId: "",
    
    // Bailleur personne physique
    bailleurClientId: "",
    statutBailleur: "", // "physique" ou "morale"
    bailleurNom: "",
    bailleurPrenom: "",
    bailleurAdresse: "",
    bailleurDateNaissance: "",
    bailleurLieuNaissance: "",
    bailleurNationalite: "",
    bailleurSituationFamiliale: "", // célibataire, marié, divorcé, veuf
    bailleurRegimeMatrimonial: "", // si marié: communauté, séparation, etc.
    bailleurProfession: "",
    
    // Bailleur personne morale
    bailleurDenomination: "",
    bailleurFormeJuridique: "",
    bailleurSiren: "",
    bailleurSiret: "",
    bailleurSiegeSocial: "",
    bailleurCapitalSocial: "",
    bailleurRepresentant: "",
    bailleurRepresentantPrenom: "",
    bailleurRepresentantFonction: "",
    bailleurRepresentantEstLegal: "", // "oui" ou "non"
    bailleurMandataireNom: "",
    bailleurMandatairePrenom: "",
    bailleurMandataireTypePouvoir: "",
    
    // Preneur (locataire) personne physique
    locataireClientId: "",
    statutLocataire: "", // "physique" ou "morale"
    locataireNom: "",
    locatairePrenom: "",
    locataireAdresse: "",
    locataireDateNaissance: "",
    locataireLieuNaissance: "",
    locataireNationalite: "",
    locataireSituationFamiliale: "", // célibataire, marié, divorcé, veuf
    locataireRegimeMatrimonial: "", // si marié: communauté, séparation, etc.
    locataireProfession: "",
    locataireTelephone: "",
    locataireEmail: "",
    locataireExerceEnNomPropre: "", // "oui" ou "non"
    locataireActivite: "",
    locataireSirenPersonnel: "",
    locataireEntrepriseEnCreation: "", // "oui" ou "non"
    
    // Preneur personne morale
    locataireImmatriculation: "",
    locataireDenomination: "",
    locataireFormeJuridique: "",
    locataireSiege: "",
    locataireSiren: "",
    locataireSiret: "",
    locataireObjetSocial: "",
    locataireCapital: "",
    locataireRepresentant: "",
    locataireRepresentantPrenom: "",
    locataireRepresentantFonction: "",
    locataireMandataireNom: "",
    locataireMandatairePrenom: "",
    locataireMandataireTypePouvoir: "",
    
    // Activité (1. Destination des lieux)
    activitePrincipale: "",
    activitesAnnexes: "",
    destinationBail: "",
    destinationContractuelle: "", // Description précise des activités autorisées (commercial uniquement)
    exclusivitesEventuelles: "", // Exclusivités accordées (commercial uniquement)
    interdictionsUsage: "", // Activités interdites (commercial uniquement)
    clauseExclusivite: "",
    clauseNonConcurrence: "",
    
    // Bail professionnel spécifique
    typeProfession: "", // libérale_reglementee / libérale_non_reglementee
    numeroOrdreProfessionnel: "",
    assuranceRCPro: "", // oui / non
    assuranceLocaux: "", // oui / non
    clauseResiliationTriennale: "", // oui / non
    preavisResiliation: "", // 6 mois standard
    
    // Local commercial
    adresseLocal: "",
    natureLocal: "",
    surfaceTotale: "",
    lotsCopropriete: "",
    etageNumero: "",
    partiesPrivatives: [] as string[], // cave, sous-sol, mezzanine, parking, terrasse
    longueurVitrine: "",
    accesLivraison: "",
    etatGeneral: "",
    
    // Travaux
    travauxBailleur: "",
    travauxLocataire: "",
    etatLocalRemise: "",
    diagnosticAmiante: "",
    
    // Durée
    dureeBail: "", // "3-6-9" "derogatoire" "saisonnier"
    datePriseEffet: "",
    dureeTotale: "",
    renouvellementAuto: "",
    
    // Conditions financières (2. Clause de révision du loyer)
    loyerAnnuelHT: "",
    loyerMensuelHT: "",
    modalitePaiement: "", // mensuel, trimestriel
    typeIndexation: "", // ILC, ILAT
    indiceApplicable: "", // ILC / ILAT
    baseCalculIndice: "", // Année de base
    modaliteRevision: "", // annuelle / triennale
    chargesMensuelles: "",
    typeCharges: "", // provisions, forfait
    modeReglementCharges: "", // Forfait ou Provision avec régularisation
    depotGarantie: "", // 3. Dépôt de garantie
    montantDepotGarantie: "",
    restitutionDepot: "", // Modalités de restitution
    modePaiementLoyer: "", // virement, prelevement, cheque
    ibanBailleur: "",
    
    // Charges & travaux (4. Travaux et réparations)
    chargesLocataire: [] as string[], // eau, electricite, chauffage, entretien, copro, teom, taxe_fonciere
    chargesBailleur: [] as string[], // gros_travaux, mise_conformite, ravalement, remplacement, structurel
    chargesSupporteesBailleur: "", // Description des charges du bailleur
    chargesSupporteesPreneur: "", // Description des charges du preneur
    travauxChargeBailleur: "", // Travaux à la charge du bailleur
    travauxChargePreneur: "", // Travaux à la charge du preneur
    compteursIndividuels: "",
    
    // 5. Impôts et taxes
    taxeFonciereSupporteePar: "", // bailleur ou locataire
    taxesRecuperables: "", // Description des taxes récupérables
    
    // Garanties (9. Garanties)
    cautionPersonnelle: "",
    cautionPersonnelleOuiNon: "", // Oui / Non
    nomCaution: "",
    prenomCaution: "",
    montantGaranti: "",
    garantieBancaire: "",
    dureeGarantie: "",
    
    // Diagnostics
    diagnosticDPE: "",
    diagnosticAmianteDTA: "",
    diagnosticERP: "",
    diagnosticElectricite: "",
    diagnosticGaz: "",
    accessibiliteHandicapes: "",
    
    // État des lieux (6. État des lieux)
    etatLieuxJoint: "",
    etatLieuxRealise: "", // Oui / Non
    etatEquipements: "",
    
    // Remise des clés
    nombreJeuxCles: "",
    typesCles: [] as string[],
    codesAcces: "",
    
    // Clauses juridiques (8. Sous-location & cession)
    clauseResolutoire: "",
    resiliationTriennale: "",
    clauseAssurances: "",
    souslocationAutorisee: "", // Oui / Non
    souslocationConditions: "", // Conditions si autorisée
    cessionBailAutorisee: "", // Oui / Non
    cessionConditions: "", // Conditions (agrément du bailleur...)
    
    // 10. Assurance obligatoire
    assuranceMultirisqueSouscrite: "", // Oui / Non
    nomAssureur: "",
    numeropolice: "",
    
    // Infos complémentaires
    particularitesLocal: "",
    conditionsSpecifiques: "",
    restrictionsUsage: "",
    horairesOuverture: "",
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

  // State pour convention d'indivision
  const [indivisionData, setIndivisionData] = useState({
    // Informations générales
    typeBien: "immobilier", // immobilier / mobilier / autre
    origine: "", // succession / achat_commun / investissement / donation / autre
    objet: "", // Texte libre
    
    // Indivisaires (tableau)
    indivisaires: [{
      id: 1,
      isClient: false, // true si c'est un de nos clients
      clientId: "",
      nom: "",
      prenom: "",
      adresse: "",
      dateNaissance: "",
      lieuNaissance: "",
      nationalite: "",
      profession: "",
      statutMatrimonial: "", // celibataire / marie / pacse / divorce / veuf
      regimeMatrimonial: "", // communaute / separation / participation / autre
      typeIdentite: "",
      numeroIdentite: "",
      email: "",
      telephone: "",
      quotePart: "", // % de propriété
      origineQuotePart: "", // heritage / achat / donation...
      origineQuotePartAutre: "", // Si origine = autre
    }],
    
    // Description du bien
    description: {
      typeBien: "immobilier",
      immobilier: {
        adresse: "",
        nature: "", // maison / appartement / terrain / immeuble / local_commercial / autre
        description: "",
        surface: "",
        cadastre: "",
        etatLocatif: "", // libre / loue / occupe
        loyer: "",
        valeurVenale: "",
      },
      mobilier: {
        description: "",
        valeurEstimee: "",
        numerosIdentification: "",
      }
    },
    
    // Durée de la convention
    duree: {
      type: "indeterminee", // indeterminee / determinee
      annees: "", // Si déterminée (max 5 ans)
      conditionsRenouvellement: "",
      conditionsSortie: "",
    },
    
    // Gestion
    gestion: {
      gerant: "",
      pouvoirs: {
        gestion_courante: false,
        travaux: false,
        representation: false,
        signature_actes: false,
      },
      decisions: "", // unanimite / majorite_2_3 / majorite_simple
      charges: "",
      compteBancaire: "",
    },
    
    // Utilisation du bien
    utilisation: {
      utilisationParIndivisaires: "non",
      conditionsUtilisation: "",
      indemniteMontant: "",
      indemniteFrequence: "",
      locationAutorisee: "non",
      mandataireLocation: "",
      repartitionLoyers: "",
    },
    
    // Travaux
    travaux: {
      typesAutorises: "",
      decisionRequise: "",
      repartitionCouts: "",
      travauxUrgents: "",
      documentation: "",
    },
    
    // Sortie d'indivisaire
    sortie: {
      venteLibre: "libre", // libre / droit_preemption
      evaluationPart: "", // gerant / accord_indivisaires / expert / juge
      delaiRachat: "",
      modalitesPaiement: "",
    },
    
    // Vente du bien
    vente: {
      conditionsMiseEnVente: "",
      decisionRequise: "", // unanimite / majorite_2_3 / majorite_simple
      mandataire: "",
      repartitionPrix: "",
      gestionPlusValues: "",
    },
    
    // Comptabilité
    comptabilite: {
      registreDepenses: "non",
      archivageFactures: "",
      remboursementAvances: "",
      rapportAnnuel: "non",
    },
    
    // Litiges
    litiges: {
      modesResolution: {
        mediation: false,
        arbitrage: false,
        tribunal: false,
      },
      solidariteDettes: "non",
    },
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
        .select('id, nom, prenom, adresse, telephone, email, date_naissance, lieu_naissance, nationalite, profession, situation_matrimoniale, situation_familiale, type_identite, numero_identite, id_doc_path')
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
        console.log('📋 Client sélectionné:', selectedClient.nom, selectedClient.prenom);
        console.log('📄 id_doc_path:', selectedClient.id_doc_path);
        
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

        // Charger le document d'identité du client si disponible
        if (selectedClient.id_doc_path) {
          console.log('✅ Chargement du document depuis id_doc_path:', selectedClient.id_doc_path);
          // Générer l'URL signée pour accéder au document
          supabase.storage
            .from('documents')
            .createSignedUrl(selectedClient.id_doc_path, 3600)
            .then(({ data, error }) => {
              if (error) {
                console.error('❌ Erreur chargement document:', error);
                setCompromisClientIdentiteUrl(null);
              } else if (data?.signedUrl) {
                console.log('✅ Document chargé avec succès');
                setCompromisClientIdentiteUrl(data.signedUrl);
              }
            });
        } else {
          // Chercher dans client_documents si pas de id_doc_path
          console.log('🔍 Recherche dans client_documents pour client:', selectedClient.id);
          supabase
            .from('client_documents')
            .select('file_path, file_name, document_type')
            .eq('client_id', selectedClient.id)
            .order('uploaded_at', { ascending: false })
            .limit(5) // Prendre les 5 plus récents
            .then(({ data: docs, error: docsError }) => {
              if (docsError) {
                console.error('❌ Erreur recherche documents:', docsError);
                setCompromisClientIdentiteUrl(null);
              } else if (docs && docs.length > 0) {
                console.log(`📄 ${docs.length} document(s) trouvé(s) pour ce client`);
                // Chercher d'abord piece_identite, sinon prendre le premier
                const idDoc = docs.find(d => d.document_type === 'piece_identite') || docs[0];
                console.log('📄 Document sélectionné:', idDoc.file_name, '(type:', idDoc.document_type, ')');
                supabase.storage
                  .from('documents')
                  .createSignedUrl(idDoc.file_path, 3600)
                  .then(({ data, error }) => {
                    if (error) {
                      console.error('❌ Erreur chargement document:', error);
                      setCompromisClientIdentiteUrl(null);
                    } else if (data?.signedUrl) {
                      console.log('✅ Document client_documents chargé avec succès');
                      setCompromisClientIdentiteUrl(data.signedUrl);
                    }
                  });
              } else {
                console.log('⚠️ Aucun document trouvé dans client_documents');
                setCompromisClientIdentiteUrl(null);
              }
            });
        }
      }
    } else {
      setCompromisClientIdentiteUrl(null);
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
            // Remplir les infos du vendeur avec le client
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
            // Vider les champs de l'acheteur
            acheteurNom: "",
            acheteurPrenom: "",
            acheteurAdresse: "",
            acheteurDateNaissance: "",
            acheteurLieuNaissance: "",
            acheteurNationalite: "",
            acheteurProfession: "",
            acheteurStatutMatrimonial: "",
          }));
        } else if (acteVenteData.clientRole === "acheteur") {
          setActeVenteData(prev => ({
            ...prev,
            // Remplir les infos de l'acheteur avec le client
            acheteurNom: selectedClient.nom || "",
            acheteurPrenom: selectedClient.prenom || "",
            acheteurAdresse: selectedClient.adresse || "",
            acheteurDateNaissance: selectedClient.date_naissance || "",
            acheteurLieuNaissance: selectedClient.lieu_naissance || "",
            acheteurNationalite: selectedClient.nationalite || "",
            acheteurProfession: selectedClient.profession || "",
            acheteurStatutMatrimonial: statutMatrimonial,
            // Vider les champs du vendeur
            vendeurNom: "",
            vendeurPrenom: "",
            vendeurAdresse: "",
            vendeurDateNaissance: "",
            vendeurLieuNaissance: "",
            vendeurNationalite: "",
            vendeurProfession: "",
            vendeurStatutMatrimonial: "",
            vendeurPieceIdentite: "",
            vendeurNumeroIdentite: "",
          }));
        }
      }
    }
  }, [acteVenteData.clientId, acteVenteData.clientRole, clients]);

  // Charger automatiquement le document d'identité du client pour l'acte de vente
  useEffect(() => {
    if (acteVenteData.clientId && clients.length > 0) {
      const selectedClient = clients.find(c => c.id === acteVenteData.clientId) as any;
      console.log('📋 Client acte sélectionné:', selectedClient?.nom, selectedClient?.prenom);
      console.log('📄 id_doc_path acte:', selectedClient?.id_doc_path);
      
      if (selectedClient?.id_doc_path) {
        console.log('✅ Chargement document acte depuis id_doc_path:', selectedClient.id_doc_path);
        supabase.storage
          .from('documents')
          .createSignedUrl(selectedClient.id_doc_path, 3600)
          .then(({ data, error }) => {
            if (error) {
              console.error('❌ Erreur chargement document acte:', error);
              setActeClientIdentiteUrl(null);
            } else if (data?.signedUrl) {
              console.log('✅ Document acte chargé avec succès');
              setActeClientIdentiteUrl(data.signedUrl);
            }
          });
      } else {
        // Chercher dans client_documents si pas de id_doc_path
        console.log('🔍 Recherche dans client_documents pour client (acte):', selectedClient?.id);
        if (selectedClient?.id) {
          supabase
            .from('client_documents')
            .select('file_path, file_name, document_type')
            .eq('client_id', selectedClient.id)
            .order('uploaded_at', { ascending: false })
            .limit(5) // Prendre les 5 plus récents
            .then(({ data: docs, error: docsError }) => {
              if (docsError) {
                console.error('❌ Erreur recherche documents (acte):', docsError);
                setActeClientIdentiteUrl(null);
              } else if (docs && docs.length > 0) {
                console.log(`📄 ${docs.length} document(s) acte trouvé(s) pour ce client`);
                // Chercher d'abord piece_identite, sinon prendre le premier
                const idDoc = docs.find(d => d.document_type === 'piece_identite') || docs[0];
                console.log('📄 Document acte sélectionné:', idDoc.file_name, '(type:', idDoc.document_type, ')');
                supabase.storage
                  .from('documents')
                  .createSignedUrl(idDoc.file_path, 3600)
                  .then(({ data, error }) => {
                    if (error) {
                      console.error('❌ Erreur chargement document acte:', error);
                      setActeClientIdentiteUrl(null);
                    } else if (data?.signedUrl) {
                      console.log('✅ Document acte client_documents chargé avec succès');
                      setActeClientIdentiteUrl(data.signedUrl);
                    }
                  });
              } else {
                console.log('⚠️ Aucun document trouvé dans client_documents (acte)');
                setActeClientIdentiteUrl(null);
              }
            });
        } else {
          setActeClientIdentiteUrl(null);
        }
      }
    } else {
      setActeClientIdentiteUrl(null);
    }
  }, [acteVenteData.clientId, clients]);

  // Charger la pièce d'identité du client (Bail d'habitation)
  // Auto-load carte d'identité bailleur bail commercial
  useEffect(() => {
    if (bailCommercialData.clientRole === "bailleur" && bailCommercialData.clientId && clients.length > 0) {
      const selectedClient = clients.find(c => c.id === bailCommercialData.clientId) as any;
      console.log('📋 Client bailleur bail commercial sélectionné:', selectedClient?.nom, selectedClient?.prenom);
      console.log('📄 id_doc_path bail commercial:', selectedClient?.id_doc_path);
      
      if (selectedClient?.id_doc_path) {
        console.log('✅ Chargement document bail commercial depuis id_doc_path:', selectedClient.id_doc_path);
        supabase.storage
          .from('documents')
          .createSignedUrl(selectedClient.id_doc_path, 3600)
          .then(({ data, error }) => {
            if (error) {
              console.error('❌ Erreur chargement document bail commercial:', error);
              setBailCommercialBailleurClientIdentiteUrl(null);
            } else if (data?.signedUrl) {
              console.log('✅ Document bail commercial chargé avec succès');
              setBailCommercialBailleurClientIdentiteUrl(data.signedUrl);
            }
          });
      } else {
        // Chercher dans client_documents si pas de id_doc_path
        console.log('🔍 Recherche dans client_documents pour client (bail commercial):', selectedClient?.id);
        if (selectedClient?.id) {
          supabase
            .from('client_documents')
            .select('file_path, file_name, document_type')
            .eq('client_id', selectedClient.id)
            .order('uploaded_at', { ascending: false })
            .limit(5)
            .then(({ data: docs, error: docsError }) => {
              if (docsError) {
                console.error('❌ Erreur recherche documents (bail commercial):', docsError);
                setBailCommercialBailleurClientIdentiteUrl(null);
              } else if (docs && docs.length > 0) {
                console.log(`📄 ${docs.length} document(s) bail commercial trouvé(s) pour ce client`);
                const idDoc = docs.find(d => d.document_type === 'piece_identite') || docs[0];
                console.log('📄 Document bail commercial sélectionné:', idDoc.file_name, '(type:', idDoc.document_type, ')');
                supabase.storage
                  .from('documents')
                  .createSignedUrl(idDoc.file_path, 3600)
                  .then(({ data, error }) => {
                    if (error) {
                      console.error('❌ Erreur chargement document bail commercial:', error);
                      setBailCommercialBailleurClientIdentiteUrl(null);
                    } else if (data?.signedUrl) {
                      console.log('✅ Document bail commercial client_documents chargé avec succès');
                      setBailCommercialBailleurClientIdentiteUrl(data.signedUrl);
                    }
                  });
              } else {
                console.log('⚠️ Aucun document bail commercial trouvé dans client_documents');
                setBailCommercialBailleurClientIdentiteUrl(null);
              }
            });
        } else {
          setBailCommercialBailleurClientIdentiteUrl(null);
        }
      }
    } else {
      setBailCommercialBailleurClientIdentiteUrl(null);
    }
  }, [bailCommercialData.clientId, bailCommercialData.clientRole, clients]);

  // Auto-load carte d'identité preneur bail commercial
  useEffect(() => {
    if (bailCommercialData.clientRole === "preneur" && bailCommercialData.clientId && clients.length > 0) {
      const selectedClient = clients.find(c => c.id === bailCommercialData.clientId) as any;
      console.log('📋 Client preneur bail commercial sélectionné:', selectedClient?.nom, selectedClient?.prenom);
      console.log('📄 id_doc_path bail commercial preneur:', selectedClient?.id_doc_path);
      
      if (selectedClient?.id_doc_path) {
        console.log('✅ Chargement document preneur bail commercial depuis id_doc_path:', selectedClient.id_doc_path);
        supabase.storage
          .from('documents')
          .createSignedUrl(selectedClient.id_doc_path, 3600)
          .then(({ data, error }) => {
            if (error) {
              console.error('❌ Erreur chargement document preneur bail commercial:', error);
              setBailCommercialPreneurClientIdentiteUrl(null);
            } else if (data?.signedUrl) {
              console.log('✅ Document preneur bail commercial chargé avec succès');
              setBailCommercialPreneurClientIdentiteUrl(data.signedUrl);
            }
          });
      } else {
        // Chercher dans client_documents si pas de id_doc_path
        console.log('🔍 Recherche dans client_documents pour preneur (bail commercial):', selectedClient?.id);
        if (selectedClient?.id) {
          supabase
            .from('client_documents')
            .select('file_path, file_name, document_type')
            .eq('client_id', selectedClient.id)
            .order('uploaded_at', { ascending: false })
            .limit(5)
            .then(({ data: docs, error: docsError }) => {
              if (docsError) {
                console.error('❌ Erreur recherche documents preneur (bail commercial):', docsError);
                setBailCommercialPreneurClientIdentiteUrl(null);
              } else if (docs && docs.length > 0) {
                console.log(`📄 ${docs.length} document(s) preneur bail commercial trouvé(s) pour ce client`);
                const idDoc = docs.find(d => d.document_type === 'piece_identite') || docs[0];
                console.log('📄 Document preneur bail commercial sélectionné:', idDoc.file_name, '(type:', idDoc.document_type, ')');
                supabase.storage
                  .from('documents')
                  .createSignedUrl(idDoc.file_path, 3600)
                  .then(({ data, error }) => {
                    if (error) {
                      console.error('❌ Erreur chargement document preneur bail commercial:', error);
                      setBailCommercialPreneurClientIdentiteUrl(null);
                    } else if (data?.signedUrl) {
                      console.log('✅ Document preneur bail commercial client_documents chargé avec succès');
                      setBailCommercialPreneurClientIdentiteUrl(data.signedUrl);
                    }
                  });
              } else {
                console.log('⚠️ Aucun document preneur bail commercial trouvé dans client_documents');
                setBailCommercialPreneurClientIdentiteUrl(null);
              }
            });
        } else {
          setBailCommercialPreneurClientIdentiteUrl(null);
        }
      }
    } else {
      setBailCommercialPreneurClientIdentiteUrl(null);
    }
  }, [bailCommercialData.clientId, bailCommercialData.clientRole, clients]);

  useEffect(() => {
    if (bailHabitationData.clientId && clients.length > 0) {
      const selectedClient = clients.find(c => c.id === bailHabitationData.clientId) as any;
      console.log('📋 Client bail sélectionné:', selectedClient?.nom, selectedClient?.prenom);
      console.log('📄 id_doc_path bail:', selectedClient?.id_doc_path);
      
      if (selectedClient?.id_doc_path) {
        console.log('✅ Chargement document bail depuis id_doc_path:', selectedClient.id_doc_path);
        supabase.storage
          .from('documents')
          .createSignedUrl(selectedClient.id_doc_path, 3600)
          .then(({ data, error }) => {
            if (error) {
              console.error('❌ Erreur chargement document bail:', error);
              setBailClientIdentiteUrl(null);
            } else if (data?.signedUrl) {
              console.log('✅ Document bail chargé avec succès');
              setBailClientIdentiteUrl(data.signedUrl);
            }
          });
      } else {
        // Chercher dans client_documents si pas de id_doc_path
        console.log('🔍 Recherche dans client_documents pour client (bail):', selectedClient?.id);
        if (selectedClient?.id) {
          supabase
            .from('client_documents')
            .select('file_path, file_name, document_type')
            .eq('client_id', selectedClient.id)
            .order('uploaded_at', { ascending: false })
            .limit(5)
            .then(({ data: docs, error: docsError }) => {
              if (docsError) {
                console.error('❌ Erreur recherche documents (bail):', docsError);
                setBailClientIdentiteUrl(null);
              } else if (docs && docs.length > 0) {
                console.log(`📄 ${docs.length} document(s) bail trouvé(s) pour ce client`);
                const idDoc = docs.find(d => d.document_type === 'piece_identite') || docs[0];
                console.log('📄 Document bail sélectionné:', idDoc.file_name, '(type:', idDoc.document_type, ')');
                supabase.storage
                  .from('documents')
                  .createSignedUrl(idDoc.file_path, 3600)
                  .then(({ data, error }) => {
                    if (error) {
                      console.error('❌ Erreur chargement document bail:', error);
                      setBailClientIdentiteUrl(null);
                    } else if (data?.signedUrl) {
                      console.log('✅ Document bail client_documents chargé avec succès');
                      setBailClientIdentiteUrl(data.signedUrl);
                    }
                  });
              } else {
                console.log('⚠️ Aucun document trouvé dans client_documents (bail)');
                setBailClientIdentiteUrl(null);
              }
            });
        } else {
          setBailClientIdentiteUrl(null);
        }
      }
    } else {
      setBailClientIdentiteUrl(null);
    }
  }, [bailHabitationData.clientId, clients]);

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
    
    // Si c'est un bail commercial, ouvrir le questionnaire spécifique
    if (contractType === "Bail commercial / professionnel" && categoryKey === "Immobilier") {
      setPendingContractType(contractType);
      setPendingCategory(categoryKey);
      setShowQuestionDialog(true);
      return;
    }
    
    // Si c'est une convention d'indivision, ouvrir le questionnaire spécifique
    if (contractType === "Convention d'indivision" && categoryKey === "Immobilier") {
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
        vendeurPrecisionRegime: "",
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
        acheteurPrecisionRegime: "",
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
        clientRole: "",
        clientId: "",
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
        locataireClientId: "",
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
        locataireRevenusMensuelsNets: "",
        locataireTypeContrat: "",
        locataireEmployeur: "",
        locataireEmployeurAdresse: "",
        locataireAncienneteEmployeur: "",
        colocation: "",
        solidariteColocataires: "",
        nombreColocataires: "",
        colocatairesNoms: "",
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
        placeParking: "",
        numeroPlaceParking: "",
        entretienJardin: "",
        logementCopropriete: "",
        reglementCoproFourni: "",
        typeBail: "",
        contratMeuble: "",
        mobilierListeComplete: [],
        inventaireFourni: "",
        inventaireMobilierTexte: "",
        etatMobilierEntree: "",
        entretienMobilier: "",
        mobilierLiterie: false,
        mobilierOccultation: false,
        mobilierPlaquesCuisson: false,
        mobilierFourMicroondes: false,
        mobilierRefrigo: false,
        mobilierCongelateur: false,
        mobilierVaisselle: false,
        mobilierUstensiles: false,
        mobilierTable: false,
        mobilierSieges: false,
        mobilierEtageres: false,
        mobilierLampes: false,
        mobilierMaterielEntretien: false,
        typeDureeMeuble: "",
        motifBailMobilite: "",
        natureBailleur: "",
        residencePrincipale: "",
        destinationBien: "",
        souslocationAutorisee: "",
        colocationPossible: "",
        animauxAutorises: "",
        precisionAnimaux: "",
        loyerMensuel: "",
        chargesMensuelles: "",
        typeCharges: "",
        typologieCharges: "",
        depotGarantie: "",
        premierLoyerDate: "",
        modePaiement: "",
        ibanBailleur: "",
        periodiciteRegularisationCharges: "",
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
        travauxDerniers6Mois: "",
        descriptionTravaux: "",
        typeChauffage: "",
        compteursIndividuels: "",
        releveCompteurs: "",
        attestationAssurance: "",
        servitudes: "",
        logementZoneERP: "",
        usageProfessionnel: "",
        informationsComplementaires: "",
        nombreJeuxCles: "",
        typesCles: [],
        codesFournis: "",
      });

      loadContrats();
    } catch (err) {
      console.error('Erreur création bail:', err);
      toast.error('Erreur lors de la création du bail');
    }
  };

  const handleBailCommercialSubmit = async () => {
    try {
      if (!user) {
        toast.error('Utilisateur non connecté');
        return;
      }

      if (!bailCommercialData.typeBail || !bailCommercialData.statutBailleur || !bailCommercialData.adresseLocal || !bailCommercialData.loyerMensuelHT) {
        toast.error('Veuillez remplir les champs obligatoires (type de bail, statut bailleur, adresse local, loyer)');
        return;
      }

      const descriptionData = `
TYPE DE CONTRAT: ${bailCommercialData.typeBail === "commercial" ? "Bail commercial" : "Bail professionnel"}

═══════════════════════════════════════════════════════════════
BAILLEUR
═══════════════════════════════════════════════════════════════
- Statut: ${bailCommercialData.statutBailleur === "physique" ? "Personne physique" : "Personne morale (société)"}
${bailCommercialData.statutBailleur === "physique" ? `- Nom: ${bailCommercialData.bailleurNom} ${bailCommercialData.bailleurPrenom}` : `- Dénomination: ${bailCommercialData.bailleurDenomination}
- Forme juridique: ${bailCommercialData.bailleurFormeJuridique}
- SIREN: ${bailCommercialData.bailleurSiren}
- SIRET: ${bailCommercialData.bailleurSiret}`}
- Adresse: ${bailCommercialData.bailleurAdresse}

═══════════════════════════════════════════════════════════════
LOCAL COMMERCIAL
═══════════════════════════════════════════════════════════════
- Adresse: ${bailCommercialData.adresseLocal}
- Nature: ${bailCommercialData.natureLocal}
- Surface totale: ${bailCommercialData.surfaceTotale} m²

═══════════════════════════════════════════════════════════════
ACTIVITÉ
═══════════════════════════════════════════════════════════════
- Activité principale autorisée: ${bailCommercialData.activitePrincipale}

═══════════════════════════════════════════════════════════════
CONDITIONS FINANCIÈRES
═══════════════════════════════════════════════════════════════
- Loyer mensuel HT: ${bailCommercialData.loyerMensuelHT} €
- Charges mensuelles: ${bailCommercialData.chargesMensuelles} €

═══════════════════════════════════════════════════════════════
DURÉE DU BAIL
═══════════════════════════════════════════════════════════════
- Type de bail: ${bailCommercialData.typeBail}
- Date de prise d'effet: ${bailCommercialData.datePriseEffet}
      `.trim();

      const { data, error } = await supabase
        .from('contrats')
        .insert({
          owner_id: user.id,
          name: `Bail commercial - ${bailCommercialData.adresseLocal}`,
          type: pendingContractType,
          category: pendingCategory,
          role: role,
          description: descriptionData,
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success("Bail commercial créé avec succès");
      setShowQuestionDialog(false);
      
      // Réinitialiser le formulaire
      setBailCommercialData({
        clientRole: "",
        clientId: "",
        bailleurClientId: "",
        statutBailleur: "",
        bailleurNom: "",
        bailleurPrenom: "",
        bailleurAdresse: "",
        bailleurDateNaissance: "",
        bailleurLieuNaissance: "",
        bailleurNationalite: "",
        bailleurStatutMatrimonial: "",
        bailleurRegimeMatrimonial: "",
        bailleurProfession: "",
        bailleurDenomination: "",
        bailleurFormeJuridique: "",
        bailleurSiren: "",
        bailleurSiret: "",
        bailleurSiegeSocial: "",
        bailleurCapitalSocial: "",
        bailleurRepresentant: "",
        bailleurRepresentantPrenom: "",
        bailleurRepresentantFonction: "",
        bailleurRepresentantEstLegal: "",
        bailleurMandataireNom: "",
        bailleurMandatairePrenom: "",
        bailleurMandataireTypePouvoir: "",
        locataireClientId: "",
        statutLocataire: "",
        locataireNom: "",
        locatairePrenom: "",
        locataireAdresse: "",
        locataireDateNaissance: "",
        locataireLieuNaissance: "",
        locataireNationalite: "",
        locataireStatutMatrimonial: "",
        locataireRegimeMatrimonial: "",
        locataireProfession: "",
        locataireTelephone: "",
        locataireEmail: "",
        locataireExerceEnNomPropre: "",
        locataireActivite: "",
        locataireSirenPersonnel: "",
        locataireEntrepriseEnCreation: "",
        locataireImmatriculation: "",
        locataireDenomination: "",
        locataireFormeJuridique: "",
        locataireSiege: "",
        locataireSiren: "",
        locataireSiret: "",
        locataireObjetSocial: "",
        locataireCapital: "",
        locataireRepresentant: "",
        locataireRepresentantPrenom: "",
        locataireRepresentantFonction: "",
        locataireMandataireNom: "",
        locataireMandatairePrenom: "",
        locataireMandataireTypePouvoir: "",
        activitePrincipale: "",
        activitesAnnexes: "",
        destinationBail: "",
        clauseExclusivite: "",
        clauseNonConcurrence: "",
        adresseLocal: "",
        natureLocal: "",
        surfaceTotale: "",
        lotsCopropriete: "",
        etageNumero: "",
        partiesPrivatives: [],
        longueurVitrine: "",
        accesLivraison: "",
        etatGeneral: "",
        travauxBailleur: "",
        travauxLocataire: "",
        etatLocalRemise: "",
        diagnosticAmiante: "",
        typeBail: "",
        datePriseEffet: "",
        dureeTotale: "",
        renouvellementAuto: "",
        loyerAnnuelHT: "",
        loyerMensuelHT: "",
        modalitePaiement: "",
        typeIndexation: "",
        chargesMensuelles: "",
        typeCharges: "",
        depotGarantie: "",
        modePaiementLoyer: "",
        ibanBailleur: "",
        chargesLocataire: [],
        chargesBailleur: [],
        compteursIndividuels: "",
        cautionPersonnelle: "",
        garantieBancaire: "",
        montantGaranti: "",
        dureeGarantie: "",
        diagnosticDPE: "",
        diagnosticAmianteDTA: "",
        diagnosticERP: "",
        diagnosticElectricite: "",
        diagnosticGaz: "",
        diagnosticTermites: "",
        attestationConformiteERP: "",
        cedabilite: "",
        conditionsCession: "",
        droitPreemptionCommune: "",
        derogationUsageLocal: "",
        clauseRecettes: "",
        clauseNonAffectation: "",
        clauseNonConcurrenceDetails: "",
        presenceCompteurs: "",
        releveCompteurs: "",
      });

      loadContrats();
    } catch (err) {
      console.error('Erreur création bail commercial:', err);
      toast.error('Erreur lors de la création du bail commercial');
    }
  };

  const handleIndivisionSubmit = async () => {
    try {
      if (!user) {
        toast.error('Utilisateur non connecté');
        return;
      }

      if (!indivisionData.typeBien || !indivisionData.origineIndivision) {
        toast.error('Veuillez remplir les champs obligatoires (type de bien, origine)');
        return;
      }

      const descriptionData = `
TYPE DE CONTRAT: Convention d'indivision

═══════════════════════════════════════════════════════════════
INFORMATIONS GÉNÉRALES
═══════════════════════════════════════════════════════════════
- Type de bien: ${indivisionData.typeBien}
${indivisionData.typeBien === "autre" ? `- Précision: ${indivisionData.typeBienAutre}` : ""}
- Origine de l'indivision: ${indivisionData.origineIndivision}
${indivisionData.origineIndivision === "autre" ? `- Précision: ${indivisionData.origineIndivisionAutre}` : ""}
- Objet: ${indivisionData.objetConvention}

═══════════════════════════════════════════════════════════════
INDIVISAIRES
═══════════════════════════════════════════════════════════════
Nombre d'indivisaires: ${indivisionData.indivisaires.length}
${indivisionData.indivisaires.map((ind, idx) => `
Indivisaire ${idx + 1}:
- Nom: ${ind.nom} ${ind.prenom}
- Quote-part: ${ind.quotePart}%
`).join('')}

═══════════════════════════════════════════════════════════════
BIEN EN INDIVISION
═══════════════════════════════════════════════════════════════
${indivisionData.typeBien === "immobilier" ? `- Adresse: ${indivisionData.adresseBien}
- Nature: ${indivisionData.natureBienImmobilier}
- Description: ${indivisionData.descriptionBien}
- Surface: ${indivisionData.surfaceBien} m²
- Références cadastrales: ${indivisionData.referencesCadastrales}
- État locatif: ${indivisionData.etatLocatif}
- Valeur vénale: ${indivisionData.valeurVenale} €` : 
indivisionData.typeBien === "mobilier" ? `- Description: ${indivisionData.descriptionBienMobilier}
- Valeur estimée: ${indivisionData.valeurEstimee} €` : ""}
      `.trim();

      const { data, error } = await supabase
        .from('contrats')
        .insert({
          owner_id: user.id,
          name: `Convention d'indivision - ${indivisionData.adresseBien || indivisionData.descriptionBienMobilier || 'Bien indivis'}`,
          type: pendingContractType,
          category: pendingCategory,
          role: role,
          description: descriptionData,
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success("Convention d'indivision créée avec succès");
      setShowQuestionDialog(false);
      
      // Réinitialiser le formulaire
      setIndivisionData({
        typeBien: "",
        typeBienAutre: "",
        origineIndivision: "",
        origineIndivisionAutre: "",
        objetConvention: "",
        indivisaires: [{
          id: 1,
          isClient: false,
          clientId: "",
          nom: "",
          prenom: "",
          adresse: "",
          dateNaissance: "",
          lieuNaissance: "",
          nationalite: "",
          profession: "",
          statutMatrimonial: "",
          regimeMatrimonial: "",
          typeIdentite: "",
          numeroIdentite: "",
          email: "",
          telephone: "",
          quotePart: "",
          origineQuotePart: "",
        }],
        adresseBien: "",
        natureBienImmobilier: "",
        descriptionBien: "",
        surfaceBien: "",
        referencesCadastrales: "",
        etatLocatif: "",
        montantLoyer: "",
        dureeBail: "",
        valeurVenale: "",
        dateEstimation: "",
        sourceEstimation: "",
        descriptionBienMobilier: "",
        valeurEstimee: "",
        numerosSerie: "",
        dureeType: "",
        dureeAnnees: "",
        conditionsRenouvellement: "",
        conditionsSortie: "",
        gerantNom: "",
        gerantPrenom: "",
        gerantEstIndivisaire: "",
        pouvoirsGerant: [],
        pouvoirsAutres: "",
        dureeMandat: "",
        decisionsType: "",
        casUnanimite: "",
        chargesRepartition: "",
        chargesRepartitionAutre: "",
        modalitesRemboursement: "",
        compteBancaire: "",
        compteTitulaires: "",
        compteModalites: "",
        utilisationParIndivisaires: "",
        utilisationConditions: "",
        indemnitéOccupation: "",
        indemniteOccupationMontant: "",
        indemniteOccupationFrequence: "",
        locationAutorisee: "",
        locationMandataire: "",
        locationRepartitionLoyers: "",
        travauxAutorises: "",
        travauxDecision: "",
        travauxRepartitionCouts: "",
        travauxUrgents: "",
        travauxDocumentation: "",
        ventePartLibre: "",
        droitPreemption: "",
        evaluationPart: "",
        delaiRachat: "",
        modalitesPaiement: "",
        conditionsMiseEnVente: "",
        decisionVente: "",
        mandataireVente: "",
        repartitionPrix: "",
        gestionPlusValues: "",
        registreDepenses: "",
        archivageFactures: "",
        modalitesRemboursementAvances: "",
        rapportAnnuel: "",
        resolutionLitiges: [],
        solidariteDettes: "",
      });

      loadContrats();
    } catch (err) {
      console.error('Erreur création convention d\'indivision:', err);
      toast.error('Erreur lors de la création de la convention');
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
                : pendingContractType === "Bail commercial / professionnel"
                ? (bailCommercialData.typeBail === "commercial" 
                    ? "Informations pour le bail commercial"
                    : bailCommercialData.typeBail === "professionnel"
                    ? "Informations pour le bail professionnel" 
                    : "Informations pour le bail commercial / professionnel")
                : pendingContractType === "Convention d'indivision"
                ? "Informations pour la convention d'indivision"
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
                    <RadioGroupItem value="vendeur" id="vendeur" />
                    <Label htmlFor="vendeur" className="cursor-pointer">Vendeur</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="acheteur" id="acheteur" />
                    <Label htmlFor="acheteur" className="cursor-pointer">Acquéreur</Label>
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

                    {/* Pièce d'identité du client vendeur */}
                    {questionnaireData.clientId && (
                      <div className="space-y-2">
                        <Label>📎 Pièce d'identité</Label>
                        {compromisClientIdentiteUrl ? (
                          <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                            <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm flex-1 text-green-700">Pièce d'identité chargée depuis le profil client</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => window.open(compromisClientIdentiteUrl, '_blank')}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                            <svg className="w-4 h-4 text-orange-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span className="text-sm flex-1 text-orange-700">Aucune pièce d'identité dans le profil client</span>
                          </div>
                        )}
                      </div>
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

                    {/* Pièce d'identité du client acquéreur */}
                    {questionnaireData.clientId && (
                      <div className="space-y-2">
                        <Label>📎 Pièce d'identité</Label>
                        {compromisClientIdentiteUrl ? (
                          <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                            <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm flex-1 text-green-700">Pièce d'identité chargée depuis le profil client</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => window.open(compromisClientIdentiteUrl, '_blank')}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                            <svg className="w-4 h-4 text-orange-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span className="text-sm flex-1 text-orange-700">Aucune pièce d'identité dans le profil client</span>
                          </div>
                        )}
                      </div>
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
                <Label>📎 Pièce d'identité de l'autre partie</Label>
                
                {/* Upload pour l'autre partie */}
                {questionnaireData.clientId && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {questionnaireData.clientRole === "vendeur" ? "Acquéreur" : "Vendeur"}
                    </p>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      multiple
                      className="hidden"
                      id="compromis-autre-partie-upload"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) {
                          setCompromisAutrePartieFiles(prev => [...prev, ...files]);
                          toast.success(`${files.length} fichier(s) ajouté(s)`);
                        }
                        e.target.value = '';
                      }}
                    />
                    <label htmlFor="compromis-autre-partie-upload" className="cursor-pointer flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Joindre la pièce d'identité</p>
                        <p className="text-xs text-muted-foreground">PDF ou images</p>
                      </div>
                    </label>
                  </div>
                  {compromisAutrePartieFiles.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {compromisAutrePartieFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                          <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm flex-1 truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-transparent"
                            onClick={() => setCompromisAutrePartieFiles(prev => prev.filter((_, i) => i !== index))}
                          >
                            <svg className="w-4 h-4 text-muted-foreground hover:text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  </div>
                )}
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
                          setCompromisDiagnosticsFiles(prev => [...prev, ...files]);
                          toast.success(`${files.length} fichier(s) ajouté(s)`);
                        }
                        e.target.value = '';
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
                  {compromisDiagnosticsFiles.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {compromisDiagnosticsFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                          <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm flex-1 truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-transparent"
                            onClick={() => setCompromisDiagnosticsFiles(prev => prev.filter((_, i) => i !== index))}
                          >
                            <svg className="w-4 h-4 text-muted-foreground hover:text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
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
                {/* Sélection du rôle du client */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Rôle du client</h3>
                  <div className="space-y-2">
                    <Label>Votre client est : *</Label>
                    <RadioGroup 
                      value={acteVenteData.clientRole}
                      onValueChange={(value) => setActeVenteData({...acteVenteData, clientRole: value})}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="vendeur" id="acte-vendeur" />
                        <Label htmlFor="acte-vendeur" className="cursor-pointer">Vendeur</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="acheteur" id="acte-acheteur" />
                        <Label htmlFor="acte-acheteur" className="cursor-pointer">Acquéreur</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                {/* Vendeur - avec auto-fill si client sélectionné comme vendeur, sinon manuel */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">👤 Vendeur</h3>
                  <div className="space-y-4">
                    {acteVenteData.clientRole === "vendeur" ? (
                      <>
                        {/* Le client est le vendeur */}
                        <div className="space-y-2">
                          <Label htmlFor="acte_clientId">Sélectionner votre client *</Label>
                          <Select 
                            value={acteVenteData.clientId}
                            onValueChange={(value) => setActeVenteData({...acteVenteData, clientId: value})}
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
                        {acteVenteData.clientId && clients.find(c => c.id === acteVenteData.clientId) && (
                          <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                            <p><strong>Nom complet:</strong> {clients.find(c => c.id === acteVenteData.clientId)?.nom} {clients.find(c => c.id === acteVenteData.clientId)?.prenom}</p>
                            {clients.find(c => c.id === acteVenteData.clientId)?.adresse && (
                              <p><strong>Adresse:</strong> {clients.find(c => c.id === acteVenteData.clientId)?.adresse}</p>
                            )}
                            {clients.find(c => c.id === acteVenteData.clientId)?.telephone && (
                              <p><strong>Téléphone:</strong> {clients.find(c => c.id === acteVenteData.clientId)?.telephone}</p>
                            )}
                            {clients.find(c => c.id === acteVenteData.clientId)?.email && (
                              <p><strong>Email:</strong> {clients.find(c => c.id === acteVenteData.clientId)?.email}</p>
                            )}
                            {clients.find(c => c.id === acteVenteData.clientId)?.date_naissance && (
                              <p><strong>Date de naissance:</strong> {new Date(clients.find(c => c.id === acteVenteData.clientId)?.date_naissance).toLocaleDateString('fr-FR')}</p>
                            )}
                            {clients.find(c => c.id === acteVenteData.clientId)?.nationalite && (
                              <p><strong>Nationalité:</strong> {clients.find(c => c.id === acteVenteData.clientId)?.nationalite}</p>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Saisie manuelle vendeur (le client est acheteur) */}
                        <div className="text-sm text-muted-foreground mb-2">
                          Saisir manuellement les informations du vendeur
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Type de partie - Vendeur */}
                  <div className="space-y-4">
                    <Label>Type de partie *</Label>
                    <RadioGroup 
                      value={acteVenteData.vendeurTypePartie}
                      onValueChange={(value) => setActeVenteData({...acteVenteData, vendeurTypePartie: value})}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="personne_physique" id="vendeur_pp" />
                        <Label htmlFor="vendeur_pp" className="cursor-pointer">Personne physique</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="personne_morale" id="vendeur_pm" />
                        <Label htmlFor="vendeur_pm" className="cursor-pointer">Personne morale (société)</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Si personne morale */}
                  {acteVenteData.vendeurTypePartie === "personne_morale" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="vendeur_denomination">Dénomination sociale *</Label>
                        <Input 
                          id="vendeur_denomination"
                          value={acteVenteData.vendeurDenominationSociale}
                          onChange={(e) => setActeVenteData({...acteVenteData, vendeurDenominationSociale: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vendeur_forme">Forme juridique *</Label>
                        <Input 
                          id="vendeur_forme"
                          value={acteVenteData.vendeurFormeJuridique}
                          onChange={(e) => setActeVenteData({...acteVenteData, vendeurFormeJuridique: e.target.value})}
                          placeholder="SARL, SAS, SCI..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vendeur_siren">SIREN *</Label>
                        <Input 
                          id="vendeur_siren"
                          value={acteVenteData.vendeurSiren}
                          onChange={(e) => setActeVenteData({...acteVenteData, vendeurSiren: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="vendeur_siege">Adresse du siège social *</Label>
                        <Input 
                          id="vendeur_siege"
                          value={acteVenteData.vendeurSiegeSocial}
                          onChange={(e) => setActeVenteData({...acteVenteData, vendeurSiegeSocial: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vendeur_representant">Nom du représentant légal *</Label>
                        <Input 
                          id="vendeur_representant"
                          value={acteVenteData.vendeurRepresentantNom}
                          onChange={(e) => setActeVenteData({...acteVenteData, vendeurRepresentantNom: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vendeur_qualite">Qualité *</Label>
                        <Input 
                          id="vendeur_qualite"
                          value={acteVenteData.vendeurRepresentantQualite}
                          onChange={(e) => setActeVenteData({...acteVenteData, vendeurRepresentantQualite: e.target.value})}
                          placeholder="Gérant, Président..."
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>📎 Extrait Kbis</Label>
                        <Input type="file" accept=".pdf" />
                      </div>
                    </div>
                  )}

                  {/* Représentation - Vendeur */}
                  <div className="space-y-4">
                    <Label>La partie est-elle représentée ?</Label>
                    <RadioGroup 
                      value={acteVenteData.vendeurRepresente}
                      onValueChange={(value) => setActeVenteData({...acteVenteData, vendeurRepresente: value})}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="non" id="vendeur_rep_non" />
                        <Label htmlFor="vendeur_rep_non" className="cursor-pointer">Non</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="oui" id="vendeur_rep_oui" />
                        <Label htmlFor="vendeur_rep_oui" className="cursor-pointer">Oui</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Si représenté */}
                  {acteVenteData.vendeurRepresente === "oui" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
                      <div className="space-y-2">
                        <Label htmlFor="vendeur_mand_nom">Nom du mandataire *</Label>
                        <Input 
                          id="vendeur_mand_nom"
                          value={acteVenteData.vendeurMandataireNom}
                          onChange={(e) => setActeVenteData({...acteVenteData, vendeurMandataireNom: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vendeur_mand_prenom">Prénom du mandataire *</Label>
                        <Input 
                          id="vendeur_mand_prenom"
                          value={acteVenteData.vendeurMandatairePrenom}
                          onChange={(e) => setActeVenteData({...acteVenteData, vendeurMandatairePrenom: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="vendeur_type_pouvoir">Type de pouvoir *</Label>
                        <Select value={acteVenteData.vendeurTypePouvoir} onValueChange={(value) => setActeVenteData({...acteVenteData, vendeurTypePouvoir: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mandat_authentique">Mandat authentique</SelectItem>
                            <SelectItem value="mandat_ssp">Mandat sous seing privé</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>📎 Joindre le mandat (PDF)</Label>
                        <Input type="file" accept=".pdf" />
                      </div>
                    </div>
                  )}
                  
                  {/* Champs communs pour le vendeur */}
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
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="acte_vendeurRegime">Régime matrimonial *</Label>
                          <Select value={acteVenteData.vendeurRegimeMatrimonial} onValueChange={(value) => setActeVenteData({...acteVenteData, vendeurRegimeMatrimonial: value})}>
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
                        {acteVenteData.vendeurRegimeMatrimonial === "autre" && (
                          <div className="space-y-2">
                            <Label htmlFor="acte_vendeurPrecisionRegime">Préciser le régime</Label>
                            <Input 
                              id="acte_vendeurPrecisionRegime"
                              value={acteVenteData.vendeurPrecisionRegime}
                              onChange={(e) => setActeVenteData({...acteVenteData, vendeurPrecisionRegime: e.target.value})}
                              placeholder="Précisez le régime matrimonial..."
                            />
                          </div>
                        )}
                      </>
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
                  
                  {/* Pièce d'identité du vendeur - chargée depuis client ou upload */}
                  {acteVenteData.clientRole === "vendeur" && acteVenteData.clientId ? (
                    <div className="space-y-2">
                      <Label>📎 Pièce d'identité</Label>
                      {acteClientIdentiteUrl ? (
                        <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                          <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm flex-1 text-green-700">Pièce d'identité chargée depuis le profil client</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => window.open(acteClientIdentiteUrl, '_blank')}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                          <svg className="w-4 h-4 text-orange-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span className="text-sm flex-1 text-orange-700">Aucune pièce d'identité dans le profil client</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Upload de pièces d'identité vendeur */
                    <div className="space-y-2">
                      <Label>📎 Pièces d'identité du vendeur</Label>
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                        <input
                          type="file"
                          accept="application/pdf,image/*"
                          multiple
                          className="hidden"
                          id="acte-vendeur-upload"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 0) {
                              setActeVendeurFiles(prev => [...prev, ...files]);
                              toast.success(`${files.length} fichier(s) ajouté(s)`);
                            }
                            e.target.value = '';
                          }}
                        />
                        <label htmlFor="acte-vendeur-upload" className="cursor-pointer flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Joindre des pièces d'identité</p>
                            <p className="text-xs text-muted-foreground">CNI, passeport, livret de famille - PDF ou images</p>
                          </div>
                        </label>
                      </div>
                      {acteVendeurFiles.length > 0 && (
                        <div className="space-y-2 mt-2">
                          {acteVendeurFiles.map((file, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                              <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-sm flex-1 truncate">{file.name}</span>
                              <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-transparent"
                                onClick={() => setActeVendeurFiles(prev => prev.filter((_, i) => i !== index))}
                              >
                                <svg className="w-4 h-4 text-muted-foreground hover:text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Acheteur - avec auto-fill si client sélectionné comme acheteur, sinon manuel */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">👥 Acquéreur</h3>
                  <div className="space-y-4">
                    {acteVenteData.clientRole === "acheteur" ? (
                      <>
                        {/* Le client est l'acheteur */}
                        <div className="space-y-2">
                          <Label htmlFor="acte_clientId_acheteur">Sélectionner votre client *</Label>
                          <Select 
                            value={acteVenteData.clientId}
                            onValueChange={(value) => setActeVenteData({...acteVenteData, clientId: value})}
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
                        {acteVenteData.clientId && clients.find(c => c.id === acteVenteData.clientId) && (
                          <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                            <p><strong>Nom complet:</strong> {clients.find(c => c.id === acteVenteData.clientId)?.nom} {clients.find(c => c.id === acteVenteData.clientId)?.prenom}</p>
                            {clients.find(c => c.id === acteVenteData.clientId)?.adresse && (
                              <p><strong>Adresse:</strong> {clients.find(c => c.id === acteVenteData.clientId)?.adresse}</p>
                            )}
                            {clients.find(c => c.id === acteVenteData.clientId)?.telephone && (
                              <p><strong>Téléphone:</strong> {clients.find(c => c.id === acteVenteData.clientId)?.telephone}</p>
                            )}
                            {clients.find(c => c.id === acteVenteData.clientId)?.email && (
                              <p><strong>Email:</strong> {clients.find(c => c.id === acteVenteData.clientId)?.email}</p>
                            )}
                            {clients.find(c => c.id === acteVenteData.clientId)?.date_naissance && (
                              <p><strong>Date de naissance:</strong> {new Date(clients.find(c => c.id === acteVenteData.clientId)?.date_naissance).toLocaleDateString('fr-FR')}</p>
                            )}
                            {clients.find(c => c.id === acteVenteData.clientId)?.nationalite && (
                              <p><strong>Nationalité:</strong> {clients.find(c => c.id === acteVenteData.clientId)?.nationalite}</p>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Saisie manuelle acheteur (le client est vendeur) */}
                        <div className="text-sm text-muted-foreground mb-2">
                          Saisir manuellement les informations de l'acheteur
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Champs communs pour l'acheteur */}
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
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="acte_acheteurRegime">Régime matrimonial *</Label>
                          <Select value={acteVenteData.acheteurRegimeMatrimonial} onValueChange={(value) => setActeVenteData({...acteVenteData, acheteurRegimeMatrimonial: value})}>
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
                        {acteVenteData.acheteurRegimeMatrimonial === "autre" && (
                          <div className="space-y-2">
                            <Label htmlFor="acte_acheteurPrecisionRegime">Préciser le régime</Label>
                            <Input 
                              id="acte_acheteurPrecisionRegime"
                              value={acteVenteData.acheteurPrecisionRegime}
                              onChange={(e) => setActeVenteData({...acteVenteData, acheteurPrecisionRegime: e.target.value})}
                              placeholder="Précisez le régime matrimonial..."
                            />
                          </div>
                        )}
                      </>
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
                  
                  {/* Type de partie - Acquéreur */}
                  <div className="space-y-4">
                    <Label>Type de partie *</Label>
                    <RadioGroup 
                      value={acteVenteData.acheteurTypePartie}
                      onValueChange={(value) => setActeVenteData({...acteVenteData, acheteurTypePartie: value})}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="personne_physique" id="acheteur_pp" />
                        <Label htmlFor="acheteur_pp" className="cursor-pointer">Personne physique</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="personne_morale" id="acheteur_pm" />
                        <Label htmlFor="acheteur_pm" className="cursor-pointer">Personne morale (société)</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Si personne morale - Acquéreur */}
                  {acteVenteData.acheteurTypePartie === "personne_morale" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="acheteur_denomination">Dénomination sociale *</Label>
                        <Input 
                          id="acheteur_denomination"
                          value={acteVenteData.acheteurDenominationSociale}
                          onChange={(e) => setActeVenteData({...acteVenteData, acheteurDenominationSociale: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="acheteur_forme">Forme juridique *</Label>
                        <Input 
                          id="acheteur_forme"
                          value={acteVenteData.acheteurFormeJuridique}
                          onChange={(e) => setActeVenteData({...acteVenteData, acheteurFormeJuridique: e.target.value})}
                          placeholder="SARL, SAS, SCI..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="acheteur_siren">SIREN *</Label>
                        <Input 
                          id="acheteur_siren"
                          value={acteVenteData.acheteurSiren}
                          onChange={(e) => setActeVenteData({...acteVenteData, acheteurSiren: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="acheteur_siege">Adresse du siège social *</Label>
                        <Input 
                          id="acheteur_siege"
                          value={acteVenteData.acheteurSiegeSocial}
                          onChange={(e) => setActeVenteData({...acteVenteData, acheteurSiegeSocial: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="acheteur_representant">Nom du représentant légal *</Label>
                        <Input 
                          id="acheteur_representant"
                          value={acteVenteData.acheteurRepresentantNom}
                          onChange={(e) => setActeVenteData({...acteVenteData, acheteurRepresentantNom: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="acheteur_qualite">Qualité *</Label>
                        <Input 
                          id="acheteur_qualite"
                          value={acteVenteData.acheteurRepresentantQualite}
                          onChange={(e) => setActeVenteData({...acteVenteData, acheteurRepresentantQualite: e.target.value})}
                          placeholder="Gérant, Président..."
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>📎 Extrait Kbis</Label>
                        <Input type="file" accept=".pdf" />
                      </div>
                    </div>
                  )}

                  {/* Représentation - Acquéreur */}
                  <div className="space-y-4">
                    <Label>La partie est-elle représentée ?</Label>
                    <RadioGroup 
                      value={acteVenteData.acheteurRepresente}
                      onValueChange={(value) => setActeVenteData({...acteVenteData, acheteurRepresente: value})}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="non" id="acheteur_rep_non" />
                        <Label htmlFor="acheteur_rep_non" className="cursor-pointer">Non</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="oui" id="acheteur_rep_oui" />
                        <Label htmlFor="acheteur_rep_oui" className="cursor-pointer">Oui</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Si représenté - Acquéreur */}
                  {acteVenteData.acheteurRepresente === "oui" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
                      <div className="space-y-2">
                        <Label htmlFor="acheteur_mand_nom">Nom du mandataire *</Label>
                        <Input 
                          id="acheteur_mand_nom"
                          value={acteVenteData.acheteurMandataireNom}
                          onChange={(e) => setActeVenteData({...acteVenteData, acheteurMandataireNom: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="acheteur_mand_prenom">Prénom du mandataire *</Label>
                        <Input 
                          id="acheteur_mand_prenom"
                          value={acteVenteData.acheteurMandatairePrenom}
                          onChange={(e) => setActeVenteData({...acteVenteData, acheteurMandatairePrenom: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="acheteur_type_pouvoir">Type de pouvoir *</Label>
                        <Select value={acteVenteData.acheteurTypePouvoir} onValueChange={(value) => setActeVenteData({...acteVenteData, acheteurTypePouvoir: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mandat_authentique">Mandat authentique</SelectItem>
                            <SelectItem value="mandat_ssp">Mandat sous seing privé</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>📎 Joindre le mandat (PDF)</Label>
                        <Input type="file" accept=".pdf" />
                      </div>
                    </div>
                  )}
                  
                  {/* Pièce d'identité de l'acquéreur - chargée depuis client ou upload */}
                  {acteVenteData.clientRole === "acheteur" && acteVenteData.clientId ? (
                    <div className="space-y-2">
                      <Label>📎 Pièce d'identité</Label>
                      {acteClientIdentiteUrl ? (
                        <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                          <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm flex-1 text-green-700">Pièce d'identité chargée depuis le profil client</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => window.open(acteClientIdentiteUrl, '_blank')}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                          <svg className="w-4 h-4 text-orange-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span className="text-sm flex-1 text-orange-700">Aucune pièce d'identité dans le profil client</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Upload de pièces d'identité acheteur */
                  <div className="space-y-2">
                    <Label>📎 Pièces d'identité de l'acheteur</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        multiple
                        className="hidden"
                        id="acte-acheteur-upload"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            setActeAcheteurFiles(prev => [...prev, ...files]);
                            toast.success(`${files.length} fichier(s) ajouté(s)`);
                          }
                          e.target.value = '';
                        }}
                      />
                      <label htmlFor="acte-acheteur-upload" className="cursor-pointer flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Joindre des pièces d'identité</p>
                          <p className="text-xs text-muted-foreground">CNI, passeport, livret de famille - PDF ou images</p>
                        </div>
                      </label>
                    </div>
                    {acteAcheteurFiles.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {acteAcheteurFiles.map((file, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                            <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm flex-1 truncate">{file.name}</span>
                            <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-transparent"
                              onClick={() => setActeAcheteurFiles(prev => prev.filter((_, i) => i !== index))}
                            >
                              <svg className="w-4 h-4 text-muted-foreground hover:text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  )}
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
                    <div className="space-y-2">
                      <Label htmlFor="acte_anneeConstruction">Année de construction</Label>
                      <Input id="acte_anneeConstruction" type="number" value={acteVenteData.anneeConstruction} onChange={(e) => setActeVenteData({...acteVenteData, anneeConstruction: e.target.value})} placeholder="Ex: 1990" />
                    </div>
                  </div>

                  {/* Annexes et dépendances */}
                  <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <h4 className="font-medium">Annexes et dépendances</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="acte_garage">Garage</Label>
                        <Select value={acteVenteData.bienGarage} onValueChange={(value) => setActeVenteData({...acteVenteData, bienGarage: value})}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="non">Non</SelectItem>
                            <SelectItem value="oui">Oui</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="acte_parking">Parking</Label>
                        <Select value={acteVenteData.bienParking} onValueChange={(value) => setActeVenteData({...acteVenteData, bienParking: value})}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="non">Non</SelectItem>
                            <SelectItem value="oui">Oui</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="acte_cave">Cave</Label>
                        <Select value={acteVenteData.bienCave} onValueChange={(value) => setActeVenteData({...acteVenteData, bienCave: value})}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="non">Non</SelectItem>
                            <SelectItem value="oui">Oui</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="acte_grenier">Grenier</Label>
                        <Select value={acteVenteData.bienGrenier} onValueChange={(value) => setActeVenteData({...acteVenteData, bienGrenier: value})}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="non">Non</SelectItem>
                            <SelectItem value="oui">Oui</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="acte_jardin">Jardin</Label>
                        <Select value={acteVenteData.bienJardin} onValueChange={(value) => setActeVenteData({...acteVenteData, bienJardin: value})}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="non">Non</SelectItem>
                            <SelectItem value="oui">Oui</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="acte_autresDep">Autres dépendances</Label>
                        <Input 
                          id="acte_autresDep"
                          value={acteVenteData.autresDependances}
                          onChange={(e) => setActeVenteData({...acteVenteData, autresDependances: e.target.value})}
                          placeholder="Ex: buanderie, atelier..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Équipements inclus dans la vente */}
                  <div className="space-y-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <h4 className="font-medium">Équipements inclus dans la vente</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="acte_cuisine">Cuisine équipée</Label>
                        <Select value={acteVenteData.cuisineEquipee} onValueChange={(value) => setActeVenteData({...acteVenteData, cuisineEquipee: value})}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="non">Non</SelectItem>
                            <SelectItem value="oui">Oui</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="acte_electromenagers">Électroménagers inclus</Label>
                        <Select value={acteVenteData.electromenagersInclus} onValueChange={(value) => setActeVenteData({...acteVenteData, electromenagersInclus: value})}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="non">Non</SelectItem>
                            <SelectItem value="oui">Oui</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {acteVenteData.electromenagersInclus === "oui" && (
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="acte_electroListe">Liste des électroménagers</Label>
                          <Textarea 
                            id="acte_electroListe"
                            value={acteVenteData.electromenagersListe}
                            onChange={(e) => setActeVenteData({...acteVenteData, electromenagersListe: e.target.value})}
                            placeholder="Ex: réfrigérateur, four, lave-vaisselle..."
                            rows={2}
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="acte_mobilier">Mobilier laissé</Label>
                        <Select value={acteVenteData.mobilierLaisse} onValueChange={(value) => setActeVenteData({...acteVenteData, mobilierLaisse: value})}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="non">Non</SelectItem>
                            <SelectItem value="oui">Oui</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="acte_autresEquip">Autres équipements</Label>
                        <Input 
                          id="acte_autresEquip"
                          value={acteVenteData.autresEquipements}
                          onChange={(e) => setActeVenteData({...acteVenteData, autresEquipements: e.target.value})}
                          placeholder="Ex: climatisation, alarme..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    {/* Détails d'occupation si occupé */}
                    {acteVenteData.bienLibreOuOccupe === "occupe" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="acte_locataireNom">Nom du locataire</Label>
                          <Input 
                            id="acte_locataireNom"
                            value={acteVenteData.locataireNom}
                            onChange={(e) => setActeVenteData({...acteVenteData, locataireNom: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="acte_dateBail">Date du bail</Label>
                          <Input 
                            id="acte_dateBail"
                            type="date"
                            value={acteVenteData.dateBail}
                            onChange={(e) => setActeVenteData({...acteVenteData, dateBail: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="acte_dureeBail">Durée du bail</Label>
                          <Input 
                            id="acte_dureeBail"
                            value={acteVenteData.dureeBail}
                            onChange={(e) => setActeVenteData({...acteVenteData, dureeBail: e.target.value})}
                            placeholder="Ex: 3 ans"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="acte_montantLoyer">Montant du loyer mensuel (€)</Label>
                          <Input 
                            id="acte_montantLoyer"
                            type="number"
                            value={acteVenteData.montantLoyer}
                            onChange={(e) => setActeVenteData({...acteVenteData, montantLoyer: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="acte_depotGarantieLocataire">Dépôt de garantie (€)</Label>
                          <Input 
                            id="acte_depotGarantieLocataire"
                            type="number"
                            value={acteVenteData.depotGarantieLocataire}
                            onChange={(e) => setActeVenteData({...acteVenteData, depotGarantieLocataire: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="acte_dateLiberation">Date prévue de libération</Label>
                          <Input 
                            id="acte_dateLiberation"
                            type="date"
                            value={acteVenteData.dateLiberation}
                            onChange={(e) => setActeVenteData({...acteVenteData, dateLiberation: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>📎 Bail locatif (PDF)</Label>
                          <Input type="file" accept=".pdf" />
                        </div>
                      </div>
                    )}
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
                        <div className="space-y-2">
                          <Label htmlFor="acte_tauxMaximal">Taux maximal accepté (%)</Label>
                          <Input 
                            id="acte_tauxMaximal"
                            type="number"
                            step="0.01"
                            value={acteVenteData.tauxMaximal}
                            onChange={(e) => setActeVenteData({...acteVenteData, tauxMaximal: e.target.value})}
                            placeholder="Ex: 4.5"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="acte_conditionSuspensivePret">Condition suspensive de prêt</Label>
                          <Select 
                            value={acteVenteData.conditionSuspensivePret} 
                            onValueChange={(value) => setActeVenteData({...acteVenteData, conditionSuspensivePret: value})}
                          >
                            <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="oui">Oui</SelectItem>
                              <SelectItem value="non">Non</SelectItem>
                            </SelectContent>
                          </Select>
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
                  
                  {/* Diagnostics - données essentielles */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="acte_dateDPE">Date du DPE</Label>
                      <Input 
                        id="acte_dateDPE"
                        type="date"
                        value={acteVenteData.dateDPE}
                        onChange={(e) => setActeVenteData({...acteVenteData, dateDPE: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_classeEnergetique">Classe énergétique</Label>
                      <Select 
                        value={acteVenteData.classeEnergetique} 
                        onValueChange={(value) => setActeVenteData({...acteVenteData, classeEnergetique: value})}
                      >
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                          <SelectItem value="C">C</SelectItem>
                          <SelectItem value="D">D</SelectItem>
                          <SelectItem value="E">E</SelectItem>
                          <SelectItem value="F">F</SelectItem>
                          <SelectItem value="G">G</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_presenceAmiante">Présence d'amiante</Label>
                      <Select 
                        value={acteVenteData.presenceAmiante} 
                        onValueChange={(value) => setActeVenteData({...acteVenteData, presenceAmiante: value})}
                      >
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="non">Non</SelectItem>
                          <SelectItem value="oui">Oui</SelectItem>
                          <SelectItem value="non_applicable">Non applicable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_presencePlomb">Présence de plomb</Label>
                      <Select 
                        value={acteVenteData.presencePlomb} 
                        onValueChange={(value) => setActeVenteData({...acteVenteData, presencePlomb: value})}
                      >
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="non">Non</SelectItem>
                          <SelectItem value="oui">Oui</SelectItem>
                          <SelectItem value="non_applicable">Non applicable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_presenceTermites">Présence de termites</Label>
                      <Select 
                        value={acteVenteData.presenceTermites} 
                        onValueChange={(value) => setActeVenteData({...acteVenteData, presenceTermites: value})}
                      >
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="non">Non</SelectItem>
                          <SelectItem value="oui">Oui</SelectItem>
                          <SelectItem value="non_applicable">Non applicable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_assainissementConforme">Assainissement conforme</Label>
                      <Select 
                        value={acteVenteData.assainissementConforme} 
                        onValueChange={(value) => setActeVenteData({...acteVenteData, assainissementConforme: value})}
                      >
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="oui">Oui</SelectItem>
                          <SelectItem value="non">Non</SelectItem>
                          <SelectItem value="non_applicable">Non applicable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="acte_diagnostics">Autres diagnostics fournis</Label>
                    <Textarea id="acte_diagnostics" value={acteVenteData.diagnosticsFournis} onChange={(e) => setActeVenteData({...acteVenteData, diagnosticsFournis: e.target.value})} rows={3} placeholder="Électricité, Gaz, Loi Carrez, ERP, Audit énergétique..." />
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
                            setActeDiagnosticsFiles(prev => [...prev, ...files]);
                            toast.success(`${files.length} fichier(s) ajouté(s)`);
                          }
                          e.target.value = '';
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
                    {acteDiagnosticsFiles.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {acteDiagnosticsFiles.map((file, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                            <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm flex-1 truncate">{file.name}</span>
                            <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-transparent"
                              onClick={() => setActeDiagnosticsFiles(prev => prev.filter((_, i) => i !== index))}
                            >
                              <svg className="w-4 h-4 text-muted-foreground hover:text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
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

                  {/* DIA - Déclaration d'Intention d'Aliéner */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-indigo-50 dark:bg-indigo-950 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="acte_dateEnvoiDIA">Date d'envoi de la DIA</Label>
                      <Input 
                        id="acte_dateEnvoiDIA"
                        type="date"
                        value={acteVenteData.dateEnvoiDIA}
                        onChange={(e) => setActeVenteData({...acteVenteData, dateEnvoiDIA: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acte_reponseMairieDIA">Réponse de la mairie</Label>
                      <Select 
                        value={acteVenteData.reponseMairieDIA} 
                        onValueChange={(value) => setActeVenteData({...acteVenteData, reponseMairieDIA: value})}
                      >
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="non_preemption">Non préemption</SelectItem>
                          <SelectItem value="preemption">Préemption</SelectItem>
                          <SelectItem value="en_attente">En attente</SelectItem>
                        </SelectContent>
                      </Select>
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

                  {/* Remise des clés anticipée */}
                  <div className="space-y-4 p-4 bg-teal-50 dark:bg-teal-950 rounded-lg">
                    <h4 className="font-medium">Remise des clés anticipée</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="acte_remiseClesAnticipee">Remise anticipée des clés</Label>
                        <Select 
                          value={acteVenteData.remiseClesAnticipee} 
                          onValueChange={(value) => setActeVenteData({...acteVenteData, remiseClesAnticipee: value})}
                        >
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="non">Non</SelectItem>
                            <SelectItem value="oui">Oui</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {acteVenteData.remiseClesAnticipee === "oui" && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="acte_dateRemiseAnticipee">Date de remise anticipée</Label>
                            <Input 
                              id="acte_dateRemiseAnticipee"
                              type="date"
                              value={acteVenteData.dateRemiseAnticipee}
                              onChange={(e) => setActeVenteData({...acteVenteData, dateRemiseAnticipee: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="acte_indemnitéOccupation">Indemnité d'occupation</Label>
                            <Select 
                              value={acteVenteData.indemnitéOccupation} 
                              onValueChange={(value) => setActeVenteData({...acteVenteData, indemnitéOccupation: value})}
                            >
                              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="non">Non</SelectItem>
                                <SelectItem value="oui">Oui</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {acteVenteData.indemnitéOccupation === "oui" && (
                            <div className="space-y-2">
                              <Label htmlFor="acte_montantIndemnite">Montant de l'indemnité (€/jour)</Label>
                              <Input 
                                id="acte_montantIndemnite"
                                type="number"
                                value={acteVenteData.montantIndemnite}
                                onChange={(e) => setActeVenteData({...acteVenteData, montantIndemnite: e.target.value})}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
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
                {/* Sélection du rôle du client */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">👤 Votre client</h3>
                  <div className="space-y-2">
                    <Label>Votre client est le *</Label>
                    <RadioGroup 
                      value={bailHabitationData.clientRole} 
                      onValueChange={(value) => {
                        setBailHabitationData({
                          ...bailHabitationData, 
                          clientRole: value,
                          clientId: "",
                          // Reset des champs de l'autre partie
                          ...(value === "bailleur" ? {
                            locataireClientId: "",
                            locataireNom: "",
                            locatairePrenom: "",
                            locataireAdresse: "",
                            locataireDateNaissance: "",
                            locataireLieuNaissance: "",
                            locataireNationalite: "",
                            locataireProfession: "",
                            locataireStatutMatrimonial: "",
                            nombreOccupants: "",
                          } : {
                            bailleurClientId: "",
                            bailleurNom: "",
                            bailleurPrenom: "",
                            bailleurAdresse: "",
                            bailleurDateNaissance: "",
                            bailleurLieuNaissance: "",
                            bailleurNationalite: "",
                            bailleurProfession: "",
                            bailleurStatutMatrimonial: "",
                          })
                        });
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="bailleur" id="role_bailleur" />
                        <Label htmlFor="role_bailleur" className="cursor-pointer">Bailleur (propriétaire)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="locataire" id="role_locataire" />
                        <Label htmlFor="role_locataire" className="cursor-pointer">Locataire</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                {/* Bailleur */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">
                    {bailHabitationData.clientRole === "bailleur" ? "👤 Bailleur (votre client)" : "👤 Bailleur"}
                  </h3>
                  
                  {/* Sélection du client si bailleur */}
                  {bailHabitationData.clientRole === "bailleur" ? (
                    <div className="space-y-2">
                      <Label>Sélectionner le client bailleur *</Label>
                      <Select 
                        value={bailHabitationData.clientId} 
                        onValueChange={(value) => {
                          const selectedClient = clients.find(c => c.id === value);
                          if (selectedClient) {
                            setBailHabitationData({
                              ...bailHabitationData,
                              clientId: value,
                              bailleurClientId: value,
                              bailleurNom: selectedClient.nom,
                              bailleurPrenom: selectedClient.prenom,
                              bailleurAdresse: selectedClient.adresse || "",
                              bailleurDateNaissance: selectedClient.date_naissance || "",
                              bailleurLieuNaissance: selectedClient.lieu_naissance || "",
                              bailleurNationalite: selectedClient.nationalite || "",
                              bailleurProfession: selectedClient.profession || "",
                              bailleurStatutMatrimonial: selectedClient.statut_matrimonial || "",
                            });
                          }
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Choisir un client" /></SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>{client.nom} {client.prenom}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground mb-2">
                      Saisir manuellement les informations du bailleur
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

                  {/* Pièce d'identité du bailleur - chargée depuis client si c'est le client */}
                  {bailHabitationData.clientRole === "bailleur" && bailHabitationData.clientId ? (
                    <div className="space-y-2">
                      <Label>📎 Pièce d'identité</Label>
                      {bailClientIdentiteUrl ? (
                        <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                          <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm flex-1 text-green-700">Pièce d'identité chargée depuis le profil client</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => window.open(bailClientIdentiteUrl, '_blank')}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Voir
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                          <svg className="w-4 h-4 text-orange-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span className="text-sm flex-1 text-orange-700">Aucune pièce d'identité dans le profil client</span>
                        </div>
                      )}
                    </div>
                  ) : bailHabitationData.clientRole === "locataire" && (
                    /* Upload pour bailleur si le client est locataire */
                    <div className="space-y-2">
                      <Label>📎 Pièce d'identité du bailleur</Label>
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                        <input
                          type="file"
                          accept="application/pdf,image/*"
                          className="hidden"
                          id="bailleur-id-upload"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 0) {
                              setBailleurIdFiles(prev => [...prev, ...files]);
                              toast.success(`${files.length} fichier(s) ajouté(s)`);
                            }
                            e.target.value = '';
                          }}
                        />
                        <label htmlFor="bailleur-id-upload" className="cursor-pointer flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Joindre la pièce d'identité</p>
                            <p className="text-xs text-muted-foreground">PDF, images acceptés</p>
                          </div>
                        </label>
                      </div>
                      {bailleurIdFiles.length > 0 && (
                        <div className="space-y-2 mt-2">
                          {bailleurIdFiles.map((file, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                              <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-sm flex-1 truncate">{file.name}</span>
                              <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-transparent"
                                onClick={() => setBailleurIdFiles(prev => prev.filter((_, i) => i !== index))}
                              >
                                <svg className="w-4 h-4 text-muted-foreground hover:text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Locataire */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">
                    {bailHabitationData.clientRole === "locataire" ? "👥 Locataire (votre client)" : "👥 Locataire"}
                  </h3>
                  
                  {/* Sélection du client si locataire */}
                  {bailHabitationData.clientRole === "locataire" ? (
                    <div className="space-y-2">
                      <Label>Sélectionner le client locataire *</Label>
                      <Select 
                        value={bailHabitationData.clientId} 
                        onValueChange={(value) => {
                          const selectedClient = clients.find(c => c.id === value);
                          if (selectedClient) {
                            setBailHabitationData({
                              ...bailHabitationData,
                              clientId: value,
                              locataireClientId: value,
                              locataireNom: selectedClient.nom,
                              locatairePrenom: selectedClient.prenom,
                              locataireAdresse: selectedClient.adresse || "",
                              locataireDateNaissance: selectedClient.date_naissance || "",
                              locataireLieuNaissance: selectedClient.lieu_naissance || "",
                              locataireNationalite: selectedClient.nationalite || "",
                              locataireProfession: selectedClient.profession || "",
                              locataireStatutMatrimonial: selectedClient.statut_matrimonial || "",
                            });
                          }
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Choisir un client" /></SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>{client.nom} {client.prenom}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground mb-2">
                      Saisir manuellement les informations du locataire
                    </div>
                  )}
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

                  {/* Pièce d'identité du locataire - chargée depuis client si c'est le client */}
                  {bailHabitationData.clientRole === "locataire" && bailHabitationData.clientId ? (
                    <div className="space-y-2">
                      <Label>📎 Pièce d'identité</Label>
                      {bailClientIdentiteUrl ? (
                        <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                          <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm flex-1 text-green-700">Pièce d'identité chargée depuis le profil client</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => window.open(bailClientIdentiteUrl, '_blank')}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Voir
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                          <svg className="w-4 h-4 text-orange-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span className="text-sm flex-1 text-orange-700">Aucune pièce d'identité dans le profil client</span>
                        </div>
                      )}
                    </div>
                  ) : bailHabitationData.clientRole === "bailleur" && (
                    /* Upload section pour documents locataire si le client est bailleur */
                    <div className="space-y-2">
                      <Label>📎 Documents du locataire (pièce d'identité, justificatifs de revenus)</Label>
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                        <input
                          type="file"
                          accept="application/pdf,image/*"
                          multiple
                          className="hidden"
                          id="locataire-id-upload-alt"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 0) {
                              setLocataireIdFiles(prev => [...prev, ...files]);
                              toast.success(`${files.length} fichier(s) ajouté(s)`);
                            }
                            e.target.value = '';
                          }}
                        />
                        <label htmlFor="locataire-id-upload-alt" className="cursor-pointer flex items-center gap-3">
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
                      {locataireIdFiles.length > 0 && (
                        <div className="space-y-2 mt-2">
                          {locataireIdFiles.map((file, index) => (
                            <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                              <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-sm flex-1 truncate">{file.name}</span>
                              <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-transparent"
                                onClick={() => setLocataireIdFiles(prev => prev.filter((_, i) => i !== index))}
                              >
                                <svg className="w-4 h-4 text-muted-foreground hover:text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Situation financière du locataire */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg space-y-4">
                    <h4 className="font-medium">Situation financière du locataire</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Revenus mensuels nets (€)</Label>
                        <Input 
                          type="number"
                          value={bailHabitationData.locataireRevenusMensuelsNets} 
                          onChange={(e) => setBailHabitationData({...bailHabitationData, locataireRevenusMensuelsNets: e.target.value})} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Type de contrat de travail</Label>
                        <Select 
                          value={bailHabitationData.locataireTypeContrat} 
                          onValueChange={(value) => setBailHabitationData({...bailHabitationData, locataireTypeContrat: value})}
                        >
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CDI">CDI</SelectItem>
                            <SelectItem value="CDD">CDD</SelectItem>
                            <SelectItem value="Intérim">Intérim</SelectItem>
                            <SelectItem value="Étudiant">Étudiant</SelectItem>
                            <SelectItem value="Indépendant">Indépendant</SelectItem>
                            <SelectItem value="Autre">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Employeur actuel</Label>
                        <Input 
                          value={bailHabitationData.locataireEmployeur} 
                          onChange={(e) => setBailHabitationData({...bailHabitationData, locataireEmployeur: e.target.value})} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Adresse de l'employeur</Label>
                        <Input 
                          value={bailHabitationData.locataireEmployeurAdresse} 
                          onChange={(e) => setBailHabitationData({...bailHabitationData, locataireEmployeurAdresse: e.target.value})} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Ancienneté dans l'emploi</Label>
                        <Input 
                          value={bailHabitationData.locataireAncienneteEmployeur} 
                          onChange={(e) => setBailHabitationData({...bailHabitationData, locataireAncienneteEmployeur: e.target.value})} 
                          placeholder="Ex: 2 ans"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Colocation */}
                  <div className="space-y-4 p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                    <h4 className="font-medium">Colocation</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>S'agit-il d'une colocation ?</Label>
                        <Select 
                          value={bailHabitationData.colocation} 
                          onValueChange={(value) => setBailHabitationData({...bailHabitationData, colocation: value})}
                        >
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Non">Non</SelectItem>
                            <SelectItem value="Oui">Oui</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {bailHabitationData.colocation === "Oui" && (
                        <>
                          <div className="space-y-2">
                            <Label>Solidarité entre colocataires ?</Label>
                            <Select 
                              value={bailHabitationData.solidariteColocataires} 
                              onValueChange={(value) => setBailHabitationData({...bailHabitationData, solidariteColocataires: value})}
                            >
                              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Oui">Oui (solidaires)</SelectItem>
                                <SelectItem value="Non">Non (séparés)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Nombre de colocataires</Label>
                            <Input 
                              type="number"
                              value={bailHabitationData.nombreColocataires} 
                              onChange={(e) => setBailHabitationData({...bailHabitationData, nombreColocataires: e.target.value})} 
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>Noms et prénoms des colocataires</Label>
                            <Textarea 
                              value={bailHabitationData.colocatairesNoms} 
                              onChange={(e) => setBailHabitationData({...bailHabitationData, colocatairesNoms: e.target.value})} 
                              placeholder="Ex: Jean Dupont, Marie Martin..."
                              rows={2}
                            />
                          </div>
                        </>
                      )}
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
                            setLocataireDocsFiles(prev => [...prev, ...files]);
                            toast.success(`${files.length} fichier(s) ajouté(s)`);
                          }
                          e.target.value = '';
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
                    {locataireDocsFiles.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {locataireDocsFiles.map((file, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                            <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm flex-1 truncate">{file.name}</span>
                            <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-transparent"
                              onClick={() => setLocataireDocsFiles(prev => prev.filter((_, i) => i !== index))}
                            >
                              <svg className="w-4 h-4 text-muted-foreground hover:text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
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

                  {/* Détails parking */}
                  {bailHabitationData.dependances.includes("Parking") && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <div className="space-y-2">
                        <Label>Place de parking numérotée ?</Label>
                        <Select 
                          value={bailHabitationData.placeParking} 
                          onValueChange={(value) => setBailHabitationData({...bailHabitationData, placeParking: value})}
                        >
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Oui">Oui</SelectItem>
                            <SelectItem value="Non">Non</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {bailHabitationData.placeParking === "Oui" && (
                        <div className="space-y-2">
                          <Label>Numéro de la place</Label>
                          <Input 
                            value={bailHabitationData.numeroPlaceParking} 
                            onChange={(e) => setBailHabitationData({...bailHabitationData, numeroPlaceParking: e.target.value})} 
                            placeholder="Ex: P12"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Entretien jardin */}
                  {bailHabitationData.dependances.includes("Jardin") && (
                    <div className="space-y-2 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                      <Label>Entretien du jardin à la charge de</Label>
                      <Select 
                        value={bailHabitationData.entretienJardin} 
                        onValueChange={(value) => setBailHabitationData({...bailHabitationData, entretienJardin: value})}
                      >
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Locataire">Locataire</SelectItem>
                          <SelectItem value="Bailleur">Bailleur</SelectItem>
                          <SelectItem value="Partagé">Partagé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Spécificités du bail meublé */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">🛋️ Spécificités du bail meublé</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Type et durée du bail meublé */}
                    <div className="space-y-2">
                      <Label>Type de durée du bail meublé</Label>
                      <Select 
                        value={bailHabitationData.typeDureeMeuble} 
                        onValueChange={(value) => setBailHabitationData({...bailHabitationData, typeDureeMeuble: value})}
                      >
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1an">1 an renouvelable (cas général)</SelectItem>
                          <SelectItem value="9mois">9 mois étudiant (non renouvelable)</SelectItem>
                          <SelectItem value="mobilite">Bail mobilité (1 à 10 mois)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {bailHabitationData.typeDureeMeuble === "mobilite" && (
                          <div className="space-y-2">
                            <Label>Motif du bail mobilité</Label>
                            <Input 
                              value={bailHabitationData.motifBailMobilite} 
                              onChange={(e) => setBailHabitationData({...bailHabitationData, motifBailMobilite: e.target.value})} 
                              placeholder="Ex: Stage, études, mission professionnelle..."
                            />
                          </div>
                        )}

                        {/* Inventaire du mobilier */}
                        <div className="md:col-span-2 p-4 bg-orange-50 dark:bg-orange-950 rounded-lg space-y-3">
                          <h4 className="font-medium text-orange-800 dark:text-orange-200">📋 Inventaire complet du mobilier (OBLIGATOIRE LÉGALEMENT)</h4>
                          <div className="space-y-2">
                            <Label>Description détaillée pièce par pièce *</Label>
                            <Textarea 
                              value={bailHabitationData.inventaireMobilierTexte} 
                              onChange={(e) => setBailHabitationData({...bailHabitationData, inventaireMobilierTexte: e.target.value})} 
                              placeholder="Ex: Salon: canapé 3 places en tissu gris, table basse en bois, 2 lampes...\nChambre: lit 140x190, matelas, couette, 2 oreillers, armoire 3 portes..."
                              rows={5}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Fichier inventaire (PDF ou images)</Label>
                            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                              <input
                                type="file"
                                accept="application/pdf,image/*"
                                multiple
                                className="hidden"
                                id="inventaire-mobilier-upload"
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || []);
                                  if (files.length > 0) {
                                    setInventaireMobilierFiles(prev => [...prev, ...files]);
                                    toast.success(`${files.length} fichier(s) ajouté(s)`);
                                  }
                                  e.target.value = '';
                                }}
                              />
                              <label htmlFor="inventaire-mobilier-upload" className="cursor-pointer flex items-center gap-3">
                                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">Joindre l'inventaire</p>
                                  <p className="text-xs text-muted-foreground">PDF ou images acceptés</p>
                                </div>
                              </label>
                            </div>
                            {inventaireMobilierFiles.length > 0 && (
                              <div className="space-y-2 mt-2">
                                {inventaireMobilierFiles.map((file, index) => (
                                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                    <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="text-sm flex-1 truncate">{file.name}</span>
                                    <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 hover:bg-transparent"
                                      onClick={() => setInventaireMobilierFiles(prev => prev.filter((_, i) => i !== index))}
                                    >
                                      <svg className="w-4 h-4 text-muted-foreground hover:text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Liste légale du mobilier minimal (décret 2015-981) */}
                        <div className="md:col-span-2 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg space-y-3">
                          <h4 className="font-medium">✅ Mobilier minimal obligatoire (décret n°2015-981)</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                              { key: 'mobilierLiterie', label: 'Literie + couette ou couverture' },
                              { key: 'mobilierOccultation', label: 'Dispositif d\'occultation des fenêtres' },
                              { key: 'mobilierPlaquesCuisson', label: 'Plaques de cuisson' },
                              { key: 'mobilierFourMicroondes', label: 'Four ou micro-ondes' },
                              { key: 'mobilierRefrigo', label: 'Réfrigérateur' },
                              { key: 'mobilierCongelateur', label: 'Congélateur ou compartiment freezer' },
                              { key: 'mobilierVaisselle', label: 'Vaisselle en quantité suffisante' },
                              { key: 'mobilierUstensiles', label: 'Ustensiles de cuisine' },
                              { key: 'mobilierTable', label: 'Table' },
                              { key: 'mobilierSieges', label: 'Sièges' },
                              { key: 'mobilierEtageres', label: 'Étagères de rangement' },
                              { key: 'mobilierLampes', label: 'Lampes' },
                              { key: 'mobilierMaterielEntretien', label: 'Matériel d\'entretien' },
                            ].map((item) => (
                              <div key={item.key} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={item.key}
                                  checked={bailHabitationData[item.key as keyof typeof bailHabitationData] as boolean}
                                  onChange={(e) => setBailHabitationData({...bailHabitationData, [item.key]: e.target.checked})}
                                  className="w-4 h-4"
                                />
                                <Label htmlFor={item.key} className="cursor-pointer text-sm">{item.label}</Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* État du mobilier */}
                        <div className="space-y-2 md:col-span-2">
                          <Label>État du mobilier lors de l'entrée</Label>
                          <Textarea 
                            value={bailHabitationData.etatMobilierEntree} 
                            onChange={(e) => setBailHabitationData({...bailHabitationData, etatMobilierEntree: e.target.value})} 
                            placeholder="Description de l'état du mobilier pièce par pièce..."
                            rows={3}
                          />
                        </div>

                        {/* Entretien du mobilier */}
                        <div className="space-y-2">
                          <Label>Entretien du mobilier à la charge de</Label>
                          <Select 
                            value={bailHabitationData.entretienMobilier} 
                            onValueChange={(value) => setBailHabitationData({...bailHabitationData, entretienMobilier: value})}
                          >
                            <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Locataire">Locataire</SelectItem>
                              <SelectItem value="Bailleur">Bailleur</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                  </div>
                </div>

                {/* Animaux */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">🐾 Animaux domestiques</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Animaux domestiques autorisés ?</Label>
                      <Select 
                        value={bailHabitationData.animauxAutorises} 
                        onValueChange={(value) => setBailHabitationData({...bailHabitationData, animauxAutorises: value})}
                      >
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Oui">Oui</SelectItem>
                          <SelectItem value="Non">Non</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {bailHabitationData.animauxAutorises === "Oui" && (
                      <div className="space-y-2">
                        <Label>Précisions</Label>
                        <Input 
                          value={bailHabitationData.precisionAnimaux} 
                          onChange={(e) => setBailHabitationData({...bailHabitationData, precisionAnimaux: e.target.value})} 
                          placeholder="Ex: petits chiens, chats..."
                        />
                      </div>
                    )}
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
                                setGarantDocsFiles(prev => [...prev, ...files]);
                                toast.success(`${files.length} fichier(s) ajouté(s)`);
                              }
                              e.target.value = '';
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
                        {garantDocsFiles.length > 0 && (
                          <div className="space-y-2 mt-2">
                            {garantDocsFiles.map((file, index) => (
                              <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-sm flex-1 truncate">{file.name}</span>
                                <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 hover:bg-transparent"
                                  onClick={() => setGarantDocsFiles(prev => prev.filter((_, i) => i !== index))}
                                >
                                  <svg className="w-4 h-4 text-muted-foreground hover:text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
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

                  {/* Mode de paiement */}
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950 rounded-lg space-y-4">
                    <h4 className="font-medium">Mode de paiement du loyer</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Mode de paiement choisi</Label>
                        <Select 
                          value={bailHabitationData.modePaiement} 
                          onValueChange={(value) => setBailHabitationData({...bailHabitationData, modePaiement: value})}
                        >
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Virement">Virement</SelectItem>
                            <SelectItem value="Prélèvement automatique">Prélèvement automatique</SelectItem>
                            <SelectItem value="Chèque">Chèque</SelectItem>
                            <SelectItem value="Autre">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>IBAN du bailleur</Label>
                        <Input 
                          value={bailHabitationData.ibanBailleur} 
                          onChange={(e) => setBailHabitationData({...bailHabitationData, ibanBailleur: e.target.value})} 
                          placeholder="FR76..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Régularisation des charges */}
                  {bailHabitationData.typeCharges === "provision" && (
                    <div className="space-y-2 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
                      <Label>Périodicité de régularisation des charges</Label>
                      <Select 
                        value={bailHabitationData.periodiciteRegularisationCharges} 
                        onValueChange={(value) => setBailHabitationData({...bailHabitationData, periodiciteRegularisationCharges: value})}
                      >
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Annuelle">Annuelle</SelectItem>
                          <SelectItem value="Semestrielle">Semestrielle</SelectItem>
                          <SelectItem value="Autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
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
                          <SelectItem value="mobilite">Bail mobilité (1 à 10 mois)</SelectItem>
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

                {/* Travaux récents */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">🔨 Travaux effectués</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Travaux réalisés dans les 6 derniers mois ?</Label>
                      <Select 
                        value={bailHabitationData.travauxDerniers6Mois} 
                        onValueChange={(value) => setBailHabitationData({...bailHabitationData, travauxDerniers6Mois: value})}
                      >
                        <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Non">Non</SelectItem>
                          <SelectItem value="Oui">Oui</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {bailHabitationData.travauxDerniers6Mois === "Oui" && (
                      <div className="space-y-2 md:col-span-2">
                        <Label>Description des travaux</Label>
                        <Textarea 
                          value={bailHabitationData.descriptionTravaux} 
                          onChange={(e) => setBailHabitationData({...bailHabitationData, descriptionTravaux: e.target.value})} 
                          placeholder="Ex: Peinture, rénovation salle de bain, électricité..."
                          rows={3}
                        />
                      </div>
                    )}
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
                            setBailDiagnosticsFiles(prev => [...prev, ...files]);
                            toast.success(`${files.length} fichier(s) ajouté(s)`);
                          }
                          e.target.value = '';
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
                    {bailDiagnosticsFiles.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {bailDiagnosticsFiles.map((file, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                            <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm flex-1 truncate">{file.name}</span>
                            <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-transparent"
                              onClick={() => setBailDiagnosticsFiles(prev => prev.filter((_, i) => i !== index))}
                            >
                              <svg className="w-4 h-4 text-muted-foreground hover:text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
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

                {/* Remise des clés */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">🔑 Remise des clés et accès</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre de jeux de clés remis</Label>
                      <Input 
                        type="number"
                        value={bailHabitationData.nombreJeuxCles} 
                        onChange={(e) => setBailHabitationData({...bailHabitationData, nombreJeuxCles: e.target.value})} 
                        placeholder="Ex: 2"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Types de clés</Label>
                      <div className="flex flex-wrap gap-3">
                        {[
                          { value: "portes", label: "Portes" },
                          { value: "boites_aux_lettres", label: "Boîtes aux lettres" },
                          { value: "garage", label: "Garage" },
                          { value: "badges", label: "Badges" },
                          { value: "telecommande", label: "Télécommande portail" }
                        ].map((type) => (
                          <label key={type.value} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={bailHabitationData.typesCles.includes(type.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setBailHabitationData({
                                    ...bailHabitationData, 
                                    typesCles: [...bailHabitationData.typesCles, type.value]
                                  });
                                } else {
                                  setBailHabitationData({
                                    ...bailHabitationData, 
                                    typesCles: bailHabitationData.typesCles.filter(t => t !== type.value)
                                  });
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm">{type.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Codes fournis (optionnel)</Label>
                      <Textarea 
                        value={bailHabitationData.codesFournis} 
                        onChange={(e) => setBailHabitationData({...bailHabitationData, codesFournis: e.target.value})} 
                        rows={2}
                        placeholder="Ex: WIFI, interphone, digicode d'entrée..."
                      />
                    </div>
                  </div>
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

            {/* Formulaire spécifique pour Bail commercial */}
            {pendingContractType === "Bail commercial / professionnel" && (
              <>
                <div className="space-y-6">
                  {/* Sélection du type de bail */}
                  <div className="space-y-4 bg-muted/50 p-4 rounded-lg">
                    <h3 className="font-semibold text-lg">📋 Type de bail *</h3>
                    <div className="space-y-2">
                      <RadioGroup 
                        value={bailCommercialData.typeBail} 
                        onValueChange={(value) => setBailCommercialData({...bailCommercialData, typeBail: value})}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="commercial" id="bail_type_commercial" />
                          <Label htmlFor="bail_type_commercial" className="cursor-pointer">
                            <span className="font-medium">Bail commercial</span>
                            <span className="text-xs text-muted-foreground ml-2">(statut 3/6/9 - activité commerciale)</span>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="professionnel" id="bail_type_professionnel" />
                          <Label htmlFor="bail_type_professionnel" className="cursor-pointer">
                            <span className="font-medium">Bail professionnel</span>
                            <span className="text-xs text-muted-foreground ml-2">(profession libérale - min. 6 ans)</span>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  {/* Sélection du rôle du client */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">👤 Votre client</h3>
                    <div className="space-y-2">
                      <Label>Votre client est le *</Label>
                          <RadioGroup 
                            value={bailCommercialData.clientRole} 
                            onValueChange={(value) => {
                              setBailCommercialData({
                                ...bailCommercialData, 
                                clientRole: value,
                                clientId: "",
                                // Reset des champs de l'autre partie
                                ...(value === "bailleur" ? {
                                  locataireClientId: "",
                                  statutLocataire: "",
                                  locataireNom: "",
                                  locatairePrenom: "",
                                  locataireAdresse: "",
                                  locataireImmatriculation: "",
                                  locataireDenomination: "",
                                  locataireFormeJuridique: "",
                                  locataireSiege: "",
                                  locataireSiren: "",
                                  locataireSiret: "",
                                } : {
                                  bailleurClientId: "",
                                  statutBailleur: "",
                                  bailleurNom: "",
                                  bailleurPrenom: "",
                                  bailleurDenomination: "",
                                  bailleurFormeJuridique: "",
                                  bailleurAdresse: "",
                                  bailleurSiren: "",
                                  bailleurSiret: "",
                                })
                              });
                            }}
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="bailleur" id="bc_role_bailleur" />
                              <Label htmlFor="bc_role_bailleur" className="cursor-pointer">Bailleur (propriétaire)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="preneur" id="bc_role_preneur" />
                          <Label htmlFor="bc_role_preneur" className="cursor-pointer">Preneur (locataire)</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  {/* Bailleur */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">
                      {bailCommercialData.clientRole === "bailleur" ? "🏢 Bailleur (votre client)" : "🏢 Bailleur"}
                    </h3>
                    
                    {/* Sélection du client si bailleur */}
                    {bailCommercialData.clientRole === "bailleur" && (
                      <div className="space-y-2">
                        <Label>Sélectionner le client bailleur *</Label>
                        <Select 
                          value={bailCommercialData.clientId} 
                          onValueChange={(value) => {
                            const selectedClient = clients.find(c => c.id === value);
                            if (selectedClient) {
                              console.log('🔍 BAILLEUR - Client:', selectedClient);
                              console.log('🔍 BAILLEUR - situation_matrimoniale:', selectedClient.situation_matrimoniale);
                              console.log('🔍 BAILLEUR - situation_familiale:', selectedClient.situation_familiale);
                              
                              let situationFamiliale = "";
                              let regimeMatrimonial = "";
                              
                              // Essayer d'abord situation_matrimoniale
                              if (selectedClient.situation_matrimoniale) {
                                if (typeof selectedClient.situation_matrimoniale === 'object') {
                                  // Cas 1: Objet JSON dans situation_matrimoniale
                                  situationFamiliale = selectedClient.situation_matrimoniale.situation_familiale || '';
                                  regimeMatrimonial = selectedClient.situation_matrimoniale.regime_matrimonial || '';
                                  
                                  console.log('🔍 BAILLEUR - Extrait de situation_matrimoniale:', situationFamiliale, regimeMatrimonial);
                                  
                                  // Capitaliser
                                  if (situationFamiliale) {
                                    situationFamiliale = situationFamiliale.charAt(0).toUpperCase() + situationFamiliale.slice(1);
                                  }
                                  if (regimeMatrimonial) {
                                    regimeMatrimonial = regimeMatrimonial.replace(/_/g, ' ');
                                  }
                                } else if (typeof selectedClient.situation_matrimoniale === 'string') {
                                  // Cas 2: Simple chaîne de texte
                                  situationFamiliale = selectedClient.situation_matrimoniale;
                                  console.log('🔍 BAILLEUR - String directe:', situationFamiliale);
                                }
                              }
                              
                              // Si pas trouvé, essayer situation_familiale
                              if (!situationFamiliale && selectedClient.situation_familiale) {
                                if (typeof selectedClient.situation_familiale === 'object') {
                                  // Objet JSON dans situation_familiale
                                  situationFamiliale = selectedClient.situation_familiale.situation_familiale || '';
                                  regimeMatrimonial = selectedClient.situation_familiale.regime_matrimonial || '';
                                  
                                  console.log('🔍 BAILLEUR - Extrait de situation_familiale:', situationFamiliale, regimeMatrimonial);
                                  
                                  // Capitaliser
                                  if (situationFamiliale) {
                                    situationFamiliale = situationFamiliale.charAt(0).toUpperCase() + situationFamiliale.slice(1);
                                  }
                                  if (regimeMatrimonial) {
                                    regimeMatrimonial = regimeMatrimonial.replace(/_/g, ' ');
                                  }
                                } else if (typeof selectedClient.situation_familiale === 'string') {
                                  // Simple chaîne
                                  situationFamiliale = selectedClient.situation_familiale;
                                  console.log('🔍 BAILLEUR - String situation_familiale:', situationFamiliale);
                                }
                              }
                              
                              console.log('🔍 BAILLEUR - Valeurs finales:', { situationFamiliale, regimeMatrimonial });
                              
                              setBailCommercialData({
                                ...bailCommercialData,
                                clientId: value,
                                bailleurClientId: value,
                                statutBailleur: "physique",
                                bailleurNom: selectedClient.nom || "",
                                bailleurPrenom: selectedClient.prenom || "",
                                bailleurAdresse: selectedClient.adresse || "",
                                bailleurDateNaissance: selectedClient.date_naissance || "",
                                bailleurLieuNaissance: selectedClient.lieu_naissance || "",
                                bailleurNationalite: selectedClient.nationalite || "",
                                bailleurSituationFamiliale: situationFamiliale,
                                bailleurRegimeMatrimonial: regimeMatrimonial,
                                bailleurProfession: selectedClient.profession || "",
                              });
                            }
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="Choisir un client" /></SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>{client.nom} {client.prenom}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {bailCommercialData.clientRole === "preneur" && (
                      <div className="text-sm text-muted-foreground mb-2">
                        Saisir manuellement les informations du bailleur
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Statut du bailleur *</Label>
                        <Select 
                          value={bailCommercialData.statutBailleur} 
                          onValueChange={(value) => setBailCommercialData({...bailCommercialData, statutBailleur: value})}
                        >
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="physique">Personne physique</SelectItem>
                            <SelectItem value="morale">Personne morale (société)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Champs personne physique */}
                    {bailCommercialData.statutBailleur === "physique" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                          <Label>Nom *</Label>
                          <Input value={bailCommercialData.bailleurNom} onChange={(e) => setBailCommercialData({...bailCommercialData, bailleurNom: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Prénom *</Label>
                          <Input value={bailCommercialData.bailleurPrenom} onChange={(e) => setBailCommercialData({...bailCommercialData, bailleurPrenom: e.target.value})} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Adresse complète *</Label>
                          <Input value={bailCommercialData.bailleurAdresse} onChange={(e) => setBailCommercialData({...bailCommercialData, bailleurAdresse: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Date de naissance *</Label>
                          <Input type="date" value={bailCommercialData.bailleurDateNaissance} onChange={(e) => setBailCommercialData({...bailCommercialData, bailleurDateNaissance: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Lieu de naissance *</Label>
                          <Input value={bailCommercialData.bailleurLieuNaissance} onChange={(e) => setBailCommercialData({...bailCommercialData, bailleurLieuNaissance: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Nationalité *</Label>
                          <Input value={bailCommercialData.bailleurNationalite} onChange={(e) => setBailCommercialData({...bailCommercialData, bailleurNationalite: e.target.value})} placeholder="Ex: Française" />
                        </div>
                        <div className="space-y-2">
                          <Label>Situation familiale</Label>
                          <Input value={bailCommercialData.bailleurSituationFamiliale} onChange={(e) => setBailCommercialData({...bailCommercialData, bailleurSituationFamiliale: e.target.value})} placeholder="Ex: Célibataire, Marié, Divorcé..." />
                        </div>
                        {bailCommercialData.bailleurSituationFamiliale && ['marié', 'marie', 'mariée', 'pacsé', 'pacse', 'pacs'].some(term => bailCommercialData.bailleurSituationFamiliale.toLowerCase().includes(term)) && (
                          <div className="space-y-2">
                            <Label>Régime matrimonial</Label>
                            <Input value={bailCommercialData.bailleurRegimeMatrimonial} onChange={(e) => setBailCommercialData({...bailCommercialData, bailleurRegimeMatrimonial: e.target.value})} placeholder="Ex: Communauté légale, Séparation de biens..." />
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label>Profession</Label>
                          <Input value={bailCommercialData.bailleurProfession} onChange={(e) => setBailCommercialData({...bailCommercialData, bailleurProfession: e.target.value})} />
                        </div>

                        {/* Upload carte identité bailleur si le client est preneur (avant la fin de la grid) */}
                        {bailCommercialData.clientRole === "preneur" && (
                          <div className="space-y-2 md:col-span-2">
                            <Label>📎 Pièce d'identité du bailleur</Label>
                            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                              <input
                                type="file"
                                accept="application/pdf,image/*"
                                multiple
                                className="hidden"
                                id="bail-commercial-bailleur-upload"
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || []);
                                  if (files.length > 0) {
                                    setBailCommercialBailleurFiles(files);
                                    toast.success(`${files.length} fichier(s) ajouté(s)`);
                                  }
                                  e.target.value = '';
                                }}
                              />
                              <label htmlFor="bail-commercial-bailleur-upload" className="cursor-pointer flex items-center gap-3">
                                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">Joindre la pièce d'identité</p>
                                  <p className="text-xs text-muted-foreground">PDF ou images</p>
                                </div>
                              </label>
                            </div>
                            {bailCommercialBailleurFiles.length > 0 && (
                              <div className="space-y-2 mt-2">
                                {bailCommercialBailleurFiles.map((file, index) => (
                                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                    <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="text-sm flex-1 truncate">{file.name}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => {
                                        setBailCommercialBailleurFiles(prev => prev.filter((_, i) => i !== index));
                                        toast.success('Fichier supprimé');
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pièce d'identité du bailleur (si client sélectionné) */}
                    {bailCommercialData.clientRole === "bailleur" && bailCommercialData.clientId && (
                      <div className="space-y-2 mt-4">
                        <Label>📎 Pièce d'identité du bailleur</Label>
                        {bailCommercialBailleurClientIdentiteUrl ? (
                          <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                            <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm flex-1 text-green-700">Pièce d'identité chargée depuis le profil client</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => window.open(bailCommercialBailleurClientIdentiteUrl, '_blank')}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                            <svg className="w-4 h-4 text-orange-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span className="text-sm flex-1 text-orange-700">Aucune pièce d'identité dans le profil client</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Champs personne morale */}
                    {bailCommercialData.statutBailleur === "morale" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2 md:col-span-2">
                          <Label>Dénomination sociale *</Label>
                          <Input value={bailCommercialData.bailleurDenomination} onChange={(e) => setBailCommercialData({...bailCommercialData, bailleurDenomination: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Forme juridique *</Label>
                          <Select value={bailCommercialData.bailleurFormeJuridique} onValueChange={(value) => setBailCommercialData({...bailCommercialData, bailleurFormeJuridique: value})}>
                            <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SAS">SAS</SelectItem>
                              <SelectItem value="SARL">SARL</SelectItem>
                              <SelectItem value="SCI">SCI</SelectItem>
                              <SelectItem value="SA">SA</SelectItem>
                              <SelectItem value="EURL">EURL</SelectItem>
                              <SelectItem value="SASU">SASU</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>SIREN *</Label>
                          <Input value={bailCommercialData.bailleurSiren} onChange={(e) => setBailCommercialData({...bailCommercialData, bailleurSiren: e.target.value})} placeholder="9 chiffres" />
                        </div>
                        <div className="space-y-2">
                          <Label>SIRET *</Label>
                          <Input value={bailCommercialData.bailleurSiret} onChange={(e) => setBailCommercialData({...bailCommercialData, bailleurSiret: e.target.value})} placeholder="14 chiffres" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Adresse du siège social *</Label>
                          <Input value={bailCommercialData.bailleurSiegeSocial} onChange={(e) => setBailCommercialData({...bailCommercialData, bailleurSiegeSocial: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Capital social</Label>
                          <Input value={bailCommercialData.bailleurCapitalSocial} onChange={(e) => setBailCommercialData({...bailCommercialData, bailleurCapitalSocial: e.target.value})} placeholder="Ex: 10000 €" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <h4 className="font-medium text-sm mt-4">Représentant légal</h4>
                        </div>
                        <div className="space-y-2">
                          <Label>Nom du représentant *</Label>
                          <Input value={bailCommercialData.bailleurRepresentant} onChange={(e) => setBailCommercialData({...bailCommercialData, bailleurRepresentant: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Prénom du représentant *</Label>
                          <Input value={bailCommercialData.bailleurRepresentantPrenom} onChange={(e) => setBailCommercialData({...bailCommercialData, bailleurRepresentantPrenom: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Fonction *</Label>
                          <Input value={bailCommercialData.bailleurRepresentantFonction} onChange={(e) => setBailCommercialData({...bailCommercialData, bailleurRepresentantFonction: e.target.value})} placeholder="Ex: Gérant, Président..." />
                        </div>
                        <div className="space-y-2">
                          <Label>Le signataire est-il le représentant légal ? *</Label>
                          <Select value={bailCommercialData.bailleurRepresentantEstLegal} onValueChange={(value) => setBailCommercialData({...bailCommercialData, bailleurRepresentantEstLegal: value})}>
                            <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="oui">Oui</SelectItem>
                              <SelectItem value="non">Non (mandataire)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {bailCommercialData.bailleurRepresentantEstLegal === "non" && (
                          <>
                            <div className="space-y-2 md:col-span-2">
                              <h4 className="font-medium text-sm mt-2">Mandataire</h4>
                            </div>
                            <div className="space-y-2">
                              <Label>Nom du mandataire *</Label>
                              <Input value={bailCommercialData.bailleurMandataireNom} onChange={(e) => setBailCommercialData({...bailCommercialData, bailleurMandataireNom: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                              <Label>Prénom du mandataire *</Label>
                              <Input value={bailCommercialData.bailleurMandatairePrenom} onChange={(e) => setBailCommercialData({...bailCommercialData, bailleurMandatairePrenom: e.target.value})} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>Type de pouvoir *</Label>
                              <Input value={bailCommercialData.bailleurMandataireTypePouvoir} onChange={(e) => setBailCommercialData({...bailCommercialData, bailleurMandataireTypePouvoir: e.target.value})} placeholder="Ex: Procuration spéciale..." />
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Local commercial */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">🏪 Local commercial</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label>Adresse complète du local *</Label>
                        <Input 
                          value={bailCommercialData.adresseLocal} 
                          onChange={(e) => setBailCommercialData({...bailCommercialData, adresseLocal: e.target.value})} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nature du local *</Label>
                        <Select 
                          value={bailCommercialData.natureLocal} 
                          onValueChange={(value) => setBailCommercialData({...bailCommercialData, natureLocal: value})}
                        >
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="boutique">Boutique</SelectItem>
                            <SelectItem value="bureaux">Bureaux</SelectItem>
                            <SelectItem value="restaurant">Restaurant</SelectItem>
                            <SelectItem value="entrepot">Entrepôt</SelectItem>
                            <SelectItem value="atelier">Atelier</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Surface totale (m²) *</Label>
                        <Input 
                          type="number"
                          value={bailCommercialData.surfaceTotale} 
                          onChange={(e) => setBailCommercialData({...bailCommercialData, surfaceTotale: e.target.value})} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preneur (Locataire) */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">
                      {bailCommercialData.clientRole === "preneur" ? "🏢 Preneur (votre client)" : "🏢 Preneur (Locataire)"}
                    </h3>
                    
                    {/* Sélection du client si preneur */}
                    {bailCommercialData.clientRole === "preneur" && (
                      <div className="space-y-2">
                        <Label>Sélectionner le client preneur *</Label>
                        <Select 
                          value={bailCommercialData.clientId} 
                          onValueChange={(value) => {
                            const selectedClient = clients.find(c => c.id === value);
                            if (selectedClient) {
                              let situationFamiliale = "";
                              let regimeMatrimonial = "";
                              
                              // Essayer d'abord situation_matrimoniale
                              if (selectedClient.situation_matrimoniale) {
                                if (typeof selectedClient.situation_matrimoniale === 'object') {
                                  // Cas 1: Objet JSON dans situation_matrimoniale
                                  situationFamiliale = selectedClient.situation_matrimoniale.situation_familiale || '';
                                  regimeMatrimonial = selectedClient.situation_matrimoniale.regime_matrimonial || '';
                                  
                                  // Capitaliser
                                  if (situationFamiliale) {
                                    situationFamiliale = situationFamiliale.charAt(0).toUpperCase() + situationFamiliale.slice(1);
                                  }
                                  if (regimeMatrimonial) {
                                    regimeMatrimonial = regimeMatrimonial.replace(/_/g, ' ');
                                  }
                                } else if (typeof selectedClient.situation_matrimoniale === 'string') {
                                  // Cas 2: Simple chaîne de texte
                                  situationFamiliale = selectedClient.situation_matrimoniale;
                                }
                              }
                              
                              // Si pas trouvé, essayer situation_familiale
                              if (!situationFamiliale && selectedClient.situation_familiale) {
                                if (typeof selectedClient.situation_familiale === 'object') {
                                  // Objet JSON dans situation_familiale
                                  situationFamiliale = selectedClient.situation_familiale.situation_familiale || '';
                                  regimeMatrimonial = selectedClient.situation_familiale.regime_matrimonial || '';
                                  
                                  // Capitaliser
                                  if (situationFamiliale) {
                                    situationFamiliale = situationFamiliale.charAt(0).toUpperCase() + situationFamiliale.slice(1);
                                  }
                                  if (regimeMatrimonial) {
                                    regimeMatrimonial = regimeMatrimonial.replace(/_/g, ' ');
                                  }
                                } else if (typeof selectedClient.situation_familiale === 'string') {
                                  // Simple chaîne
                                  situationFamiliale = selectedClient.situation_familiale;
                                }
                              }
                              
                              setBailCommercialData({
                                ...bailCommercialData,
                                clientId: value,
                                locataireClientId: value,
                                statutLocataire: "physique",
                                locataireNom: selectedClient.nom || "",
                                locatairePrenom: selectedClient.prenom || "",
                                locataireAdresse: selectedClient.adresse || "",
                                locataireDateNaissance: selectedClient.date_naissance || "",
                                locataireLieuNaissance: selectedClient.lieu_naissance || "",
                                locataireNationalite: selectedClient.nationalite || "",
                                locataireSituationFamiliale: situationFamiliale,
                                locataireRegimeMatrimonial: regimeMatrimonial,
                                locataireProfession: selectedClient.profession || "",
                                locataireTelephone: selectedClient.telephone || "",
                                locataireEmail: selectedClient.email || "",
                              });
                            }
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="Choisir un client" /></SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>{client.nom} {client.prenom}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {bailCommercialData.clientRole === "bailleur" && (
                      <div className="text-sm text-muted-foreground mb-2">
                        Saisir manuellement les informations du preneur
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Statut du preneur *</Label>
                        <Select 
                          value={bailCommercialData.statutLocataire} 
                          onValueChange={(value) => setBailCommercialData({...bailCommercialData, statutLocataire: value})}
                        >
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="physique">Personne physique</SelectItem>
                            <SelectItem value="morale">Personne morale (société)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Champs personne physique */}
                    {bailCommercialData.statutLocataire === "physique" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                          <Label>Nom *</Label>
                          <Input value={bailCommercialData.locataireNom} onChange={(e) => setBailCommercialData({...bailCommercialData, locataireNom: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Prénom *</Label>
                          <Input value={bailCommercialData.locatairePrenom} onChange={(e) => setBailCommercialData({...bailCommercialData, locatairePrenom: e.target.value})} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Adresse actuelle *</Label>
                          <Input value={bailCommercialData.locataireAdresse} onChange={(e) => setBailCommercialData({...bailCommercialData, locataireAdresse: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Date de naissance *</Label>
                          <Input type="date" value={bailCommercialData.locataireDateNaissance} onChange={(e) => setBailCommercialData({...bailCommercialData, locataireDateNaissance: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Lieu de naissance *</Label>
                          <Input value={bailCommercialData.locataireLieuNaissance} onChange={(e) => setBailCommercialData({...bailCommercialData, locataireLieuNaissance: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Nationalité *</Label>
                          <Input value={bailCommercialData.locataireNationalite} onChange={(e) => setBailCommercialData({...bailCommercialData, locataireNationalite: e.target.value})} placeholder="Ex: Française" />
                        </div>
                        <div className="space-y-2">
                          <Label>Situation familiale</Label>
                          <Input value={bailCommercialData.locataireSituationFamiliale} onChange={(e) => setBailCommercialData({...bailCommercialData, locataireSituationFamiliale: e.target.value})} placeholder="Ex: Célibataire, Marié, Divorcé..." />
                        </div>
                        {bailCommercialData.locataireSituationFamiliale && ['marié', 'marie', 'mariée', 'pacsé', 'pacse', 'pacs'].some(term => bailCommercialData.locataireSituationFamiliale.toLowerCase().includes(term)) && (
                          <div className="space-y-2">
                            <Label>Régime matrimonial</Label>
                            <Input value={bailCommercialData.locataireRegimeMatrimonial} onChange={(e) => setBailCommercialData({...bailCommercialData, locataireRegimeMatrimonial: e.target.value})} placeholder="Ex: Communauté légale, Séparation de biens..." />
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label>Profession *</Label>
                          <Input value={bailCommercialData.locataireProfession} onChange={(e) => setBailCommercialData({...bailCommercialData, locataireProfession: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Téléphone *</Label>
                          <Input value={bailCommercialData.locataireTelephone} onChange={(e) => setBailCommercialData({...bailCommercialData, locataireTelephone: e.target.value})} placeholder="06 XX XX XX XX" />
                        </div>

                        {/* Upload carte identité preneur si le client est bailleur (avant Email) */}
                        {bailCommercialData.clientRole === "bailleur" && (
                          <div className="space-y-2 md:col-span-2">
                            <Label>📎 Pièce d'identité du preneur</Label>
                            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                              <input
                                type="file"
                                accept="application/pdf,image/*"
                                multiple
                                className="hidden"
                                id="bail-commercial-preneur-upload"
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || []);
                                  if (files.length > 0) {
                                    setBailCommercialLocataireFiles(files);
                                    toast.success(`${files.length} fichier(s) ajouté(s)`);
                                  }
                                  e.target.value = '';
                                }}
                              />
                              <label htmlFor="bail-commercial-preneur-upload" className="cursor-pointer flex items-center gap-3">
                                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">Joindre la pièce d'identité</p>
                                  <p className="text-xs text-muted-foreground">PDF ou images</p>
                                </div>
                              </label>
                            </div>
                            {bailCommercialLocataireFiles.length > 0 && (
                              <div className="space-y-2 mt-2">
                                {bailCommercialLocataireFiles.map((file, index) => (
                                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                    <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="text-sm flex-1 truncate">{file.name}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => {
                                        setBailCommercialLocataireFiles(prev => prev.filter((_, i) => i !== index));
                                        toast.success('Fichier supprimé');
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="space-y-2 md:col-span-2">
                          <Label>Email *</Label>
                          <Input type="email" value={bailCommercialData.locataireEmail} onChange={(e) => setBailCommercialData({...bailCommercialData, locataireEmail: e.target.value})} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <h4 className="font-medium text-sm mt-4">Activité professionnelle</h4>
                        </div>
                        <div className="space-y-2">
                          <Label>Exerce en nom propre ou sous EI ? *</Label>
                          <Select value={bailCommercialData.locataireExerceEnNomPropre} onValueChange={(value) => setBailCommercialData({...bailCommercialData, locataireExerceEnNomPropre: value})}>
                            <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nom_propre">Nom propre</SelectItem>
                              <SelectItem value="ei">EI</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Intitulé de l'activité exercée *</Label>
                          <Input value={bailCommercialData.locataireActivite} onChange={(e) => setBailCommercialData({...bailCommercialData, locataireActivite: e.target.value})} placeholder="Ex: Commerce de détail, Artisan..." />
                        </div>
                        <div className="space-y-2">
                          <Label>Numéro SIREN</Label>
                          <Input value={bailCommercialData.locataireSirenPersonnel} onChange={(e) => setBailCommercialData({...bailCommercialData, locataireSirenPersonnel: e.target.value})} placeholder="Si existant" />
                        </div>
                        <div className="space-y-2">
                          <Label>Entreprise en cours de création ? *</Label>
                          <Select value={bailCommercialData.locataireEntrepriseEnCreation} onValueChange={(value) => setBailCommercialData({...bailCommercialData, locataireEntrepriseEnCreation: value})}>
                            <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="oui">Oui</SelectItem>
                              <SelectItem value="non">Non</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* Pièce d'identité du preneur (si client sélectionné) */}
                    {bailCommercialData.clientRole === "preneur" && bailCommercialData.clientId && bailCommercialData.statutLocataire === "physique" && (
                      <div className="space-y-2 mt-4">
                        <Label>📎 Pièce d'identité du preneur</Label>
                        {bailCommercialPreneurClientIdentiteUrl ? (
                          <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                            <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm flex-1 text-green-700">Pièce d'identité chargée depuis le profil client</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => window.open(bailCommercialPreneurClientIdentiteUrl, '_blank')}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                            <svg className="w-4 h-4 text-orange-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span className="text-sm flex-1 text-orange-700">Aucune pièce d'identité dans le profil client</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Upload carte identité pour l'autre partie (bailleur qui n'est pas client) - déplacé ailleurs */}

                    {/* Champs personne morale */}
                    {bailCommercialData.statutLocataire === "morale" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2 md:col-span-2">
                          <Label>Dénomination sociale *</Label>
                          <Input value={bailCommercialData.locataireDenomination} onChange={(e) => setBailCommercialData({...bailCommercialData, locataireDenomination: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Forme juridique *</Label>
                          <Select value={bailCommercialData.locataireFormeJuridique} onValueChange={(value) => setBailCommercialData({...bailCommercialData, locataireFormeJuridique: value})}>
                            <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SAS">SAS</SelectItem>
                              <SelectItem value="SARL">SARL</SelectItem>
                              <SelectItem value="SCI">SCI</SelectItem>
                              <SelectItem value="SA">SA</SelectItem>
                              <SelectItem value="EURL">EURL</SelectItem>
                              <SelectItem value="SASU">SASU</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>SIREN *</Label>
                          <Input value={bailCommercialData.locataireSiren} onChange={(e) => setBailCommercialData({...bailCommercialData, locataireSiren: e.target.value})} placeholder="9 chiffres" />
                        </div>
                        <div className="space-y-2">
                          <Label>SIRET *</Label>
                          <Input value={bailCommercialData.locataireSiret} onChange={(e) => setBailCommercialData({...bailCommercialData, locataireSiret: e.target.value})} placeholder="14 chiffres" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Adresse du siège social *</Label>
                          <Input value={bailCommercialData.locataireSiege} onChange={(e) => setBailCommercialData({...bailCommercialData, locataireSiege: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Objet social *</Label>
                          <Input value={bailCommercialData.locataireObjetSocial} onChange={(e) => setBailCommercialData({...bailCommercialData, locataireObjetSocial: e.target.value})} placeholder="Pour vérifier compatibilité" />
                        </div>
                        <div className="space-y-2">
                          <Label>Capital social</Label>
                          <Input value={bailCommercialData.locataireCapital} onChange={(e) => setBailCommercialData({...bailCommercialData, locataireCapital: e.target.value})} placeholder="Ex: 5000 €" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <h4 className="font-medium text-sm mt-4">Représentant légal</h4>
                        </div>
                        <div className="space-y-2">
                          <Label>Nom du représentant *</Label>
                          <Input value={bailCommercialData.locataireRepresentant} onChange={(e) => setBailCommercialData({...bailCommercialData, locataireRepresentant: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Prénom du représentant *</Label>
                          <Input value={bailCommercialData.locataireRepresentantPrenom} onChange={(e) => setBailCommercialData({...bailCommercialData, locataireRepresentantPrenom: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Fonction *</Label>
                          <Input value={bailCommercialData.locataireRepresentantFonction} onChange={(e) => setBailCommercialData({...bailCommercialData, locataireRepresentantFonction: e.target.value})} placeholder="Ex: Gérant, Président..." />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <h4 className="font-medium text-sm mt-2">Mandataire (si différent du représentant)</h4>
                        </div>
                        <div className="space-y-2">
                          <Label>Nom du mandataire</Label>
                          <Input value={bailCommercialData.locataireMandataireNom} onChange={(e) => setBailCommercialData({...bailCommercialData, locataireMandataireNom: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Prénom du mandataire</Label>
                          <Input value={bailCommercialData.locataireMandatairePrenom} onChange={(e) => setBailCommercialData({...bailCommercialData, locataireMandatairePrenom: e.target.value})} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Type de pouvoir</Label>
                          <Input value={bailCommercialData.locataireMandataireTypePouvoir} onChange={(e) => setBailCommercialData({...bailCommercialData, locataireMandataireTypePouvoir: e.target.value})} placeholder="Ex: Procuration..." />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Activité */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">💼 Activité</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label>Activité principale autorisée *</Label>
                        <Input 
                          value={bailCommercialData.activitePrincipale} 
                          onChange={(e) => setBailCommercialData({...bailCommercialData, activitePrincipale: e.target.value})} 
                          placeholder="Ex: Commerce de détail, Restauration, Cabinet médical..."
                        />
                      </div>

                      {/* COMMERCIAL UNIQUEMENT - 1. Destination des lieux */}
                      {bailCommercialData.typeBail === "commercial" && (
                        <>
                          <div className="space-y-2">
                            <Label>Destination contractuelle précise *</Label>
                            <Textarea 
                              value={bailCommercialData.destinationContractuelle} 
                              onChange={(e) => setBailCommercialData({...bailCommercialData, destinationContractuelle: e.target.value})} 
                              placeholder="Ex: Vente et préparation de produits alimentaires à consommer sur place ou à emporter"
                              rows={3}
                            />
                            <p className="text-xs text-muted-foreground">Décrivez précisément les activités autorisées</p>
                          </div>

                          <div className="space-y-2">
                            <Label>Exclusivités éventuelles</Label>
                            <Textarea 
                              value={bailCommercialData.exclusivitesEventuelles} 
                              onChange={(e) => setBailCommercialData({...bailCommercialData, exclusivitesEventuelles: e.target.value})} 
                              placeholder="Ex: Exclusivité de vente de produits bio dans l'immeuble"
                              rows={2}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Interdictions d'usage</Label>
                            <Textarea 
                              value={bailCommercialData.interdictionsUsage} 
                              onChange={(e) => setBailCommercialData({...bailCommercialData, interdictionsUsage: e.target.value})} 
                              placeholder="Ex: À l'exclusion de toute activité bruyante ou nuisible"
                              rows={2}
                            />
                          </div>
                        </>
                      )}

                      {/* PROFESSIONNEL UNIQUEMENT - Type de profession */}
                      {bailCommercialData.typeBail === "professionnel" && (
                        <>
                          <div className="space-y-2">
                            <Label>Type de profession *</Label>
                            <Select 
                              value={bailCommercialData.typeProfession} 
                              onValueChange={(value) => setBailCommercialData({...bailCommercialData, typeProfession: value})}
                            >
                              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="libérale_reglementee">Profession libérale réglementée (médecin, avocat, architecte...)</SelectItem>
                                <SelectItem value="libérale_non_reglementee">Profession libérale non réglementée (consultant, coach...)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {bailCommercialData.typeProfession === "libérale_reglementee" && (
                            <>
                              <div className="space-y-2">
                                <Label>Numéro d'ordre professionnel *</Label>
                                <Input 
                                  value={bailCommercialData.numeroOrdreProfessionnel} 
                                  onChange={(e) => setBailCommercialData({...bailCommercialData, numeroOrdreProfessionnel: e.target.value})} 
                                  placeholder="Ex: Numéro RPPS, numéro d'inscription au barreau..."
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>📎 Attestation d'inscription à l'ordre</Label>
                                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                                  <input
                                    type="file"
                                    accept="application/pdf"
                                    multiple
                                    className="hidden"
                                    id="bail-professionnel-ordre-upload"
                                    onChange={(e) => {
                                      const files = Array.from(e.target.files || []);
                                      if (files.length > 0) {
                                        setBailProfessionnelOrdreFiles(files);
                                        toast.success(`${files.length} fichier(s) ajouté(s)`);
                                      }
                                      e.target.value = '';
                                    }}
                                  />
                                  <label htmlFor="bail-professionnel-ordre-upload" className="cursor-pointer flex items-center gap-3">
                                    <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                      <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">Joindre l'attestation d'inscription</p>
                                      <p className="text-xs text-muted-foreground">PDF uniquement</p>
                                    </div>
                                  </label>
                                </div>
                                {bailProfessionnelOrdreFiles.length > 0 && (
                                  <div className="space-y-2 mt-2">
                                    {bailProfessionnelOrdreFiles.map((file, index) => (
                                      <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                        <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span className="text-sm flex-1 truncate">{file.name}</span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                          onClick={() => {
                                            setBailProfessionnelOrdreFiles(prev => prev.filter((_, i) => i !== index));
                                            toast.success('Fichier supprimé');
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Conditions financières */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">💶 Conditions financières</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Loyer mensuel HT (€) *</Label>
                        <Input 
                          type="number"
                          value={bailCommercialData.loyerMensuelHT} 
                          onChange={(e) => setBailCommercialData({...bailCommercialData, loyerMensuelHT: e.target.value})} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Charges mensuelles (€) *</Label>
                        <Input 
                          type="number"
                          value={bailCommercialData.chargesMensuelles} 
                          onChange={(e) => setBailCommercialData({...bailCommercialData, chargesMensuelles: e.target.value})} 
                        />
                      </div>

                      {/* 2. Clause de révision du loyer */}
                      <div className="space-y-2 md:col-span-2 mt-4">
                        <h4 className="font-medium">Révision du loyer</h4>
                      </div>
                      
                      {bailCommercialData.typeBail === "commercial" ? (
                        <>
                          <div className="space-y-2">
                            <Label>Indice applicable *</Label>
                            <Select 
                              value={bailCommercialData.indiceApplicable} 
                              onValueChange={(value) => setBailCommercialData({...bailCommercialData, indiceApplicable: value})}
                            >
                              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ILC">ILC (Indice des Loyers Commerciaux)</SelectItem>
                                <SelectItem value="ILAT">ILAT (Indice des Loyers des Activités Tertiaires)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Base de calcul de l'indice</Label>
                            <Input 
                              value={bailCommercialData.baseCalculIndice} 
                              onChange={(e) => setBailCommercialData({...bailCommercialData, baseCalculIndice: e.target.value})} 
                              placeholder="Ex: Indice du 1er trimestre 2025"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Modalité de révision *</Label>
                            <Select 
                              value={bailCommercialData.modaliteRevision} 
                              onValueChange={(value) => setBailCommercialData({...bailCommercialData, modaliteRevision: value})}
                            >
                              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="annuelle">Annuelle</SelectItem>
                                <SelectItem value="triennale">Triennale</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* PROFESSIONNEL - Révision via IRL uniquement */}
                          <div className="space-y-2 md:col-span-2">
                            <p className="text-sm text-muted-foreground">
                              Pour un bail professionnel : révision annuelle via IRL (Indice de Référence des Loyers)
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label>Base de calcul de l'indice IRL</Label>
                            <Input 
                              value={bailCommercialData.baseCalculIndice} 
                              onChange={(e) => setBailCommercialData({...bailCommercialData, baseCalculIndice: e.target.value})} 
                              placeholder="Ex: IRL du 1er trimestre 2025"
                            />
                          </div>
                        </>
                      )}

                      {/* 7. Charges récupérables */}
                      <div className="space-y-2">
                        <Label>Mode de règlement des charges *</Label>
                        <Select 
                          value={bailCommercialData.modeReglementCharges} 
                          onValueChange={(value) => setBailCommercialData({...bailCommercialData, modeReglementCharges: value})}
                        >
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="forfait">Forfait</SelectItem>
                            <SelectItem value="provision">Provision avec régularisation</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 3. Dépôt de garantie */}
                      <div className="space-y-2 md:col-span-2 mt-4">
                        <h4 className="font-medium">Dépôt de garantie</h4>
                      </div>
                      <div className="space-y-2">
                        <Label>Montant du dépôt de garantie (€)</Label>
                        <Input 
                          type="number"
                          value={bailCommercialData.montantDepotGarantie} 
                          onChange={(e) => setBailCommercialData({...bailCommercialData, montantDepotGarantie: e.target.value})} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Modalités de restitution</Label>
                        <Input 
                          value={bailCommercialData.restitutionDepot} 
                          onChange={(e) => setBailCommercialData({...bailCommercialData, restitutionDepot: e.target.value})} 
                          placeholder="Ex: Dans les 30 jours suivant la restitution des lieux"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Durée */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">📅 Durée du bail</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {bailCommercialData.typeBail === "commercial" ? (
                        <div className="space-y-2">
                          <Label>Type de bail *</Label>
                          <Select 
                            value={bailCommercialData.dureeBail} 
                            onValueChange={(value) => setBailCommercialData({...bailCommercialData, dureeBail: value})}
                          >
                            <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="3-6-9">Bail commercial 3/6/9</SelectItem>
                              <SelectItem value="derogatoire">Bail dérogatoire (≤ 3 ans)</SelectItem>
                              <SelectItem value="saisonnier">Bail saisonnier</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="space-y-2 md:col-span-2">
                          <Label>Durée du bail professionnel</Label>
                          <p className="text-sm text-muted-foreground">Durée minimum de 6 ans avec possibilité de résiliation triennale</p>
                          <Input 
                            type="number"
                            value={bailCommercialData.dureeBail || "6"} 
                            onChange={(e) => setBailCommercialData({...bailCommercialData, dureeBail: e.target.value})}
                            placeholder="6"
                            min="6"
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>Date de prise d'effet *</Label>
                        <Input 
                          type="date"
                          value={bailCommercialData.datePriseEffet} 
                          onChange={(e) => setBailCommercialData({...bailCommercialData, datePriseEffet: e.target.value})} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. Travaux et réparations (COMMERCIAL UNIQUEMENT) */}
                  {bailCommercialData.typeBail === "commercial" && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg border-b pb-2">🔧 Travaux et réparations</h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label>Travaux à la charge du bailleur</Label>
                          <Textarea 
                            value={bailCommercialData.travauxChargeBailleur} 
                            onChange={(e) => setBailCommercialData({...bailCommercialData, travauxChargeBailleur: e.target.value})} 
                            placeholder="Ex: Gros œuvre, ravalement, toiture, structure..."
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Travaux à la charge du preneur</Label>
                          <Textarea 
                            value={bailCommercialData.travauxChargePreneur} 
                            onChange={(e) => setBailCommercialData({...bailCommercialData, travauxChargePreneur: e.target.value})} 
                            placeholder="Ex: Entretien courant, réparations locatives, aménagements intérieurs..."
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Charges supportées par le bailleur</Label>
                          <Textarea 
                            value={bailCommercialData.chargesSupporteesBailleur} 
                            onChange={(e) => setBailCommercialData({...bailCommercialData, chargesSupporteesBailleur: e.target.value})} 
                            placeholder="Ex: Taxe foncière, gros entretien..."
                            rows={2}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Charges supportées par le preneur</Label>
                          <Textarea 
                            value={bailCommercialData.chargesSupporteesPreneur} 
                            onChange={(e) => setBailCommercialData({...bailCommercialData, chargesSupporteesPreneur: e.target.value})} 
                            placeholder="Ex: Eau, électricité, chauffage, taxe ordures ménagères..."
                            rows={2}
                        />
                      </div>
                    </div>
                  </div>
                  )}

                  {/* 5. Impôts et taxes (COMMERCIAL UNIQUEMENT) */}
                  {bailCommercialData.typeBail === "commercial" && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg border-b pb-2">💰 Impôts et taxes</h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label>Taxe foncière supportée par *</Label>
                          <Select 
                            value={bailCommercialData.taxeFonciereSupporteePar} 
                            onValueChange={(value) => setBailCommercialData({...bailCommercialData, taxeFonciereSupporteePar: value})}
                          >
                            <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bailleur">Bailleur</SelectItem>
                              <SelectItem value="locataire">Locataire</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Taxes et contributions récupérables</Label>
                          <Textarea 
                            value={bailCommercialData.taxesRecuperables} 
                            onChange={(e) => setBailCommercialData({...bailCommercialData, taxesRecuperables: e.target.value})} 
                            placeholder="Ex: TEOM, CFE..."
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 6. État des lieux */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">📋 État des lieux</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label>État des lieux d'entrée réalisé ? *</Label>
                        <Select 
                          value={bailCommercialData.etatLieuxRealise} 
                          onValueChange={(value) => setBailCommercialData({...bailCommercialData, etatLieuxRealise: value})}
                        >
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="oui">Oui</SelectItem>
                            <SelectItem value="non">Non</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {bailCommercialData.etatLieuxRealise === "oui" && (
                        <div className="space-y-2">
                          <Label>📎 État des lieux (PDF)</Label>
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                            <input
                              type="file"
                              accept="application/pdf"
                              multiple
                              className="hidden"
                              id="bail-commercial-etat-lieux-upload"
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length > 0) {
                                  setBailCommercialEtatLieuxFiles(files);
                                  toast.success(`${files.length} fichier(s) ajouté(s)`);
                                }
                                e.target.value = '';
                              }}
                            />
                            <label htmlFor="bail-commercial-etat-lieux-upload" className="cursor-pointer flex items-center gap-3">
                              <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">Joindre l'état des lieux</p>
                                <p className="text-xs text-muted-foreground">PDF uniquement</p>
                              </div>
                            </label>
                          </div>
                          {bailCommercialEtatLieuxFiles.length > 0 && (
                            <div className="space-y-2 mt-2">
                              {bailCommercialEtatLieuxFiles.map((file, index) => (
                                <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                  <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="text-sm flex-1 truncate">{file.name}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                      setBailCommercialEtatLieuxFiles(prev => prev.filter((_, i) => i !== index));
                                      toast.success('Fichier supprimé');
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 8. Sous-location & cession (COMMERCIAL UNIQUEMENT) */}
                  {bailCommercialData.typeBail === "commercial" && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg border-b pb-2">📄 Sous-location & Cession</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Sous-location autorisée ? *</Label>
                          <Select 
                            value={bailCommercialData.souslocationAutorisee} 
                            onValueChange={(value) => setBailCommercialData({...bailCommercialData, souslocationAutorisee: value})}
                          >
                            <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="oui">Oui</SelectItem>
                              <SelectItem value="non">Non</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {bailCommercialData.souslocationAutorisee === "oui" && (
                          <div className="space-y-2">
                            <Label>Conditions de sous-location</Label>
                            <Input 
                              value={bailCommercialData.souslocationConditions} 
                              onChange={(e) => setBailCommercialData({...bailCommercialData, souslocationConditions: e.target.value})} 
                              placeholder="Ex: Avec accord préalable du bailleur"
                            />
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label>Cession du bail autorisée ? *</Label>
                          <Select 
                            value={bailCommercialData.cessionBailAutorisee} 
                            onValueChange={(value) => setBailCommercialData({...bailCommercialData, cessionBailAutorisee: value})}
                          >
                            <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="oui">Oui</SelectItem>
                              <SelectItem value="non">Non</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {bailCommercialData.cessionBailAutorisee === "oui" && (
                          <div className="space-y-2">
                            <Label>Conditions de cession</Label>
                            <Input 
                              value={bailCommercialData.cessionConditions} 
                              onChange={(e) => setBailCommercialData({...bailCommercialData, cessionConditions: e.target.value})} 
                              placeholder="Ex: Agrément du bailleur requis"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 9. Garanties */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">🛡️ Garanties</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label>Caution personnelle ? *</Label>
                        <Select 
                          value={bailCommercialData.cautionPersonnelleOuiNon} 
                          onValueChange={(value) => setBailCommercialData({...bailCommercialData, cautionPersonnelleOuiNon: value})}
                        >
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="oui">Oui</SelectItem>
                            <SelectItem value="non">Non</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {bailCommercialData.cautionPersonnelleOuiNon === "oui" && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Nom de la caution *</Label>
                              <Input 
                                value={bailCommercialData.nomCaution} 
                                onChange={(e) => setBailCommercialData({...bailCommercialData, nomCaution: e.target.value})} 
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Prénom de la caution *</Label>
                              <Input 
                                value={bailCommercialData.prenomCaution} 
                                onChange={(e) => setBailCommercialData({...bailCommercialData, prenomCaution: e.target.value})} 
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Montant garanti (€)</Label>
                            <Input 
                              type="number"
                              value={bailCommercialData.montantGaranti} 
                              onChange={(e) => setBailCommercialData({...bailCommercialData, montantGaranti: e.target.value})} 
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>📎 Pièce d'identité de la caution</Label>
                            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                              <input
                                type="file"
                                accept="application/pdf,image/*"
                                multiple
                                className="hidden"
                                id="bail-commercial-caution-id-upload"
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || []);
                                  if (files.length > 0) {
                                    setBailCommercialCautionIdFiles(files);
                                    toast.success(`${files.length} fichier(s) ajouté(s)`);
                                  }
                                  e.target.value = '';
                                }}
                              />
                              <label htmlFor="bail-commercial-caution-id-upload" className="cursor-pointer flex items-center gap-3">
                                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">Joindre la pièce d'identité</p>
                                  <p className="text-xs text-muted-foreground">PDF ou images</p>
                                </div>
                              </label>
                            </div>
                            {bailCommercialCautionIdFiles.length > 0 && (
                              <div className="space-y-2 mt-2">
                                {bailCommercialCautionIdFiles.map((file, index) => (
                                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                    <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="text-sm flex-1 truncate">{file.name}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => {
                                        setBailCommercialCautionIdFiles(prev => prev.filter((_, i) => i !== index));
                                        toast.success('Fichier supprimé');
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 10. Assurance obligatoire */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">🏥 Assurance obligatoire</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {bailCommercialData.typeBail === "commercial" ? (
                        <>
                          {/* COMMERCIAL - Assurance multirisque professionnelle */}
                          <div className="space-y-2">
                            <Label>Assurance multirisque professionnelle souscrite ? *</Label>
                            <Select 
                              value={bailCommercialData.assuranceMultirisqueSouscrite} 
                              onValueChange={(value) => setBailCommercialData({...bailCommercialData, assuranceMultirisqueSouscrite: value})}
                            >
                              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="oui">Oui</SelectItem>
                                <SelectItem value="non">Non (à souscrire avant entrée)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {bailCommercialData.assuranceMultirisqueSouscrite === "oui" && (
                            <>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Nom de l'assureur</Label>
                                  <Input 
                                    value={bailCommercialData.nomAssureur} 
                                    onChange={(e) => setBailCommercialData({...bailCommercialData, nomAssureur: e.target.value})} 
                                    placeholder="Ex: AXA, Allianz..."
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Numéro de police</Label>
                                  <Input 
                                    value={bailCommercialData.numeropolice} 
                                    onChange={(e) => setBailCommercialData({...bailCommercialData, numeropolice: e.target.value})} 
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>📎 Attestation d'assurance</Label>
                                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                                  <input
                                    type="file"
                                    accept="application/pdf"
                                    multiple
                                    className="hidden"
                                    id="bail-commercial-assurance-upload"
                                    onChange={(e) => {
                                      const files = Array.from(e.target.files || []);
                                      if (files.length > 0) {
                                        setBailCommercialAssuranceFiles(files);
                                        toast.success(`${files.length} fichier(s) ajouté(s)`);
                                      }
                                      e.target.value = '';
                                    }}
                                  />
                                  <label htmlFor="bail-commercial-assurance-upload" className="cursor-pointer flex items-center gap-3">
                                    <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                      <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">Joindre l'attestation d'assurance</p>
                                      <p className="text-xs text-muted-foreground">PDF uniquement</p>
                                    </div>
                                  </label>
                                </div>
                                {bailCommercialAssuranceFiles.length > 0 && (
                                  <div className="space-y-2 mt-2">
                                    {bailCommercialAssuranceFiles.map((file, index) => (
                                      <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                        <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span className="text-sm flex-1 truncate">{file.name}</span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                          onClick={() => {
                                            setBailCommercialAssuranceFiles(prev => prev.filter((_, i) => i !== index));
                                            toast.success('Fichier supprimé');
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          {/* PROFESSIONNEL - RC Pro + Assurance locaux */}
                          <div className="space-y-2 md:col-span-2">
                            <p className="text-sm text-muted-foreground">
                              Pour un bail professionnel : obligation d'assurer la RC professionnelle et les locaux
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label>Assurance RC Professionnelle souscrite ? *</Label>
                            <Select 
                              value={bailCommercialData.assuranceRCPro} 
                              onValueChange={(value) => setBailCommercialData({...bailCommercialData, assuranceRCPro: value})}
                            >
                              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="oui">Oui</SelectItem>
                                <SelectItem value="non">Non (à souscrire avant entrée)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Assurance des locaux souscrite ? *</Label>
                            <Select 
                              value={bailCommercialData.assuranceLocaux} 
                              onValueChange={(value) => setBailCommercialData({...bailCommercialData, assuranceLocaux: value})}
                            >
                              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="oui">Oui</SelectItem>
                                <SelectItem value="non">Non (à souscrire avant entrée)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {(bailCommercialData.assuranceRCPro === "oui" || bailCommercialData.assuranceLocaux === "oui") && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
                              <div className="space-y-2">
                                <Label>Nom de l'assureur</Label>
                                <Input 
                                  value={bailCommercialData.nomAssureur} 
                                  onChange={(e) => setBailCommercialData({...bailCommercialData, nomAssureur: e.target.value})} 
                                  placeholder="Ex: AXA, Allianz..."
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Numéro de police</Label>
                                <Input 
                                  value={bailCommercialData.numeropolice} 
                                  onChange={(e) => setBailCommercialData({...bailCommercialData, numeropolice: e.target.value})} 
                                />
                              </div>
                            </div>
                          )}

                          {(bailCommercialData.assuranceRCPro === "oui" || bailCommercialData.assuranceLocaux === "oui") && (
                            <div className="space-y-2 md:col-span-2">
                              <Label>📎 Attestations d'assurance</Label>
                              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                                <input
                                  type="file"
                                  accept="application/pdf"
                                  multiple
                                  className="hidden"
                                  id="bail-professionnel-assurance-upload"
                                  onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    if (files.length > 0) {
                                      setBailCommercialAssuranceFiles(files);
                                      toast.success(`${files.length} fichier(s) ajouté(s)`);
                                    }
                                    e.target.value = '';
                                  }}
                                />
                                <label htmlFor="bail-professionnel-assurance-upload" className="cursor-pointer flex items-center gap-3">
                                  <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">Joindre les attestations (RC Pro et/ou Locaux)</p>
                                    <p className="text-xs text-muted-foreground">PDF uniquement</p>
                                  </div>
                                </label>
                              </div>
                              {bailCommercialAssuranceFiles.length > 0 && (
                                <div className="space-y-2 mt-2">
                                  {bailCommercialAssuranceFiles.map((file, index) => (
                                    <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                      <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      <span className="text-sm flex-1 truncate">{file.name}</span>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => {
                                          setBailCommercialAssuranceFiles(prev => prev.filter((_, i) => i !== index));
                                          toast.success('Fichier supprimé');
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Formulaire spécifique pour Convention d'indivision */}
            {pendingContractType === "Convention d'indivision" && (
              <>
                <div className="space-y-6 max-h-[60vh] overflow-y-auto px-1">
                  {/* 1. Informations générales */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">📋 Informations générales sur l'indivision</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Type de bien *</Label>
                        <Select 
                          value={indivisionData.typeBien} 
                          onValueChange={(value) => setIndivisionData({...indivisionData, typeBien: value})}
                        >
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="immobilier">Immobilier</SelectItem>
                            <SelectItem value="mobilier">Mobilier</SelectItem>
                            <SelectItem value="autre">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {indivisionData.typeBien === "autre" && (
                        <div className="space-y-2">
                          <Label>Préciser le type de bien</Label>
                          <Input 
                            value={indivisionData.typeBienAutre} 
                            onChange={(e) => setIndivisionData({...indivisionData, typeBienAutre: e.target.value})} 
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>Origine de l'indivision *</Label>
                        <Select 
                          value={indivisionData.origineIndivision} 
                          onValueChange={(value) => setIndivisionData({...indivisionData, origineIndivision: value})}
                        >
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="succession">Succession</SelectItem>
                            <SelectItem value="achat_commun">Achat en commun</SelectItem>
                            <SelectItem value="investissement">Investissement commun</SelectItem>
                            <SelectItem value="donation">Donation</SelectItem>
                            <SelectItem value="autre">Autre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {indivisionData.origineIndivision === "autre" && (
                        <div className="space-y-2">
                          <Label>Préciser l'origine</Label>
                          <Input 
                            value={indivisionData.origineIndivisionAutre} 
                            onChange={(e) => setIndivisionData({...indivisionData, origineIndivisionAutre: e.target.value})} 
                          />
                        </div>
                      )}
                      <div className="space-y-2 md:col-span-2">
                        <Label>Objet de la convention</Label>
                        <Textarea 
                          value={indivisionData.objetConvention} 
                          onChange={(e) => setIndivisionData({...indivisionData, objetConvention: e.target.value})} 
                          placeholder="Ex: Gestion du bien, répartition des droits, désignation d'un gérant..."
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Indivisaires */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg border-b pb-2 flex-1">👥 Indivisaires</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-300"
                        onClick={() => {
                          const newId = Math.max(...indivisionData.indivisaires.map(i => i.id), 0) + 1;
                          setIndivisionData({
                            ...indivisionData,
                            indivisaires: [...indivisionData.indivisaires, {
                              id: newId,
                              isClient: false,
                              clientId: "",
                              nom: "",
                              prenom: "",
                              adresse: "",
                              dateNaissance: "",
                              lieuNaissance: "",
                              nationalite: "",
                              profession: "",
                              statutMatrimonial: "",
                              regimeMatrimonial: "",
                              typeIdentite: "",
                              numeroIdentite: "",
                              email: "",
                              telephone: "",
                              quotePart: "",
                              origineQuotePart: "",
                              origineQuotePartAutre: "",
                            }]
                          });
                        }}
                      >
                        + Ajouter un indivisaire
                      </Button>
                    </div>

                    {indivisionData.indivisaires.map((indivisaire, index) => (
                      <div key={indivisaire.id} className="border rounded-lg p-4 space-y-4 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Indivisaire {index + 1}</h4>
                          {indivisionData.indivisaires.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setIndivisionData({
                                  ...indivisionData,
                                  indivisaires: indivisionData.indivisaires.filter(i => i.id !== indivisaire.id)
                                });
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Client ou non */}
                          <div className="space-y-2 md:col-span-2">
                            <Label>Cet indivisaire est-il votre client ? *</Label>
                            <RadioGroup
                              value={indivisaire.isClient ? "oui" : "non"}
                              onValueChange={(value) => {
                                const newIndivisaires = [...indivisionData.indivisaires];
                                const idx = newIndivisaires.findIndex(i => i.id === indivisaire.id);
                                newIndivisaires[idx] = {
                                  ...newIndivisaires[idx],
                                  isClient: value === "oui",
                                  clientId: value === "oui" ? newIndivisaires[idx].clientId : "",
                                };
                                setIndivisionData({...indivisionData, indivisaires: newIndivisaires});
                              }}
                            >
                              <div className="flex gap-4">
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="oui" id={`indiv_${indivisaire.id}_client_oui`} />
                                  <Label htmlFor={`indiv_${indivisaire.id}_client_oui`} className="cursor-pointer">Oui (client)</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="non" id={`indiv_${indivisaire.id}_client_non`} />
                                  <Label htmlFor={`indiv_${indivisaire.id}_client_non`} className="cursor-pointer">Non (autre partie)</Label>
                                </div>
                              </div>
                            </RadioGroup>
                          </div>

                          {/* Si c'est un client */}
                          {indivisaire.isClient ? (
                            <>
                              <div className="space-y-2 md:col-span-2">
                                <Label>Sélectionner le client *</Label>
                                <Select
                                  value={indivisaire.clientId}
                                  onValueChange={async (value) => {
                                    const selectedClient = clients.find(c => c.id === value);
                                    const newIndivisaires = [...indivisionData.indivisaires];
                                    const idx = newIndivisaires.findIndex(i => i.id === indivisaire.id);
                                    if (selectedClient) {
                                      newIndivisaires[idx] = {
                                        ...newIndivisaires[idx],
                                        clientId: value,
                                        nom: selectedClient.nom || "",
                                        prenom: selectedClient.prenom || "",
                                        adresse: selectedClient.adresse || "",
                                        dateNaissance: selectedClient.date_naissance || "",
                                        lieuNaissance: selectedClient.lieu_naissance || "",
                                        nationalite: selectedClient.nationalite || "",
                                        profession: selectedClient.profession || "",
                                        statutMatrimonial: selectedClient.statut_matrimonial || "",
                                        regimeMatrimonial: selectedClient.regime_matrimonial || "",
                                        typeIdentite: selectedClient.type_identite || "",
                                        numeroIdentite: selectedClient.numero_identite || "",
                                        email: selectedClient.email || "",
                                        telephone: selectedClient.telephone || "",
                                      };
                                      
                                      // Charger automatiquement la carte d'identité depuis Supabase storage
                                      if (selectedClient.identite_url) {
                                        try {
                                          const { data, error } = await supabase.storage
                                            .from('documents')
                                            .download(selectedClient.identite_url);
                                          
                                          if (data && !error) {
                                            const fileName = selectedClient.identite_url.split('/').pop() || 'identite.pdf';
                                            const file = new File([data], fileName, { type: data.type });
                                            setIndivisairesIdentiteFiles(prev => ({
                                              ...prev,
                                              [indivisaire.id]: [file]
                                            }));
                                            setIndivisairesIdentiteUrls(prev => ({
                                              ...prev,
                                              [indivisaire.id]: [selectedClient.identite_url]
                                            }));
                                          }
                                        } catch (error) {
                                          console.error('Erreur chargement carte identité:', error);
                                        }
                                      }
                                    }
                                    setIndivisionData({...indivisionData, indivisaires: newIndivisaires});
                                  }}
                                >
                                  <SelectTrigger><SelectValue placeholder="Choisir un client..." /></SelectTrigger>
                                  <SelectContent>
                                    {clients.map((client) => (
                                      <SelectItem key={client.id} value={client.id}>
                                        {client.nom} {client.prenom}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Affichage des infos du client */}
                              {indivisaire.clientId && (
                                <div className="md:col-span-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                  <p className="text-sm font-medium text-green-800">✓ Informations chargées depuis la fiche client</p>
                                  <p className="text-sm text-green-700 mt-1">{indivisaire.nom} {indivisaire.prenom} - {indivisaire.adresse}</p>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              {/* Saisie manuelle pour non-client */}
                              <div className="space-y-2">
                                <Label>Nom *</Label>
                                <Input
                                  value={indivisaire.nom}
                                  onChange={(e) => {
                                    const newIndivisaires = [...indivisionData.indivisaires];
                                    const idx = newIndivisaires.findIndex(i => i.id === indivisaire.id);
                                    newIndivisaires[idx] = {...newIndivisaires[idx], nom: e.target.value};
                                    setIndivisionData({...indivisionData, indivisaires: newIndivisaires});
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Prénom *</Label>
                                <Input
                                  value={indivisaire.prenom}
                                  onChange={(e) => {
                                    const newIndivisaires = [...indivisionData.indivisaires];
                                    const idx = newIndivisaires.findIndex(i => i.id === indivisaire.id);
                                    newIndivisaires[idx] = {...newIndivisaires[idx], prenom: e.target.value};
                                    setIndivisionData({...indivisionData, indivisaires: newIndivisaires});
                                  }}
                                />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <Label>Adresse *</Label>
                                <Input
                                  value={indivisaire.adresse}
                                  onChange={(e) => {
                                    const newIndivisaires = [...indivisionData.indivisaires];
                                    const idx = newIndivisaires.findIndex(i => i.id === indivisaire.id);
                                    newIndivisaires[idx] = {...newIndivisaires[idx], adresse: e.target.value};
                                    setIndivisionData({...indivisionData, indivisaires: newIndivisaires});
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Date de naissance</Label>
                                <Input
                                  type="date"
                                  value={indivisaire.dateNaissance}
                                  onChange={(e) => {
                                    const newIndivisaires = [...indivisionData.indivisaires];
                                    const idx = newIndivisaires.findIndex(i => i.id === indivisaire.id);
                                    newIndivisaires[idx] = {...newIndivisaires[idx], dateNaissance: e.target.value};
                                    setIndivisionData({...indivisionData, indivisaires: newIndivisaires});
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Lieu de naissance</Label>
                                <Input
                                  value={indivisaire.lieuNaissance}
                                  onChange={(e) => {
                                    const newIndivisaires = [...indivisionData.indivisaires];
                                    const idx = newIndivisaires.findIndex(i => i.id === indivisaire.id);
                                    newIndivisaires[idx] = {...newIndivisaires[idx], lieuNaissance: e.target.value};
                                    setIndivisionData({...indivisionData, indivisaires: newIndivisaires});
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Nationalité</Label>
                                <Input
                                  value={indivisaire.nationalite}
                                  onChange={(e) => {
                                    const newIndivisaires = [...indivisionData.indivisaires];
                                    const idx = newIndivisaires.findIndex(i => i.id === indivisaire.id);
                                    newIndivisaires[idx] = {...newIndivisaires[idx], nationalite: e.target.value};
                                    setIndivisionData({...indivisionData, indivisaires: newIndivisaires});
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Profession</Label>
                                <Input
                                  value={indivisaire.profession}
                                  onChange={(e) => {
                                    const newIndivisaires = [...indivisionData.indivisaires];
                                    const idx = newIndivisaires.findIndex(i => i.id === indivisaire.id);
                                    newIndivisaires[idx] = {...newIndivisaires[idx], profession: e.target.value};
                                    setIndivisionData({...indivisionData, indivisaires: newIndivisaires});
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                  type="email"
                                  value={indivisaire.email}
                                  onChange={(e) => {
                                    const newIndivisaires = [...indivisionData.indivisaires];
                                    const idx = newIndivisaires.findIndex(i => i.id === indivisaire.id);
                                    newIndivisaires[idx] = {...newIndivisaires[idx], email: e.target.value};
                                    setIndivisionData({...indivisionData, indivisaires: newIndivisaires});
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Téléphone</Label>
                                <Input
                                  value={indivisaire.telephone}
                                  onChange={(e) => {
                                    const newIndivisaires = [...indivisionData.indivisaires];
                                    const idx = newIndivisaires.findIndex(i => i.id === indivisaire.id);
                                    newIndivisaires[idx] = {...newIndivisaires[idx], telephone: e.target.value};
                                    setIndivisionData({...indivisionData, indivisaires: newIndivisaires});
                                  }}
                                />
                              </div>
                            </>
                          )}

                          {/* Statut matrimonial */}
                          <div className="space-y-2">
                            <Label>Statut matrimonial</Label>
                            {indivisaire.isClient ? (
                              <Input
                                value={indivisaire.statutMatrimonial}
                                readOnly
                                className="bg-muted cursor-not-allowed"
                              />
                            ) : (
                              <Select
                                value={indivisaire.statutMatrimonial}
                                onValueChange={(value) => {
                                  const newIndivisaires = [...indivisionData.indivisaires];
                                  const idx = newIndivisaires.findIndex(i => i.id === indivisaire.id);
                                  newIndivisaires[idx] = {...newIndivisaires[idx], statutMatrimonial: value};
                                  setIndivisionData({...indivisionData, indivisaires: newIndivisaires});
                                }}
                              >
                                <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="celibataire">Célibataire</SelectItem>
                                  <SelectItem value="marie">Marié(e)</SelectItem>
                                  <SelectItem value="pacse">Pacsé(e)</SelectItem>
                                  <SelectItem value="divorce">Divorcé(e)</SelectItem>
                                  <SelectItem value="veuf">Veuf/Veuve</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>

                          {indivisaire.statutMatrimonial === "marie" && (
                            <div className="space-y-2">
                              <Label>Régime matrimonial</Label>
                              {indivisaire.isClient ? (
                                <Input
                                  value={indivisaire.regimeMatrimonial}
                                  readOnly
                                  className="bg-muted cursor-not-allowed"
                                />
                              ) : (
                                <Select
                                  value={indivisaire.regimeMatrimonial}
                                  onValueChange={(value) => {
                                    const newIndivisaires = [...indivisionData.indivisaires];
                                    const idx = newIndivisaires.findIndex(i => i.id === indivisaire.id);
                                    newIndivisaires[idx] = {...newIndivisaires[idx], regimeMatrimonial: value};
                                    setIndivisionData({...indivisionData, indivisaires: newIndivisaires});
                                  }}
                                >
                                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="communaute">Communauté</SelectItem>
                                    <SelectItem value="separation">Séparation de biens</SelectItem>
                                    <SelectItem value="participation">Participation aux acquêts</SelectItem>
                                    <SelectItem value="autre">Autre</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          )}

                          {/* Quote-part */}
                          <div className="space-y-2">
                            <Label>Quote-part (%) *</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={indivisaire.quotePart}
                              onChange={(e) => {
                                const newIndivisaires = [...indivisionData.indivisaires];
                                const idx = newIndivisaires.findIndex(i => i.id === indivisaire.id);
                                newIndivisaires[idx] = {...newIndivisaires[idx], quotePart: e.target.value};
                                setIndivisionData({...indivisionData, indivisaires: newIndivisaires});
                              }}
                              placeholder="Ex: 50"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Origine de la quote-part</Label>
                            <Select
                              value={indivisaire.origineQuotePart}
                              onValueChange={(value) => {
                                const newIndivisaires = [...indivisionData.indivisaires];
                                const idx = newIndivisaires.findIndex(i => i.id === indivisaire.id);
                                newIndivisaires[idx] = {...newIndivisaires[idx], origineQuotePart: value};
                                setIndivisionData({...indivisionData, indivisaires: newIndivisaires});
                              }}
                            >
                              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="heritage">Héritage</SelectItem>
                                <SelectItem value="achat">Achat</SelectItem>
                                <SelectItem value="donation">Donation</SelectItem>
                                <SelectItem value="succession">Succession</SelectItem>
                                <SelectItem value="investissement">Investissement</SelectItem>
                                <SelectItem value="autre">Autre</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {indivisaire.origineQuotePart === "autre" && (
                            <div className="space-y-2">
                              <Label>Préciser l'origine</Label>
                              <Input
                                value={indivisaire.origineQuotePartAutre || ""}
                                onChange={(e) => {
                                  const newIndivisaires = [...indivisionData.indivisaires];
                                  const idx = newIndivisaires.findIndex(i => i.id === indivisaire.id);
                                  newIndivisaires[idx] = {...newIndivisaires[idx], origineQuotePartAutre: e.target.value};
                                  setIndivisionData({...indivisionData, indivisaires: newIndivisaires});
                                }}
                                placeholder="Ex: Partage amiable..."
                              />
                            </div>
                          )}

                          {/* Upload pièces jointes pour cet indivisaire */}
                          {!indivisaire.isClient && (
                            <div className="space-y-2 md:col-span-2">
                              <Label>📎 Pièce d'identité</Label>
                              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                                <input
                                  type="file"
                                  accept="application/pdf,image/*"
                                  multiple
                                  className="hidden"
                                  id={`indiv_${indivisaire.id}_id_upload`}
                                  onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    if (files.length > 0) {
                                      setIndivisairesIdentiteFiles(prev => ({...prev, [indivisaire.id]: files}));
                                      toast.success(`${files.length} fichier(s) ajouté(s)`);
                                    }
                                    e.target.value = '';
                                  }}
                                />
                                <label htmlFor={`indiv_${indivisaire.id}_id_upload`} className="cursor-pointer flex items-center gap-3">
                                  <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">Joindre la pièce d'identité</p>
                                    <p className="text-xs text-muted-foreground">PDF ou images</p>
                                  </div>
                                </label>
                              </div>
                              {indivisairesIdentiteFiles[indivisaire.id]?.length > 0 && (
                              <div className="space-y-2 mt-2">
                                {indivisairesIdentiteFiles[indivisaire.id].map((file, idx) => (
                                  <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                    <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="text-sm flex-1 truncate">{file.name}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => {
                                        setIndivisairesIdentiteFiles(prev => ({
                                          ...prev,
                                          [indivisaire.id]: prev[indivisaire.id].filter((_, i) => i !== idx)
                                        }));
                                        toast.success('Fichier supprimé');
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          )}

                          {/* Affichage de la carte d'identité chargée depuis le client */}
                          {indivisaire.isClient && indivisairesIdentiteFiles[indivisaire.id]?.length > 0 && (
                            <div className="space-y-2 md:col-span-2">
                              <Label>📎 Pièce d'identité (chargée depuis la fiche client)</Label>
                              <div className="space-y-2">
                                {indivisairesIdentiteFiles[indivisaire.id].map((file, idx) => (
                                  <div key={idx} className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                                    <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-sm flex-1 truncate text-green-800">{file.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Upload justificatif de domicile */}
                          <div className="space-y-2 md:col-span-2">
                            <Label>📎 Justificatif de domicile</Label>
                            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                              <input
                                type="file"
                                accept="application/pdf,image/*"
                                multiple
                                className="hidden"
                                id={`indiv_${indivisaire.id}_domicile_upload`}
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || []);
                                  if (files.length > 0) {
                                    setIndivisairesDomicileFiles(prev => ({...prev, [indivisaire.id]: files}));
                                    toast.success(`${files.length} fichier(s) ajouté(s)`);
                                  }
                                  e.target.value = '';
                                }}
                              />
                              <label htmlFor={`indiv_${indivisaire.id}_domicile_upload`} className="cursor-pointer flex items-center gap-3">
                                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">Joindre le justificatif de domicile</p>
                                  <p className="text-xs text-muted-foreground">Facture, quittance de loyer, etc.</p>
                                </div>
                              </label>
                            </div>
                            {indivisairesDomicileFiles[indivisaire.id]?.length > 0 && (
                              <div className="space-y-2 mt-2">
                                {indivisairesDomicileFiles[indivisaire.id].map((file, idx) => (
                                  <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                    <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="text-sm flex-1 truncate">{file.name}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => {
                                        setIndivisairesDomicileFiles(prev => ({
                                          ...prev,
                                          [indivisaire.id]: prev[indivisaire.id].filter((_, i) => i !== idx)
                                        }));
                                        toast.success('Fichier supprimé');
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Upload contrat de mariage si marié */}
                          {indivisaire.statutMatrimonial === "marie" && (
                            <div className="space-y-2 md:col-span-2">
                              <Label>📎 Contrat de mariage (si applicable)</Label>
                              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                                <input
                                  type="file"
                                  accept="application/pdf"
                                  multiple
                                  className="hidden"
                                  id={`indiv_${indivisaire.id}_contrat_mariage_upload`}
                                  onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    if (files.length > 0) {
                                      setIndivisairesContratMariageFiles(prev => ({...prev, [indivisaire.id]: files}));
                                      toast.success(`${files.length} fichier(s) ajouté(s)`);
                                    }
                                    e.target.value = '';
                                  }}
                                />
                                <label htmlFor={`indiv_${indivisaire.id}_contrat_mariage_upload`} className="cursor-pointer flex items-center gap-3">
                                  <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">Joindre le contrat de mariage</p>
                                    <p className="text-xs text-muted-foreground">PDF uniquement</p>
                                  </div>
                                </label>
                              </div>
                              {indivisairesContratMariageFiles[indivisaire.id]?.length > 0 && (
                                <div className="space-y-2 mt-2">
                                  {indivisairesContratMariageFiles[indivisaire.id].map((file, idx) => (
                                    <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                      <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      <span className="text-sm flex-1 truncate">{file.name}</span>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => {
                                          setIndivisairesContratMariageFiles(prev => ({
                                            ...prev,
                                            [indivisaire.id]: prev[indivisaire.id].filter((_, i) => i !== idx)
                                          }));
                                          toast.success('Fichier supprimé');
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Upload livret de famille si succession */}
                          {indivisionData.origine === "succession" && (
                            <div className="space-y-2 md:col-span-2">
                              <Label>📎 Livret de famille (si succession)</Label>
                              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                                <input
                                  type="file"
                                  accept="application/pdf,image/*"
                                  multiple
                                  className="hidden"
                                  id={`indiv_${indivisaire.id}_livret_famille_upload`}
                                  onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    if (files.length > 0) {
                                      setIndivisairesLivretFamilleFiles(prev => ({...prev, [indivisaire.id]: files}));
                                      toast.success(`${files.length} fichier(s) ajouté(s)`);
                                    }
                                    e.target.value = '';
                                  }}
                                />
                                <label htmlFor={`indiv_${indivisaire.id}_livret_famille_upload`} className="cursor-pointer flex items-center gap-3">
                                  <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">Joindre le livret de famille</p>
                                    <p className="text-xs text-muted-foreground">PDF ou images</p>
                                  </div>
                                </label>
                              </div>
                              {indivisairesLivretFamilleFiles[indivisaire.id]?.length > 0 && (
                                <div className="space-y-2 mt-2">
                                  {indivisairesLivretFamilleFiles[indivisaire.id].map((file, idx) => (
                                    <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                      <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      <span className="text-sm flex-1 truncate">{file.name}</span>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => {
                                          setIndivisairesLivretFamilleFiles(prev => ({
                                            ...prev,
                                            [indivisaire.id]: prev[indivisaire.id].filter((_, i) => i !== idx)
                                          }));
                                          toast.success('Fichier supprimé');
                                        }}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 3. Description du bien */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">🏠 Description du bien indivis</h3>
                    
                    {indivisionData.description.typeBien === "immobilier" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                          <Label>Adresse complète *</Label>
                          <Input
                            value={indivisionData.description.immobilier.adresse}
                            onChange={(e) => setIndivisionData({
                              ...indivisionData,
                              description: {
                                ...indivisionData.description,
                                immobilier: {...indivisionData.description.immobilier, adresse: e.target.value}
                              }
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Nature du bien *</Label>
                          <Select
                            value={indivisionData.description.immobilier.nature}
                            onValueChange={(value) => setIndivisionData({
                              ...indivisionData,
                              description: {
                                ...indivisionData.description,
                                immobilier: {...indivisionData.description.immobilier, nature: value}
                              }
                            })}
                          >
                            <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="maison">Maison</SelectItem>
                              <SelectItem value="appartement">Appartement</SelectItem>
                              <SelectItem value="terrain">Terrain</SelectItem>
                              <SelectItem value="immeuble">Immeuble</SelectItem>
                              <SelectItem value="local_commercial">Local commercial</SelectItem>
                              <SelectItem value="autre">Autre</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Surface (m²)</Label>
                          <Input
                            type="number"
                            value={indivisionData.description.immobilier.surface}
                            onChange={(e) => setIndivisionData({
                              ...indivisionData,
                              description: {
                                ...indivisionData.description,
                                immobilier: {...indivisionData.description.immobilier, surface: e.target.value}
                              }
                            })}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Description détaillée</Label>
                          <Textarea
                            rows={3}
                            value={indivisionData.description.immobilier.description}
                            onChange={(e) => setIndivisionData({
                              ...indivisionData,
                              description: {
                                ...indivisionData.description,
                                immobilier: {...indivisionData.description.immobilier, description: e.target.value}
                              }
                            })}
                            placeholder="Description du bien..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>État locatif</Label>
                          <Select
                            value={indivisionData.description.immobilier.etatLocatif}
                            onValueChange={(value) => setIndivisionData({
                              ...indivisionData,
                              description: {
                                ...indivisionData.description,
                                immobilier: {...indivisionData.description.immobilier, etatLocatif: value}
                              }
                            })}
                          >
                            <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="libre">Libre</SelectItem>
                              <SelectItem value="loue">Loué</SelectItem>
                              <SelectItem value="occupe">Occupé par un indivisaire</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {indivisionData.description.immobilier.etatLocatif === "loue" && (
                          <div className="space-y-2">
                            <Label>Loyer mensuel (€)</Label>
                            <Input
                              type="number"
                              value={indivisionData.description.immobilier.loyer}
                              onChange={(e) => setIndivisionData({
                                ...indivisionData,
                                description: {
                                  ...indivisionData.description,
                                  immobilier: {...indivisionData.description.immobilier, loyer: e.target.value}
                                }
                              })}
                            />
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label>Valeur vénale estimée (€)</Label>
                          <Input
                            type="number"
                            value={indivisionData.description.immobilier.valeurVenale}
                            onChange={(e) => setIndivisionData({
                              ...indivisionData,
                              description: {
                                ...indivisionData.description,
                                immobilier: {...indivisionData.description.immobilier, valeurVenale: e.target.value}
                              }
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Références cadastrales</Label>
                          <Input
                            value={indivisionData.description.immobilier.cadastre}
                            onChange={(e) => setIndivisionData({
                              ...indivisionData,
                              description: {
                                ...indivisionData.description,
                                immobilier: {...indivisionData.description.immobilier, cadastre: e.target.value}
                              }
                            })}
                            placeholder="Ex: Section AB n° 123"
                          />
                        </div>

                        {/* Uploads pour bien immobilier */}
                        <div className="space-y-2 md:col-span-2">
                          <Label>📎 Titre de propriété *</Label>
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                            <input
                              type="file"
                              accept="application/pdf"
                              multiple
                              className="hidden"
                              id="titre_propriete_upload"
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length > 0) {
                                  setIndivisionTitreProprietFiles(files);
                                  toast.success(`${files.length} fichier(s) ajouté(s)`);
                                }
                                e.target.value = '';
                              }}
                            />
                            <label htmlFor="titre_propriete_upload" className="cursor-pointer flex items-center gap-3">
                              <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">Joindre le titre de propriété</p>
                                <p className="text-xs text-muted-foreground">Acte notarié, attestation immobilière...</p>
                              </div>
                            </label>
                          </div>
                          {indivisionTitreProprietFiles.length > 0 && (
                            <div className="space-y-2 mt-2">
                              {indivisionTitreProprietFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                  <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="text-sm flex-1 truncate">{file.name}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                      setIndivisionTitreProprietFiles(indivisionTitreProprietFiles.filter((_, i) => i !== idx));
                                      toast.success('Fichier supprimé');
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label>📎 Évaluation du bien</Label>
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                            <input
                              type="file"
                              accept="application/pdf"
                              multiple
                              className="hidden"
                              id="evaluation_upload"
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length > 0) {
                                  setIndivisionEvaluationFiles(files);
                                  toast.success(`${files.length} fichier(s) ajouté(s)`);
                                }
                                e.target.value = '';
                              }}
                            />
                            <label htmlFor="evaluation_upload" className="cursor-pointer flex items-center gap-3">
                              <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">Joindre l'évaluation du bien</p>
                                <p className="text-xs text-muted-foreground">Rapport d'expert, estimation notariale...</p>
                              </div>
                            </label>
                          </div>
                          {indivisionEvaluationFiles.length > 0 && (
                            <div className="space-y-2 mt-2">
                              {indivisionEvaluationFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                  <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="text-sm flex-1 truncate">{file.name}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                      setIndivisionEvaluationFiles(indivisionEvaluationFiles.filter((_, i) => i !== idx));
                                      toast.success('Fichier supprimé');
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label>📎 Plan cadastral</Label>
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                            <input
                              type="file"
                              accept="application/pdf,image/*"
                              multiple
                              className="hidden"
                              id="cadastre_upload"
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length > 0) {
                                  setIndivisionCadastreFiles(files);
                                  toast.success(`${files.length} fichier(s) ajouté(s)`);
                                }
                                e.target.value = '';
                              }}
                            />
                            <label htmlFor="cadastre_upload" className="cursor-pointer flex items-center gap-3">
                              <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">Joindre le plan cadastral</p>
                                <p className="text-xs text-muted-foreground">PDF ou images</p>
                              </div>
                            </label>
                          </div>
                          {indivisionCadastreFiles.length > 0 && (
                            <div className="space-y-2 mt-2">
                              {indivisionCadastreFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                  <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="text-sm flex-1 truncate">{file.name}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                      setIndivisionCadastreFiles(indivisionCadastreFiles.filter((_, i) => i !== idx));
                                      toast.success('Fichier supprimé');
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label>📎 Diagnostics techniques</Label>
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                            <input
                              type="file"
                              accept="application/pdf"
                              multiple
                              className="hidden"
                              id="diagnostics_upload"
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length > 0) {
                                  setIndivisionDiagnosticsFiles(files);
                                  toast.success(`${files.length} fichier(s) ajouté(s)`);
                                }
                                e.target.value = '';
                              }}
                            />
                            <label htmlFor="diagnostics_upload" className="cursor-pointer flex items-center gap-3">
                              <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">Joindre les diagnostics</p>
                                <p className="text-xs text-muted-foreground">DPE, amiante, plomb, termites...</p>
                              </div>
                            </label>
                          </div>
                          {indivisionDiagnosticsFiles.length > 0 && (
                            <div className="space-y-2 mt-2">
                              {indivisionDiagnosticsFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                  <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="text-sm flex-1 truncate">{file.name}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                      setIndivisionDiagnosticsFiles(indivisionDiagnosticsFiles.filter((_, i) => i !== idx));
                                      toast.success('Fichier supprimé');
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {indivisionData.description.immobilier.etatLocatif === "loue" && (
                          <div className="space-y-2 md:col-span-2">
                            <Label>📎 Bail en cours</Label>
                            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                              <input
                                type="file"
                                accept="application/pdf"
                                multiple
                                className="hidden"
                                id="bail_upload"
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || []);
                                  if (files.length > 0) {
                                    setIndivisionBailFiles(files);
                                    toast.success(`${files.length} fichier(s) ajouté(s)`);
                                  }
                                  e.target.value = '';
                                }}
                              />
                              <label htmlFor="bail_upload" className="cursor-pointer flex items-center gap-3">
                                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">Joindre le bail</p>
                                  <p className="text-xs text-muted-foreground">PDF uniquement</p>
                                </div>
                              </label>
                            </div>
                            {indivisionBailFiles.length > 0 && (
                              <div className="space-y-2 mt-2">
                                {indivisionBailFiles.map((file, idx) => (
                                  <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                    <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="text-sm flex-1 truncate">{file.name}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => {
                                        setIndivisionBailFiles(indivisionBailFiles.filter((_, i) => i !== idx));
                                        toast.success('Fichier supprimé');
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {indivisionData.description.typeBien === "mobilier" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                          <Label>Description des biens mobiliers *</Label>
                          <Textarea
                            rows={4}
                            value={indivisionData.description.mobilier.description}
                            onChange={(e) => setIndivisionData({
                              ...indivisionData,
                              description: {
                                ...indivisionData.description,
                                mobilier: {...indivisionData.description.mobilier, description: e.target.value}
                              }
                            })}
                            placeholder="Description détaillée des biens mobiliers..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Valeur estimée (€)</Label>
                          <Input
                            type="number"
                            value={indivisionData.description.mobilier.valeurEstimee}
                            onChange={(e) => setIndivisionData({
                              ...indivisionData,
                              description: {
                                ...indivisionData.description,
                                mobilier: {...indivisionData.description.mobilier, valeurEstimee: e.target.value}
                              }
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Numéros de série / identifiants</Label>
                          <Input
                            value={indivisionData.description.mobilier.numerosIdentification}
                            onChange={(e) => setIndivisionData({
                              ...indivisionData,
                              description: {
                                ...indivisionData.description,
                                mobilier: {...indivisionData.description.mobilier, numerosIdentification: e.target.value}
                              }
                            })}
                            placeholder="Si applicable"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. Durée de la convention */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">⏱️ Durée de la convention</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label>Type de durée *</Label>
                        <RadioGroup
                          value={indivisionData.duree.type}
                          onValueChange={(value) => setIndivisionData({
                            ...indivisionData,
                            duree: {...indivisionData.duree, type: value}
                          })}
                        >
                          <div className="flex gap-4">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="indeterminee" id="duree_indeterminee" />
                              <Label htmlFor="duree_indeterminee" className="cursor-pointer">Indéterminée</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="determinee" id="duree_determinee" />
                              <Label htmlFor="duree_determinee" className="cursor-pointer">Déterminée (max 5 ans)</Label>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>

                      {indivisionData.duree.type === "determinee" && (
                        <div className="space-y-2">
                          <Label>Durée (en années) *</Label>
                          <Input
                            type="number"
                            min="1"
                            max="5"
                            value={indivisionData.duree.annees}
                            onChange={(e) => setIndivisionData({
                              ...indivisionData,
                              duree: {...indivisionData.duree, annees: e.target.value}
                            })}
                          />
                        </div>
                      )}

                      <div className="space-y-2 md:col-span-2">
                        <Label>Conditions de renouvellement</Label>
                        <Textarea
                          rows={2}
                          value={indivisionData.duree.conditionsRenouvellement}
                          onChange={(e) => setIndivisionData({
                            ...indivisionData,
                            duree: {...indivisionData.duree, conditionsRenouvellement: e.target.value}
                          })}
                          placeholder="Préciser les conditions..."
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Conditions de sortie anticipée</Label>
                        <Textarea
                          rows={2}
                          value={indivisionData.duree.conditionsSortie}
                          onChange={(e) => setIndivisionData({
                            ...indivisionData,
                            duree: {...indivisionData.duree, conditionsSortie: e.target.value}
                          })}
                          placeholder="Préciser les conditions..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* 5. Gestion de l'indivision */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">⚙️ Gestion de l'indivision</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label>Gérant désigné</Label>
                        <Input
                          value={indivisionData.gestion.gerant}
                          onChange={(e) => setIndivisionData({
                            ...indivisionData,
                            gestion: {...indivisionData.gestion, gerant: e.target.value}
                          })}
                          placeholder="Nom du gérant (peut être un indivisaire ou une personne externe)"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Pouvoirs du gérant</Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="pouvoir_gestion"
                              checked={indivisionData.gestion.pouvoirs.gestion_courante}
                              onChange={(e) => setIndivisionData({
                                ...indivisionData,
                                gestion: {
                                  ...indivisionData.gestion,
                                  pouvoirs: {...indivisionData.gestion.pouvoirs, gestion_courante: e.target.checked}
                                }
                              })}
                              className="rounded border-gray-300"
                            />
                            <Label htmlFor="pouvoir_gestion" className="cursor-pointer">Gestion courante</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="pouvoir_travaux"
                              checked={indivisionData.gestion.pouvoirs.travaux}
                              onChange={(e) => setIndivisionData({
                                ...indivisionData,
                                gestion: {
                                  ...indivisionData.gestion,
                                  pouvoirs: {...indivisionData.gestion.pouvoirs, travaux: e.target.checked}
                                }
                              })}
                              className="rounded border-gray-300"
                            />
                            <Label htmlFor="pouvoir_travaux" className="cursor-pointer">Autorisation des travaux</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="pouvoir_representation"
                              checked={indivisionData.gestion.pouvoirs.representation}
                              onChange={(e) => setIndivisionData({
                                ...indivisionData,
                                gestion: {
                                  ...indivisionData.gestion,
                                  pouvoirs: {...indivisionData.gestion.pouvoirs, representation: e.target.checked}
                                }
                              })}
                              className="rounded border-gray-300"
                            />
                            <Label htmlFor="pouvoir_representation" className="cursor-pointer">Représentation de l'indivision</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="pouvoir_signature"
                              checked={indivisionData.gestion.pouvoirs.signature_actes}
                              onChange={(e) => setIndivisionData({
                                ...indivisionData,
                                gestion: {
                                  ...indivisionData.gestion,
                                  pouvoirs: {...indivisionData.gestion.pouvoirs, signature_actes: e.target.checked}
                                }
                              })}
                              className="rounded border-gray-300"
                            />
                            <Label htmlFor="pouvoir_signature" className="cursor-pointer">Signature d'actes au nom de l'indivision</Label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Type de décisions *</Label>
                        <Select
                          value={indivisionData.gestion.decisions}
                          onValueChange={(value) => setIndivisionData({
                            ...indivisionData,
                            gestion: {...indivisionData.gestion, decisions: value}
                          })}
                        >
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unanimite">Unanimité</SelectItem>
                            <SelectItem value="majorite_2_3">Majorité des 2/3</SelectItem>
                            <SelectItem value="majorite_simple">Majorité simple</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Répartition des charges</Label>
                        <Input
                          value={indivisionData.gestion.charges}
                          onChange={(e) => setIndivisionData({
                            ...indivisionData,
                            gestion: {...indivisionData.gestion, charges: e.target.value}
                          })}
                          placeholder="Ex: Proportionnellement aux quote-parts"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Compte bancaire dédié</Label>
                        <Input
                          value={indivisionData.gestion.compteBancaire}
                          onChange={(e) => setIndivisionData({
                            ...indivisionData,
                            gestion: {...indivisionData.gestion, compteBancaire: e.target.value}
                          })}
                          placeholder="Coordonnées du compte (IBAN, nom de la banque...)"
                        />
                      </div>

                      {/* Upload mandat du gérant */}
                      {indivisionData.gestion.gerant && (
                        <div className="space-y-2 md:col-span-2">
                          <Label>📎 Mandat du gérant</Label>
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                            <input
                              type="file"
                              accept="application/pdf"
                              multiple
                              className="hidden"
                              id="mandat_gerant_upload"
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length > 0) {
                                  setIndivisionMandatGerantFiles(files);
                                  toast.success(`${files.length} fichier(s) ajouté(s)`);
                                }
                                e.target.value = '';
                              }}
                            />
                            <label htmlFor="mandat_gerant_upload" className="cursor-pointer flex items-center gap-3">
                              <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">Joindre le mandat du gérant</p>
                                <p className="text-xs text-muted-foreground">PDF uniquement</p>
                              </div>
                            </label>
                          </div>
                          {indivisionMandatGerantFiles.length > 0 && (
                            <div className="space-y-2 mt-2">
                              {indivisionMandatGerantFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                  <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span className="text-sm flex-1 truncate">{file.name}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => {
                                      setIndivisionMandatGerantFiles(indivisionMandatGerantFiles.filter((_, i) => i !== idx));
                                      toast.success('Fichier supprimé');
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 6. Utilisation du bien */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">🔑 Utilisation du bien</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label>Utilisation par les indivisaires</Label>
                        <RadioGroup
                          value={indivisionData.utilisation.utilisationParIndivisaires}
                          onValueChange={(value) => setIndivisionData({
                            ...indivisionData,
                            utilisation: {...indivisionData.utilisation, utilisationParIndivisaires: value}
                          })}
                        >
                          <div className="flex gap-4">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="oui" id="util_oui" />
                              <Label htmlFor="util_oui" className="cursor-pointer">Autorisée</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="non" id="util_non" />
                              <Label htmlFor="util_non" className="cursor-pointer">Non autorisée</Label>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>

                      {indivisionData.utilisation.utilisationParIndivisaires === "oui" && (
                        <>
                          <div className="space-y-2 md:col-span-2">
                            <Label>Conditions d'utilisation</Label>
                            <Textarea
                              rows={2}
                              value={indivisionData.utilisation.conditionsUtilisation}
                              onChange={(e) => setIndivisionData({
                                ...indivisionData,
                                utilisation: {...indivisionData.utilisation, conditionsUtilisation: e.target.value}
                              })}
                              placeholder="Préciser les conditions..."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Indemnité d'occupation (€)</Label>
                            <Input
                              type="number"
                              value={indivisionData.utilisation.indemniteMontant}
                              onChange={(e) => setIndivisionData({
                                ...indivisionData,
                                utilisation: {...indivisionData.utilisation, indemniteMontant: e.target.value}
                              })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Fréquence de l'indemnité</Label>
                            <Select
                              value={indivisionData.utilisation.indemniteFrequence}
                              onValueChange={(value) => setIndivisionData({
                                ...indivisionData,
                                utilisation: {...indivisionData.utilisation, indemniteFrequence: value}
                              })}
                            >
                              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mensuelle">Mensuelle</SelectItem>
                                <SelectItem value="trimestrielle">Trimestrielle</SelectItem>
                                <SelectItem value="annuelle">Annuelle</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}

                      <div className="space-y-2 md:col-span-2">
                        <Label>Location autorisée</Label>
                        <RadioGroup
                          value={indivisionData.utilisation.locationAutorisee}
                          onValueChange={(value) => setIndivisionData({
                            ...indivisionData,
                            utilisation: {...indivisionData.utilisation, locationAutorisee: value}
                          })}
                        >
                          <div className="flex gap-4">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="oui" id="location_oui" />
                              <Label htmlFor="location_oui" className="cursor-pointer">Oui</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="non" id="location_non" />
                              <Label htmlFor="location_non" className="cursor-pointer">Non</Label>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>

                      {indivisionData.utilisation.locationAutorisee === "oui" && (
                        <>
                          <div className="space-y-2">
                            <Label>Mandataire pour la location</Label>
                            <Input
                              value={indivisionData.utilisation.mandataireLocation}
                              onChange={(e) => setIndivisionData({
                                ...indivisionData,
                                utilisation: {...indivisionData.utilisation, mandataireLocation: e.target.value}
                              })}
                              placeholder="Nom du mandataire"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Répartition des loyers</Label>
                            <Input
                              value={indivisionData.utilisation.repartitionLoyers}
                              onChange={(e) => setIndivisionData({
                                ...indivisionData,
                                utilisation: {...indivisionData.utilisation, repartitionLoyers: e.target.value}
                              })}
                              placeholder="Ex: Proportionnellement aux quote-parts"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 7. Travaux et améliorations */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">🔨 Travaux et améliorations</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label>Types de travaux autorisés</Label>
                        <Textarea
                          rows={2}
                          value={indivisionData.travaux.typesAutorises}
                          onChange={(e) => setIndivisionData({
                            ...indivisionData,
                            travaux: {...indivisionData.travaux, typesAutorises: e.target.value}
                          })}
                          placeholder="Préciser les types de travaux..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Décision requise *</Label>
                        <Select
                          value={indivisionData.travaux.decisionRequise}
                          onValueChange={(value) => setIndivisionData({
                            ...indivisionData,
                            travaux: {...indivisionData.travaux, decisionRequise: value}
                          })}
                        >
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unanimite">Unanimité</SelectItem>
                            <SelectItem value="majorite_2_3">Majorité des 2/3</SelectItem>
                            <SelectItem value="majorite_simple">Majorité simple</SelectItem>
                            <SelectItem value="gerant">Décision du gérant</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Répartition des coûts</Label>
                        <Input
                          value={indivisionData.travaux.repartitionCouts}
                          onChange={(e) => setIndivisionData({
                            ...indivisionData,
                            travaux: {...indivisionData.travaux, repartitionCouts: e.target.value}
                          })}
                          placeholder="Ex: Proportionnellement aux quote-parts"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Travaux urgents (procédure)</Label>
                        <Textarea
                          rows={2}
                          value={indivisionData.travaux.travauxUrgents}
                          onChange={(e) => setIndivisionData({
                            ...indivisionData,
                            travaux: {...indivisionData.travaux, travauxUrgents: e.target.value}
                          })}
                          placeholder="Procédure en cas de travaux urgents..."
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Exigences de documentation</Label>
                        <Textarea
                          rows={2}
                          value={indivisionData.travaux.documentation}
                          onChange={(e) => setIndivisionData({
                            ...indivisionData,
                            travaux: {...indivisionData.travaux, documentation: e.target.value}
                          })}
                          placeholder="Préciser les documents requis (devis, factures, autorisations...)..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* 8. Sortie d'un indivisaire */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">🚪 Sortie d'un indivisaire</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label>Modalités de vente de la part *</Label>
                        <RadioGroup
                          value={indivisionData.sortie.venteLibre}
                          onValueChange={(value) => setIndivisionData({
                            ...indivisionData,
                            sortie: {...indivisionData.sortie, venteLibre: value}
                          })}
                        >
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="libre" id="vente_libre" />
                              <Label htmlFor="vente_libre" className="cursor-pointer">Vente libre</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="droit_preemption" id="vente_preemption" />
                              <Label htmlFor="vente_preemption" className="cursor-pointer">Droit de préemption des autres indivisaires</Label>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-2">
                        <Label>Évaluation de la part *</Label>
                        <Select
                          value={indivisionData.sortie.evaluationPart}
                          onValueChange={(value) => setIndivisionData({
                            ...indivisionData,
                            sortie: {...indivisionData.sortie, evaluationPart: value}
                          })}
                        >
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gerant">Par le gérant</SelectItem>
                            <SelectItem value="accord_indivisaires">Accord des indivisaires</SelectItem>
                            <SelectItem value="expert">Expert indépendant</SelectItem>
                            <SelectItem value="juge">Décision du juge</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Délai de rachat (jours)</Label>
                        <Input
                          type="number"
                          value={indivisionData.sortie.delaiRachat}
                          onChange={(e) => setIndivisionData({
                            ...indivisionData,
                            sortie: {...indivisionData.sortie, delaiRachat: e.target.value}
                          })}
                          placeholder="Ex: 60"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Modalités de paiement</Label>
                        <Textarea
                          rows={2}
                          value={indivisionData.sortie.modalitesPaiement}
                          onChange={(e) => setIndivisionData({
                            ...indivisionData,
                            sortie: {...indivisionData.sortie, modalitesPaiement: e.target.value}
                          })}
                          placeholder="Préciser les conditions de paiement..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* 9. Vente du bien */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">💰 Vente du bien</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label>Conditions de mise en vente</Label>
                        <Textarea
                          rows={2}
                          value={indivisionData.vente.conditionsMiseEnVente}
                          onChange={(e) => setIndivisionData({
                            ...indivisionData,
                            vente: {...indivisionData.vente, conditionsMiseEnVente: e.target.value}
                          })}
                          placeholder="Préciser les conditions..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Décision requise *</Label>
                        <Select
                          value={indivisionData.vente.decisionRequise}
                          onValueChange={(value) => setIndivisionData({
                            ...indivisionData,
                            vente: {...indivisionData.vente, decisionRequise: value}
                          })}
                        >
                          <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unanimite">Unanimité</SelectItem>
                            <SelectItem value="majorite_2_3">Majorité des 2/3</SelectItem>
                            <SelectItem value="majorite_simple">Majorité simple</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Mandataire pour la vente</Label>
                        <Input
                          value={indivisionData.vente.mandataire}
                          onChange={(e) => setIndivisionData({
                            ...indivisionData,
                            vente: {...indivisionData.vente, mandataire: e.target.value}
                          })}
                          placeholder="Nom du mandataire"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Répartition du prix de vente</Label>
                        <Input
                          value={indivisionData.vente.repartitionPrix}
                          onChange={(e) => setIndivisionData({
                            ...indivisionData,
                            vente: {...indivisionData.vente, repartitionPrix: e.target.value}
                          })}
                          placeholder="Ex: Proportionnellement aux quote-parts"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Gestion des plus-values</Label>
                        <Textarea
                          rows={2}
                          value={indivisionData.vente.gestionPlusValues}
                          onChange={(e) => setIndivisionData({
                            ...indivisionData,
                            vente: {...indivisionData.vente, gestionPlusValues: e.target.value}
                          })}
                          placeholder="Préciser la gestion fiscale et la répartition..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* 10. Comptabilité */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">📊 Comptabilité</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label>Tenue d'un registre des dépenses</Label>
                        <RadioGroup
                          value={indivisionData.comptabilite.registreDepenses}
                          onValueChange={(value) => setIndivisionData({
                            ...indivisionData,
                            comptabilite: {...indivisionData.comptabilite, registreDepenses: value}
                          })}
                        >
                          <div className="flex gap-4">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="oui" id="registre_oui" />
                              <Label htmlFor="registre_oui" className="cursor-pointer">Oui</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="non" id="registre_non" />
                              <Label htmlFor="registre_non" className="cursor-pointer">Non</Label>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Archivage des factures et justificatifs</Label>
                        <Textarea
                          rows={2}
                          value={indivisionData.comptabilite.archivageFactures}
                          onChange={(e) => setIndivisionData({
                            ...indivisionData,
                            comptabilite: {...indivisionData.comptabilite, archivageFactures: e.target.value}
                          })}
                          placeholder="Modalités d'archivage..."
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Modalités de remboursement des avances</Label>
                        <Textarea
                          rows={2}
                          value={indivisionData.comptabilite.remboursementAvances}
                          onChange={(e) => setIndivisionData({
                            ...indivisionData,
                            comptabilite: {...indivisionData.comptabilite, remboursementAvances: e.target.value}
                          })}
                          placeholder="Préciser les conditions..."
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Rapport annuel de gestion</Label>
                        <RadioGroup
                          value={indivisionData.comptabilite.rapportAnnuel}
                          onValueChange={(value) => setIndivisionData({
                            ...indivisionData,
                            comptabilite: {...indivisionData.comptabilite, rapportAnnuel: value}
                          })}
                        >
                          <div className="flex gap-4">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="oui" id="rapport_oui" />
                              <Label htmlFor="rapport_oui" className="cursor-pointer">Oui</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="non" id="rapport_non" />
                              <Label htmlFor="rapport_non" className="cursor-pointer">Non</Label>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>
                  </div>

                  {/* 11. Litiges */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">⚖️ Règlement des litiges</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label>Modes de résolution des litiges</Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="litige_mediation"
                              checked={indivisionData.litiges.modesResolution.mediation}
                              onChange={(e) => setIndivisionData({
                                ...indivisionData,
                                litiges: {
                                  ...indivisionData.litiges,
                                  modesResolution: {...indivisionData.litiges.modesResolution, mediation: e.target.checked}
                                }
                              })}
                              className="rounded border-gray-300"
                            />
                            <Label htmlFor="litige_mediation" className="cursor-pointer">Médiation</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="litige_arbitrage"
                              checked={indivisionData.litiges.modesResolution.arbitrage}
                              onChange={(e) => setIndivisionData({
                                ...indivisionData,
                                litiges: {
                                  ...indivisionData.litiges,
                                  modesResolution: {...indivisionData.litiges.modesResolution, arbitrage: e.target.checked}
                                }
                              })}
                              className="rounded border-gray-300"
                            />
                            <Label htmlFor="litige_arbitrage" className="cursor-pointer">Arbitrage</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="litige_tribunal"
                              checked={indivisionData.litiges.modesResolution.tribunal}
                              onChange={(e) => setIndivisionData({
                                ...indivisionData,
                                litiges: {
                                  ...indivisionData.litiges,
                                  modesResolution: {...indivisionData.litiges.modesResolution, tribunal: e.target.checked}
                                }
                              })}
                              className="rounded border-gray-300"
                            />
                            <Label htmlFor="litige_tribunal" className="cursor-pointer">Tribunal compétent</Label>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Clause de solidarité pour les dettes</Label>
                        <RadioGroup
                          value={indivisionData.litiges.solidariteDettes}
                          onValueChange={(value) => setIndivisionData({
                            ...indivisionData,
                            litiges: {...indivisionData.litiges, solidariteDettes: value}
                          })}
                        >
                          <div className="flex gap-4">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="oui" id="solidarite_oui" />
                              <Label htmlFor="solidarite_oui" className="cursor-pointer">Oui (indivisaires solidaires)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="non" id="solidarite_non" />
                              <Label htmlFor="solidarite_non" className="cursor-pointer">Non (chacun à hauteur de sa quote-part)</Label>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>
                  </div>

                  {/* 12. Procurations et documents complémentaires */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">📎 Procurations et documents complémentaires</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label>Procurations (si applicable)</Label>
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 hover:border-muted-foreground/50 transition-colors">
                          <input
                            type="file"
                            accept="application/pdf"
                            multiple
                            className="hidden"
                            id="procurations_upload"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              if (files.length > 0) {
                                setIndivisionProcurationFiles(files);
                                toast.success(`${files.length} fichier(s) ajouté(s)`);
                              }
                              e.target.value = '';
                            }}
                          />
                          <label htmlFor="procurations_upload" className="cursor-pointer flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">Joindre les procurations</p>
                              <p className="text-xs text-muted-foreground">Si un indivisaire est représenté</p>
                            </div>
                          </label>
                        </div>
                        {indivisionProcurationFiles.length > 0 && (
                          <div className="space-y-2 mt-2">
                            {indivisionProcurationFiles.map((file, idx) => (
                              <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-sm flex-1 truncate">{file.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    setIndivisionProcurationFiles(indivisionProcurationFiles.filter((_, i) => i !== idx));
                                    toast.success('Fichier supprimé');
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </>
            )}

          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button 
              variant="outline"
              className={role === 'notaire' ? 'border-orange-600 text-orange-600 hover:text-orange-600 hover:bg-orange-50' : 'border-blue-600 text-blue-600 hover:text-blue-600 hover:bg-blue-50'}
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
                } else if (pendingContractType === "Bail commercial / professionnel") {
                  handleBailCommercialSubmit();
                } else if (pendingContractType === "Convention d'indivision") {
                  handleIndivisionSubmit();
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
