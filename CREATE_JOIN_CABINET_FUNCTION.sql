-- Créer une fonction RPC pour insérer le cabinet_member
-- Contourne les problèmes de permissions et de mapping

CREATE OR REPLACE FUNCTION join_cabinet_with_code(
  p_code text,
  p_user_id uuid,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cabinet_id uuid;
  v_cabinet_nom text;
  v_new_member jsonb;
BEGIN
  -- Vérifier le code et récupérer le cabinet
  SELECT id, nom INTO v_cabinet_id, v_cabinet_nom
  FROM cabinets
  WHERE code_acces = p_code
  LIMIT 1;

  IF v_cabinet_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Code invalide'
    );
  END IF;

  -- Supprimer l'ancien membre s'il existe
  DELETE FROM cabinet_members
  WHERE cabinet_id = v_cabinet_id
  AND user_id = p_user_id;

  -- Insérer le nouveau membre
  INSERT INTO cabinet_members (
    cabinet_id,
    user_id,
    email,
    nom,
    status,
    joined_at
  )
  VALUES (
    v_cabinet_id,
    p_user_id,
    p_email,
    '',
    'active',
    NOW()
  )
  RETURNING jsonb_build_object(
    'id', id,
    'cabinet_id', cabinet_id,
    'user_id', user_id,
    'email', email,
    'status', status
  ) INTO v_new_member;

  RETURN jsonb_build_object(
    'success', true,
    'cabinet', jsonb_build_object(
      'id', v_cabinet_id,
      'nom', v_cabinet_nom
    ),
    'member', v_new_member
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Donner les permissions
GRANT EXECUTE ON FUNCTION join_cabinet_with_code(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION join_cabinet_with_code(text, uuid, text) TO anon;
