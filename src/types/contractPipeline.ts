/**
 * Types pour le pipeline de création de contrat en plusieurs étapes
 */

// ============================================================
// ÉTAPE 1: CLARIFICATION (Texte libre → Brief structuré)
// ============================================================

export interface ContractBrief {
  /** Type de contrat principal */
  contractType: string;
  
  /** Variante spécifique du contrat (ex: CDD, CDI pour contrat de travail) */
  variant?: string;
  
  /** Parties impliquées et leurs rôles */
  parties: Array<{
    role: string;
    description?: string;
  }>;
  
  /** Contexte du contrat */
  context: {
    description: string;
    objectif: string;
    particularites?: string[];
  };
  
  /** Points sensibles à traiter */
  pointsSensibles: string[];
  
  /** Annexes attendues */
  annexesAttendues?: string[];
  
  /** Informations manquantes critiques */
  missingInfo: Array<{
    category: string;  // ex: "Durée", "Montant", "Parties"
    field: string;     // ex: "date_debut", "prix"
    description: string;
    priority: 'bloquant' | 'important' | 'optionnel';
  }>;
  
  /** Informations déjà fournies */
  providedInfo: Record<string, any>;
}

// ============================================================
// ÉTAPE 2: QUESTIONS AU CLIENT
// ============================================================

export interface MissingInfoQuestion {
  id: string;
  category: string;
  question: string;
  fieldName: string;
  inputType: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'radio';
  options?: string[];  // Pour select/radio
  required: boolean;
  priority: 'bloquant' | 'important' | 'optionnel';
  hint?: string;
}

export interface ClientAnswers {
  [fieldName: string]: any;
}

// ============================================================
// ÉTAPE 3: SCHÉMA DE FORMULAIRE
// ============================================================

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'radio' | 'checkbox' | 'file';
  required: boolean;
  placeholder?: string;
  options?: string[];
  conditional_on?: {
    field: string;
    value: any;
  };
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    customRule?: string;  // ex: "date_fin > date_debut"
  };
  section?: string;
  hint?: string;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: string[];  // IDs des champs
}

export interface ContractFormSchema {
  contractType: string;
  clientRoles: string[];  // Les parties que le client peut représenter
  sections: FormSection[];
  fields: FormField[];
  validationRules: ValidationRule[];
}

export interface ValidationRule {
  id: string;
  type: 'required' | 'comparison' | 'coherence' | 'custom';
  description: string;
  fields: string[];  // Champs concernés
  rule: string;  // Règle en format lisible
  errorMessage: string;
}

// ============================================================
// ÉTAPE 4: AUDIT QUALITÉ
// ============================================================

export interface AuditIssue {
  id: string;
  severity: 'bloquant' | 'important' | 'mineur';
  category: 'champ_manquant' | 'incohérence' | 'clause_sensible' | 'validation';
  title: string;
  description: string;
  affectedFields?: string[];
  suggestedFix?: {
    type: 'add_field' | 'modify_field' | 'add_validation' | 'add_clause';
    details: any;
  };
}

export interface AuditReport {
  timestamp: string;
  schemaVersion: string;
  issues: AuditIssue[];
  hasCriticalIssues: boolean;
  suggestions: string[];
  correctedSchema?: ContractFormSchema;
}

// ============================================================
// ÉTAPE 5: VALIDATION HARD RULES
// ============================================================

export interface ValidationError {
  field: string;
  message: string;
  type: 'required' | 'format' | 'coherence' | 'business_rule';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: string[];
}

// ============================================================
// PIPELINE STATE
// ============================================================

export type PipelineStep = 
  | 'clarification'           // Analyse de la demande
  | 'missing_info_questions'  // Questions au client
  | 'form_schema'             // Génération du schéma
  | 'audit'                   // Audit qualité
  | 'form_filling'            // Collecte des réponses
  | 'final_validation'        // Validation finale
  | 'contract_generation';    // Génération du contrat

export interface ContractPipelineState {
  step: PipelineStep;
  contractType: string;
  originalRequest: string;
  
  // Étape 1
  brief?: ContractBrief;
  
  // Étape 2
  questions?: MissingInfoQuestion[];
  clientAnswers?: ClientAnswers;
  
  // Étape 3
  formSchema?: ContractFormSchema;
  
  // Étape 4
  auditReport?: AuditReport;
  auditIterations: number;
  
  // Étape 5
  formData?: Record<string, any>;
  validationResult?: ValidationResult;
  
  // Métadonnées
  createdAt: string;
  updatedAt: string;
  history: Array<{
    step: PipelineStep;
    timestamp: string;
    action: string;
    data?: any;
  }>;
}

// ============================================================
// API RESPONSES
// ============================================================

export interface ClarificationResponse {
  success: boolean;
  brief: ContractBrief;
  needsMoreInfo: boolean;
  questions?: MissingInfoQuestion[];
}

export interface FormSchemaResponse {
  success: boolean;
  schema: ContractFormSchema;
  retryCount?: number;
}

export interface AuditResponse {
  success: boolean;
  report: AuditReport;
  shouldRetry: boolean;
}

export interface ContractGenerationResponse {
  success: boolean;
  contract: string;
  metadata?: {
    tokensUsed?: number;
    generationTime?: number;
  };
}
