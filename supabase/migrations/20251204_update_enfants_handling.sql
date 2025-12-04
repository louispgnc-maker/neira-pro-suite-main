-- Update submit_client_form to handle enfants_list (structured children data)
CREATE OR REPLACE FUNCTION submit_client_form(
  form_token TEXT,
  form_response JSONB
)
RETURNS TABLE(success BOOLEAN, client_id UUID, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_form_record RECORD;
  v_client_id UUID;
  v_creator_role TEXT;
  v_enfants_data JSONB;
BEGIN
  -- Get form details
  SELECT * INTO v_form_record
  FROM client_forms
  WHERE token = form_token
  AND status = 'pending'
  AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Formulaire introuvable, déjà complété ou expiré'::TEXT;
    RETURN;
  END IF;

  -- Get creator role from the form (default to 'notaire' if not set)
  v_creator_role := COALESCE(v_form_record.creator_role, 'notaire');

  -- Handle enfants data: use enfants_list if provided, otherwise enfants_details
  IF form_response->'enfants_list' IS NOT NULL AND jsonb_array_length(form_response->'enfants_list') > 0 THEN
    v_enfants_data := form_response->'enfants_list';
  ELSIF form_response->>'enfants_details' IS NOT NULL THEN
    v_enfants_data := form_response->'enfants_details';
  ELSE
    v_enfants_data := '[]'::jsonb;
  END IF;

  -- Create client record in clients table with owner_id from form creator
  -- Map all form fields to corresponding client columns
  INSERT INTO clients (
    owner_id,
    role,
    name,
    nom,
    prenom,
    email,
    telephone,
    adresse,
    date_naissance,
    lieu_naissance,
    nationalite,
    sexe,
    type_identite,
    numero_identite,
    date_expiration_identite,
    profession,
    employeur,
    adresse_professionnelle,
    siret,
    situation_fiscale,
    type_dossier,
    contrat_souhaite,
    historique_litiges,
    consentement_rgpd,
    signature_mandat,
    etat_civil,
    situation_matrimoniale,
    enfants,
    revenus,
    comptes_bancaires,
    situation_familiale,
    source
  )
  VALUES (
    v_form_record.created_by,
    v_creator_role,
    CONCAT(form_response->>'prenom', ' ', form_response->>'nom'),
    form_response->>'nom',
    form_response->>'prenom',
    form_response->>'email',
    form_response->>'telephone',
    form_response->>'adresse',
    NULLIF(form_response->>'date_naissance', '')::DATE,
    form_response->>'lieu_naissance',
    form_response->>'nationalite',
    form_response->>'sexe',
    form_response->>'type_piece_identite',
    form_response->>'numero_piece_identite',
    NULLIF(form_response->>'date_expiration_piece', '')::DATE,
    form_response->>'profession',
    form_response->>'nom_employeur',
    form_response->>'adresse_professionnelle',
    form_response->>'numero_siret',
    form_response->>'situation_fiscale',
    form_response->>'nature_affaire',
    form_response->>'type_contrat',
    form_response->>'litiges_passes',
    COALESCE((form_response->>'consentement_rgpd')::BOOLEAN, false),
    COALESCE((form_response->>'signature_mandat')::BOOLEAN, false),
    form_response->>'etat_civil',
    form_response->>'situation_matrimoniale',
    v_enfants_data,
    form_response->>'revenus_mensuels',
    CASE WHEN form_response->>'comptes_bancaires' IS NOT NULL 
         THEN form_response->'comptes_bancaires' 
         ELSE '[]'::jsonb END,
    jsonb_build_object(
      'situation_familiale', form_response->>'situation_familiale',
      'regime_matrimonial', form_response->>'regime_matrimonial',
      'nombre_enfants', form_response->>'nombre_enfants',
      'personne_a_charge', form_response->>'personne_a_charge'
    ),
    'formulaire_web'
  )
  RETURNING id INTO v_client_id;

  -- Update form status
  UPDATE client_forms
  SET 
    status = 'completed',
    completed_at = NOW(),
    response_data = form_response
  WHERE id = v_form_record.id;

  -- Return success
  RETURN QUERY SELECT TRUE, v_client_id, 'Client créé avec succès'::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, SQLERRM::TEXT;
END;
$$;

-- Grant execute permission to authenticated and anon users (for public form)
GRANT EXECUTE ON FUNCTION submit_client_form(TEXT, JSONB) TO authenticated, anon;
