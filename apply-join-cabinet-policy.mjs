#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🔄 Application de la migration pour rejoindre un cabinet...');

  try {
    // Drop les anciennes politiques si elles existent
    console.log('🗑️ Suppression des anciennes politiques...');
    
    await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "Users can join cabinet with valid code" ON public.cabinet_members;
        DROP POLICY IF EXISTS "Users can update their own cabinet membership" ON public.cabinet_members;
      `
    }).catch(() => {
      // Ignorer les erreurs si les politiques n'existent pas
    });

    // Créer les nouvelles politiques
    console.log('✨ Création des nouvelles politiques...');
    
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Politique INSERT: permettre de créer un cabinet_member si l'email correspond et code valide
        CREATE POLICY "Users can join cabinet with valid code"
        ON public.cabinet_members
        FOR INSERT
        TO authenticated
        WITH CHECK (
          -- L'utilisateur peut s'insérer s'il existe un cabinet avec un code d'accès valide
          -- et que son email correspond (ou que son user_id correspond)
          EXISTS (
            SELECT 1 FROM public.cabinets c
            WHERE c.id = cabinet_members.cabinet_id
            AND c.code_acces IS NOT NULL
          )
          AND (
            cabinet_members.user_id = auth.uid()
            OR cabinet_members.email = auth.jwt()->>'email'
          )
        );

        -- Politique UPDATE: permettre de mettre à jour son propre cabinet_member
        CREATE POLICY "Users can update their own cabinet membership"
        ON public.cabinet_members
        FOR UPDATE
        TO authenticated
        USING (
          -- Peut mettre à jour si c'est son propre user_id OU si l'email correspond et statut pending
          cabinet_members.user_id = auth.uid()
          OR (cabinet_members.email = auth.jwt()->>'email' AND cabinet_members.status = 'pending')
        )
        WITH CHECK (
          -- Peut mettre à jour son propre user_id OU son email
          cabinet_members.user_id = auth.uid()
          OR cabinet_members.email = auth.jwt()->>'email'
        );
      `
    });

    if (error) {
      console.error('❌ Erreur lors de la création des politiques:', error);
      process.exit(1);
    }

    console.log('✅ Politiques créées avec succès!');
    console.log('📝 Les utilisateurs peuvent maintenant rejoindre un cabinet avec un code d\'accès');

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

applyMigration();
