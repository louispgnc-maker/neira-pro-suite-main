-- Create function to submit client form and create client record
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
  v_cabinet_role TEXT;
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

  -- Get cabinet role (avocat or notaire) from cabinet
  SELECT role INTO v_cabinet_role
  FROM cabinets
  WHERE id = v_form_record.cabinet_id;

  -- Create client record in clients table
  INSERT INTO clients (
    cabinet_id,
    nom,
    prenom,
    email,
    telephone,
    adresse,
    code_postal,
    ville,
    date_naissance,
    lieu_naissance,
    nationalite,
    profession,
    situation_familiale,
    regime_matrimonial,
    nombre_enfants,
    notes,
    statut,
    source
  )
  VALUES (
    v_form_record.cabinet_id,
    form_response->>'nom',
    form_response->>'prenom',
    form_response->>'email',
    form_response->>'telephone',
    form_response->>'adresse',
    form_response->>'code_postal',
    form_response->>'ville',
    NULLIF(form_response->>'date_naissance', '')::DATE,
    form_response->>'lieu_naissance',
    form_response->>'nationalite',
    form_response->>'profession',
    form_response->>'situation_familiale',
    form_response->>'regime_matrimonial',
    NULLIF(form_response->>'nombre_enfants', '')::INTEGER,
    form_response->>'notes',
    'actif',
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

-- Add response_data column to client_forms if it doesn't exist
ALTER TABLE client_forms ADD COLUMN IF NOT EXISTS response_data JSONB;
ALTER TABLE client_forms ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add source column to clients if it doesn't exist
ALTER TABLE clients ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
