/**
 * Gestionnaire du pipeline de création de contrat multi-étapes
 */

import { supabase } from './supabaseClient';
import type {
  ContractPipelineState,
  PipelineStep,
  ContractBrief,
  MissingInfoQuestion,
  ClientAnswers,
  ContractFormSchema,
  AuditReport,
  ValidationResult,
  ClarificationResponse,
  FormSchemaResponse,
  AuditResponse,
  ContractGenerationResponse
} from '@/types/contractPipeline';
import { validateFormData } from './contractValidation';

const MAX_AUDIT_ITERATIONS = 3; // Maximum 3 itérations d'audit

/**
 * Classe principale pour gérer le pipeline de création de contrat
 */
export class ContractPipelineManager {
  private state: ContractPipelineState;
  private onStateChange?: (state: ContractPipelineState) => void;

  constructor(
    contractType: string,
    originalRequest: string,
    onStateChange?: (state: ContractPipelineState) => void
  ) {
    this.state = {
      step: 'clarification',
      contractType,
      originalRequest,
      auditIterations: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: []
    };
    this.onStateChange = onStateChange;
  }

  /**
   * Récupère l'état actuel
   */
  getState(): ContractPipelineState {
    return { ...this.state };
  }

  /**
   * Met à jour l'état et notifie
   */
  private updateState(updates: Partial<ContractPipelineState>, action: string) {
    this.state = {
      ...this.state,
      ...updates,
      updatedAt: new Date().toISOString(),
      history: [
        ...this.state.history,
        {
          step: this.state.step,
          timestamp: new Date().toISOString(),
          action,
          data: updates
        }
      ]
    };

    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }

  /**
   * ÉTAPE 1: Clarification de la demande
   */
  async clarifyRequest(role: 'avocat' | 'notaire', existingAnswers?: ClientAnswers): Promise<ClarificationResponse> {
    try {
      console.log('📋 ÉTAPE 1: Clarification...');
      
      const { data, error } = await supabase.functions.invoke('clarify-contract-request', {
        body: {
          contractType: this.state.contractType,
          description: this.state.originalRequest,
          role,
          existingAnswers
        }
      });

      if (error) throw error;

      const brief: ContractBrief = data.brief;
      const needsMoreInfo: boolean = data.needsMoreInfo;
      const questions: MissingInfoQuestion[] = data.questions || [];

      this.updateState({ brief }, 'Clarification terminée');

      if (needsMoreInfo && questions.length > 0) {
        this.updateState(
          { step: 'missing_info_questions', questions },
          'Questions générées - en attente des réponses'
        );
      } else {
        // Pas d'infos manquantes, on passe à la génération du schéma
        this.updateState(
          { step: 'form_schema' },
          'Brief complet - passage au schéma'
        );
      }

      return {
        success: true,
        brief,
        needsMoreInfo,
        questions
      };
    } catch (error: any) {
      console.error('❌ Erreur clarification:', error);
      throw new Error(`Erreur lors de la clarification: ${error.message}`);
    }
  }

  /**
   * ÉTAPE 2: Enregistrer les réponses du client et mettre à jour le brief
   */
  async submitClientAnswers(answers: ClientAnswers, role: 'avocat' | 'notaire'): Promise<void> {
    try {
      console.log('📝 ÉTAPE 2: Enregistrement des réponses...');
      
      this.updateState({ clientAnswers: answers }, 'Réponses du client enregistrées');

      // Mettre à jour le brief avec les nouvelles infos
      const updatedBrief = { ...this.state.brief! };
      updatedBrief.providedInfo = {
        ...updatedBrief.providedInfo,
        ...answers
      };

      // Retirer les infos qui ne sont plus manquantes
      updatedBrief.missingInfo = updatedBrief.missingInfo.filter(
        info => !answers[info.field]
      );

      this.updateState({ brief: updatedBrief }, 'Brief mis à jour avec les réponses');

      // Vérifier s'il reste des infos bloquantes
      const hasCriticalMissing = updatedBrief.missingInfo.some(
        info => info.priority === 'bloquant'
      );

      if (hasCriticalMissing) {
        // Régénérer les questions pour les infos encore manquantes
        await this.clarifyRequest(role, answers);
      } else {
        // Toutes les infos bloquantes sont là, on passe au schéma
        this.updateState({ step: 'form_schema' }, 'Passage à la génération du schéma');
      }
    } catch (error: any) {
      console.error('❌ Erreur soumission réponses:', error);
      throw new Error(`Erreur lors de la soumission: ${error.message}`);
    }
  }

  /**
   * ÉTAPE 3: Génération du schéma de formulaire
   */
  async generateFormSchema(role: 'avocat' | 'notaire'): Promise<FormSchemaResponse> {
    try {
      console.log('📋 ÉTAPE 3: Génération du schéma...');
      
      const brief = this.state.brief;
      if (!brief) {
        throw new Error('Brief manquant - exécutez d\'abord clarifyRequest()');
      }

      // Construire la description enrichie pour la génération
      const enrichedDescription = `
${this.state.originalRequest}

Contexte: ${brief.context.description}
Objectif: ${brief.context.objectif}
Points sensibles: ${brief.pointsSensibles.join(', ')}

Informations fournies:
${JSON.stringify(brief.providedInfo, null, 2)}
      `.trim();

      const { data, error } = await supabase.functions.invoke('generate-form-schema', {
        body: {
          contractType: this.state.contractType,
          description: enrichedDescription,
          role,
          brief  // Passer aussi le brief complet
        }
      });

      if (error) throw error;

      if (!data?.schema) {
        throw new Error('Schéma invalide retourné par l\'IA');
      }

      const schema: ContractFormSchema = data.schema;

      this.updateState({ formSchema: schema, step: 'audit' }, 'Schéma généré - passage à l\'audit');

      return {
        success: true,
        schema
      };
    } catch (error: any) {
      console.error('❌ Erreur génération schéma:', error);
      throw new Error(`Erreur lors de la génération: ${error.message}`);
    }
  }

  /**
   * ÉTAPE 4: Audit qualité du schéma
   */
  async auditFormSchema(role: 'avocat' | 'notaire'): Promise<AuditResponse> {
    try {
      console.log('🔍 ÉTAPE 4: Audit qualité...');
      
      const schema = this.state.formSchema;
      const brief = this.state.brief;

      if (!schema || !brief) {
        throw new Error('Schéma ou brief manquant');
      }

      const { data, error } = await supabase.functions.invoke('audit-form-schema', {
        body: {
          schema,
          brief,
          contractType: this.state.contractType,
          role
        }
      });

      if (error) throw error;

      const report: AuditReport = data.report;

      this.updateState(
        { 
          auditReport: report,
          auditIterations: this.state.auditIterations + 1
        },
        `Audit ${this.state.auditIterations + 1} terminé`
      );

      // Si des problèmes critiques et qu'on peut encore itérer
      if (report.shouldRetry && this.state.auditIterations < MAX_AUDIT_ITERATIONS) {
        console.log(`⚠️ Problèmes détectés - correction et ré-audit (${this.state.auditIterations}/${MAX_AUDIT_ITERATIONS})`);
        
        // Utiliser le schéma corrigé
        if (report.correctedSchema) {
          this.updateState({ formSchema: report.correctedSchema }, 'Schéma corrigé appliqué');
          
          // Ré-auditer
          return await this.auditFormSchema(role);
        }
      } else if (report.shouldRetry && this.state.auditIterations >= MAX_AUDIT_ITERATIONS) {
        console.warn('⚠️ Maximum d\'itérations atteint - passage au formulaire malgré les problèmes');
      }

      // Audit validé ou max iterations atteint
      this.updateState({ step: 'form_filling' }, 'Audit terminé - prêt pour la saisie');

      return {
        success: true,
        report,
        shouldRetry: false  // On arrête les itérations
      };
    } catch (error: any) {
      console.error('❌ Erreur audit:', error);
      throw new Error(`Erreur lors de l'audit: ${error.message}`);
    }
  }

  /**
   * ÉTAPE 5: Validation des données du formulaire
   */
  async validateFormData(formData: Record<string, any>): Promise<ValidationResult> {
    try {
      console.log('✅ ÉTAPE 5: Validation des données...');
      
      const schema = this.state.formSchema;
      if (!schema) {
        throw new Error('Schéma manquant');
      }

      const result = validateFormData(formData, schema);

      this.updateState(
        { 
          formData,
          validationResult: result,
          step: result.isValid ? 'final_validation' : 'form_filling'
        },
        result.isValid ? 'Validation réussie' : 'Erreurs de validation détectées'
      );

      return result;
    } catch (error: any) {
      console.error('❌ Erreur validation:', error);
      throw new Error(`Erreur lors de la validation: ${error.message}`);
    }
  }

  /**
   * ÉTAPE 6: Génération du contrat final
   */
  async generateFinalContract(
    formData: Record<string, any>,
    clientInfo: any,
    attachments?: any[]
  ): Promise<ContractGenerationResponse> {
    try {
      console.log('📄 ÉTAPE 6: Génération du contrat final...');
      
      // Validation finale
      const validation = await this.validateFormData(formData);
      if (!validation.isValid) {
        throw new Error('Validation échouée - impossible de générer le contrat');
      }

      // Appeler l'Edge Function de génération
      const { data, error } = await supabase.functions.invoke('generate-contract-ai', {
        body: {
          contractType: this.state.contractType,
          formData,
          clientInfo,
          attachments
        }
      });

      if (error) throw error;

      this.updateState({ step: 'contract_generation' }, 'Contrat généré avec succès');

      return {
        success: true,
        contract: data.contract,
        metadata: {
          tokensUsed: data.tokens?.total_tokens,
          generationTime: Date.now()
        }
      };
    } catch (error: any) {
      console.error('❌ Erreur génération contrat:', error);
      throw new Error(`Erreur lors de la génération: ${error.message}`);
    }
  }

  /**
   * Sauvegarder l'état du pipeline (pour reprendre plus tard)
   */
  async saveState(userId: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('contract_pipeline_states')
        .insert({
          user_id: userId,
          contract_type: this.state.contractType,
          state: this.state,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;

      return data.id;
    } catch (error: any) {
      console.error('❌ Erreur sauvegarde état:', error);
      throw error;
    }
  }

  /**
   * Charger un état sauvegardé
   */
  static async loadState(stateId: string): Promise<ContractPipelineManager> {
    try {
      const { data, error } = await supabase
        .from('contract_pipeline_states')
        .select('state')
        .eq('id', stateId)
        .single();

      if (error) throw error;

      const manager = new ContractPipelineManager(
        data.state.contractType,
        data.state.originalRequest
      );
      manager.state = data.state;

      return manager;
    } catch (error: any) {
      console.error('❌ Erreur chargement état:', error);
      throw error;
    }
  }
}

/**
 * Hook pour faciliter l'utilisation du pipeline dans les composants React
 */
export function useContractPipeline(
  contractType: string,
  description: string,
  onStateChange?: (state: ContractPipelineState) => void
) {
  const manager = new ContractPipelineManager(contractType, description, onStateChange);
  return manager;
}
