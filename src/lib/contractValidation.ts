/**
 * Service de validation "hard rules" côté code
 * Validation stricte des données avant génération du contrat final
 */

import type { FormField, ValidationError, ValidationResult } from '@/types/contractPipeline';

/**
 * Valide les données du formulaire selon des règles strictes côté code
 */
export function validateFormData(
  formData: Record<string, any>,
  schema: { fields: FormField[]; validationRules?: any[] }
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // 1. Vérifier les champs requis
  for (const field of schema.fields) {
    if (field.required && !field.conditional_on) {
      const value = formData[field.id];
      if (value === undefined || value === null || value === '') {
        errors.push({
          field: field.id,
          message: `Le champ "${field.label}" est obligatoire`,
          type: 'required'
        });
      }
    }
  }

  // 2. Vérifier les formats
  for (const field of schema.fields) {
    const value = formData[field.id];
    if (!value) continue;

    switch (field.type) {
      case 'number':
        if (isNaN(Number(value))) {
          errors.push({
            field: field.id,
            message: `"${field.label}" doit être un nombre valide`,
            type: 'format'
          });
        }
        // Vérifier min/max
        if (field.validation?.min !== undefined && Number(value) < field.validation.min) {
          errors.push({
            field: field.id,
            message: `"${field.label}" doit être >= ${field.validation.min}`,
            type: 'format'
          });
        }
        if (field.validation?.max !== undefined && Number(value) > field.validation.max) {
          errors.push({
            field: field.id,
            message: `"${field.label}" doit être <= ${field.validation.max}`,
            type: 'format'
          });
        }
        break;

      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          errors.push({
            field: field.id,
            message: `"${field.label}" n'est pas une date valide`,
            type: 'format'
          });
        }
        break;
    }

    // Vérifier les patterns
    if (field.validation?.pattern && typeof value === 'string') {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(value)) {
        errors.push({
          field: field.id,
          message: `"${field.label}" ne respecte pas le format attendu`,
          type: 'format'
        });
      }
    }
  }

  // 3. Vérifier les cohérences dates/durées
  const dateCoherenceErrors = validateDateCoherence(formData);
  errors.push(...dateCoherenceErrors);

  // 4. Vérifier les cohérences montants
  const amountCoherenceErrors = validateAmountCoherence(formData);
  errors.push(...amountCoherenceErrors);

  // 5. Vérifier les cohérences parties/identité
  const partyCoherenceErrors = validatePartyCoherence(formData);
  errors.push(...partyCoherenceErrors);

  // 6. Règles métier spécifiques
  const businessRuleErrors = validateBusinessRules(formData, schema);
  errors.push(...businessRuleErrors);

  // 7. Vérifier les champs conditionnels
  for (const field of schema.fields) {
    if (field.conditional_on) {
      const conditionValue = formData[field.conditional_on.field];
      if (conditionValue === field.conditional_on.value && field.required) {
        const value = formData[field.id];
        if (value === undefined || value === null || value === '') {
          errors.push({
            field: field.id,
            message: `Le champ "${field.label}" est obligatoire dans ce contexte`,
            type: 'required'
          });
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Valide la cohérence des dates
 */
function validateDateCoherence(formData: Record<string, any>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Règles génériques de cohérence de dates
  const dateRules = [
    { start: 'date_debut', end: 'date_fin', label: 'Date de début/fin' },
    { start: 'date_signature', end: 'date_effet', label: 'Date de signature/effet' },
    { start: 'date_naissance', end: 'date_signature', label: 'Date de naissance/signature' },
  ];

  for (const rule of dateRules) {
    const startValue = formData[rule.start];
    const endValue = formData[rule.end];

    if (startValue && endValue) {
      const startDate = new Date(startValue);
      const endDate = new Date(endValue);

      if (startDate > endDate) {
        errors.push({
          field: rule.end,
          message: `${rule.label}: la date de fin doit être postérieure à la date de début`,
          type: 'coherence'
        });
      }
    }
  }

  // Vérifier la cohérence durée vs dates
  if (formData.date_debut && formData.date_fin && formData.duree) {
    const start = new Date(formData.date_debut);
    const end = new Date(formData.date_fin);
    const durationMonths = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    const specifiedDuration = parseFloat(formData.duree);
    if (!isNaN(specifiedDuration)) {
      const diff = Math.abs(durationMonths - specifiedDuration);
      if (diff > 1) { // Tolérance de 1 mois
        errors.push({
          field: 'duree',
          message: 'La durée spécifiée ne correspond pas aux dates de début et fin',
          type: 'coherence'
        });
      }
    }
  }

  return errors;
}

/**
 * Valide la cohérence des montants
 */
function validateAmountCoherence(formData: Record<string, any>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Tous les montants doivent être positifs
  const amountFields = Object.keys(formData).filter(key => 
    key.includes('montant') || key.includes('prix') || 
    key.includes('loyer') || key.includes('salaire') ||
    key.includes('remuneration')
  );

  for (const field of amountFields) {
    const value = parseFloat(formData[field]);
    if (!isNaN(value) && value < 0) {
      errors.push({
        field,
        message: 'Le montant doit être positif',
        type: 'coherence'
      });
    }
  }

  // Vérifier les relations entre montants
  if (formData.prix_total && formData.acompte) {
    const total = parseFloat(formData.prix_total);
    const acompte = parseFloat(formData.acompte);
    
    if (!isNaN(total) && !isNaN(acompte) && acompte > total) {
      errors.push({
        field: 'acompte',
        message: 'L\'acompte ne peut pas être supérieur au prix total',
        type: 'coherence'
      });
    }
  }

  return errors;
}

/**
 * Valide la cohérence des parties et identités
 */
function validatePartyCoherence(formData: Record<string, any>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Vérifier que les parties ont des identités complètes
  const partyFields = [
    { prefix: 'partie1', label: 'Partie 1' },
    { prefix: 'partie2', label: 'Partie 2' },
    { prefix: 'vendeur', label: 'Vendeur' },
    { prefix: 'acquereur', label: 'Acquéreur' },
    { prefix: 'bailleur', label: 'Bailleur' },
    { prefix: 'locataire', label: 'Locataire' },
  ];

  for (const party of partyFields) {
    const hasNom = formData[`${party.prefix}_nom`];
    const hasPrenom = formData[`${party.prefix}_prenom`];
    const hasAdresse = formData[`${party.prefix}_adresse`];

    // Si une info est présente, toutes doivent l'être
    if (hasNom || hasPrenom || hasAdresse) {
      if (!hasNom) {
        errors.push({
          field: `${party.prefix}_nom`,
          message: `Le nom de ${party.label} est obligatoire`,
          type: 'required'
        });
      }
      if (!hasPrenom && !formData[`${party.prefix}_raison_sociale`]) {
        // Si pas de prénom, doit avoir raison sociale (personne morale)
        // Sinon c'est une personne physique incomplète
        if (!hasNom?.includes(' ')) { // Pas un nom complet
          errors.push({
            field: `${party.prefix}_prenom`,
            message: `Le prénom de ${party.label} est obligatoire (ou raison sociale si entreprise)`,
            type: 'required'
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Valide les règles métier spécifiques
 */
function validateBusinessRules(
  formData: Record<string, any>, 
  schema: { fields: FormField[]; validationRules?: any[] }
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Appliquer les règles de validation définies dans le schéma
  if (schema.validationRules) {
    for (const rule of schema.validationRules) {
      try {
        const isValid = evaluateValidationRule(rule, formData);
        if (!isValid) {
          errors.push({
            field: rule.fields[0], // Premier champ concerné
            message: rule.errorMessage,
            type: 'business_rule'
          });
        }
      } catch (error) {
        console.error('Erreur validation règle:', rule, error);
      }
    }
  }

  return errors;
}

/**
 * Évalue une règle de validation custom
 */
function evaluateValidationRule(rule: any, formData: Record<string, any>): boolean {
  const { type, fields, rule: ruleStr } = rule;

  switch (type) {
    case 'required':
      return fields.every((field: string) => {
        const value = formData[field];
        return value !== undefined && value !== null && value !== '';
      });

    case 'comparison':
      // Parser les règles de type "field1 > field2"
      const match = ruleStr.match(/(\w+)\s*([><=]+)\s*(\w+)/);
      if (match) {
        const [, field1, operator, field2] = match;
        const val1 = formData[field1];
        const val2 = formData[field2];
        
        if (val1 === undefined || val2 === undefined) return true; // Skip si valeurs manquantes
        
        switch (operator) {
          case '>': return val1 > val2;
          case '<': return val1 < val2;
          case '>=': return val1 >= val2;
          case '<=': return val1 <= val2;
          case '==': return val1 == val2;
          default: return true;
        }
      }
      return true;

    case 'coherence':
      // Règles de cohérence custom
      // Peut être étendu selon les besoins
      return true;

    default:
      return true;
  }
}

/**
 * Formate les erreurs pour l'affichage
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors
    .map(err => `• ${err.message}`)
    .join('\n');
}

/**
 * Groupe les erreurs par champ
 */
export function groupErrorsByField(errors: ValidationError[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  
  for (const error of errors) {
    if (!grouped[error.field]) {
      grouped[error.field] = [];
    }
    grouped[error.field].push(error.message);
  }
  
  return grouped;
}
