-- Fix submit_client_form function to use owner_id instead of cabinet_id
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

  -- Create client record in clients table with owner_id from form creator
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
    profession,
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
    form_response->>'profession',
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
