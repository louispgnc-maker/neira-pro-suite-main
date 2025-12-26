/**
 * Helper pour générer un contrat avec l'IA Claude
 * Util depuis n'importe quel handler de contrat
 */

import { supabase } from './supabaseClient';

interface GenerateContractParams {
  contractType: string;
  formData: any;
  clientInfo?: any;
  user: any;
}

/**
 * Génère un contrat juridique via Claude AI
 * @returns Le texte du contrat généré ou "[Erreur de génération]" en cas d'échec
 */
export async function generateContractWithAI({
  contractType,
  formData,
  clientInfo = {},
  user
}: GenerateContractParams): Promise<string> {
  try {
    console.log(`🤖 Génération IA pour: ${contractType}`);
    
    // Timeout plus long pour l'IA (60 secondes)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    const { data: aiResponse, error: aiError } = await supabase.functions.invoke('generate-contract-ai', {
      body: {
        contractType,
        formData,
        clientInfo
      },
      // @ts-ignore - options non typées
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (aiError) {
      console.error('❌ Erreur génération IA:', aiError);
      
      // Message d'erreur plus explicite selon le type d'erreur
      if (aiError.message?.includes('Failed to send a request')) {
        console.error('⚠️ L\'Edge Function n\'est pas accessible. Vérifiez qu\'elle est déployée sur Supabase.');
        return "[ERREUR: La fonction de génération IA n'est pas disponible. Veuillez contacter l'administrateur pour déployer l'Edge Function 'generate-contract-ai'.]";
      }
      
      throw aiError;
    }

    const generatedContract = aiResponse?.contract || "[Erreur de génération]";
    console.log(`✅ Contrat généré (${generatedContract.length} caractères)`);
    
    return generatedContract;
    
  } catch (error: any) {
    console.error('💥 Erreur critique génération IA:', error);
    
    // Message détaillé selon le type d'erreur
    if (error.message?.includes('Failed to send a request')) {
      return "[ERREUR DE CONFIGURATION]\n\nLa fonction de génération automatique n'est pas disponible.\n\nActions requises:\n1. Déployer l'Edge Function 'generate-contract-ai' sur Supabase\n2. Configurer la variable d'environnement OPENAI_API_KEY\n3. Vérifier que l'Edge Function est activée\n\nEn attendant, vous pouvez créer le contrat manuellement ou contacter le support technique.";
    }
    
    return "[Erreur de génération - L'IA n'a pas pu générer le contrat. Veuillez réessayer ou contacter le support.]";
  }
}

/**
 * Récupère les infos d'un client depuis son ID
 */
export function getClientInfo(clientId: string, clients: any[]): any {
  if (!clientId) return {};
  
  const client = clients.find(c => c.id === clientId);
  if (!client) return {};
  
  return {
    nom: client.nom,
    prenom: client.prenom,
    adresse: client.adresse,
    telephone: client.telephone,
    email: client.email,
    date_naissance: client.date_naissance,
    lieu_naissance: client.lieu_naissance,
    nationalite: client.nationalite,
    profession: client.profession,
    situation_matrimoniale: client.situation_matrimoniale,
    situation_familiale: client.situation_familiale,
    etat_civil: client.etat_civil,
  };
}
