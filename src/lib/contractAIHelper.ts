/**
 * Helper pour générer un contrat avec l'IA Claude
 * Util depuis n'importe quel handler de contrat
 */

import { createClient } from '@supabase/supabase-js';

// Client Supabase spécial pour les Edge Functions avec timeout de 90s
const supabaseUrl = import.meta?.env?.VITE_SUPABASE_URL || 'https://elysrdqujzlbvnjfilvh.supabase.co';
const supabaseKey = import.meta?.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVseXNyZHF1anpsYnZuamZpbHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjMzMTQsImV4cCI6MjA3NzczOTMxNH0.ItqpqcgP_FFqvmx-FunQv0RmCI9EATJlUWuYmw0zPvA';

// Fetch avec timeout de 90s pour l'IA (génération peut être longue)
const fetchWithTimeout = (timeoutMs = 90000) => {
  return async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(input, { ...init, signal: controller.signal });
      return resp;
    } finally {
      clearTimeout(id);
    }
  };
};

const supabaseAI = createClient(supabaseUrl, supabaseKey, {
  global: { fetch: fetchWithTimeout(90000) },
});

interface GenerateContractParams {
  contractType: string;
  formData: any;
  clientInfo?: any;
  user: any;
  attachments?: {
    name: string;
    type: string;
    size: number;
    category?: string;
  }[];
}

/**
 * Génère un contrat juridique via Claude AI
 * @returns Le texte du contrat généré ou "[Erreur de génération]" en cas d'échec
 */
export async function generateContractWithAI({
  contractType,
  formData,
  clientInfo = {},
  user,
  attachments = []
}: GenerateContractParams): Promise<string> {
  try {
    console.log(`🤖 Génération IA pour: ${contractType}`);
    console.log('📦 FormData envoyé:', formData);
    console.log('📊 Nombre de champs formData:', Object.keys(formData || {}).length);
    console.log('👤 ClientInfo:', clientInfo);
    console.log('📎 Pièces jointes:', attachments.length, 'fichiers');
    if (attachments.length > 0) {
      console.log('📎 Détails fichiers:', attachments.map(f => `${f.name} (${f.type}, ${(f.size / 1024).toFixed(2)} Ko)`).join(', '));
    }
    
    const { data: aiResponse, error: aiError } = await supabaseAI.functions.invoke('generate-contract-ai', {
      body: {
        contractType,
        formData,
        clientInfo,
        attachments
      }
    });

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
  
  // Extraire situation_familiale si c'est un objet JSON
  let situationFamiliale = client.situation_familiale;
  if (typeof situationFamiliale === 'object' && situationFamiliale !== null) {
    situationFamiliale = {
      regime_matrimonial: situationFamiliale.regime_matrimonial,
      nombre_enfants: situationFamiliale.nombre_enfants,
      personne_a_charge: situationFamiliale.personne_a_charge
    };
  }
  
  return {
    // Identité
    nom: client.nom,
    prenom: client.prenom,
    date_naissance: client.date_naissance,
    lieu_naissance: client.lieu_naissance,
    nationalite: client.nationalite,
    
    // Contact
    adresse: client.adresse,
    telephone: client.telephone,
    email: client.email,
    
    // Situation
    profession: client.profession,
    etat_civil: client.etat_civil,
    situation_matrimoniale: client.situation_matrimoniale,
    situation_familiale: situationFamiliale,
    
    // Identité administrative
    type_identite: client.type_identite,
    numero_identite: client.numero_identite,
    date_expiration_identite: client.date_expiration_identite,
  };
}

/**
 * Extrait les métadonnées des fichiers pour l'IA (ne lit pas le contenu)
 */
export function extractFileMetadata(files: File[], category?: string) {
  return files.map(file => ({
    name: file.name,
    type: file.type,
    size: file.size,
    category: category
  }));
}
