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
    
    const { data: aiResponse, error: aiError } = await supabase.functions.invoke('generate-contract-ai', {
      body: {
        contractType,
        formData,
        clientInfo
      }
    });

    if (aiError) {
      console.error('❌ Erreur génération IA:', aiError);
      throw aiError;
    }

    const generatedContract = aiResponse?.contract || "[Erreur de génération]";
    console.log(`✅ Contrat généré (${generatedContract.length} caractères)`);
    
    return generatedContract;
    
  } catch (error: any) {
    console.error('💥 Erreur critique génération IA:', error);
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
