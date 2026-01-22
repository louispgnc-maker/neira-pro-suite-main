-- Migration: Document audit logs, quota validation, and upload helpers
-- Description: Complete system for secure document uploads with audit trail and quota enforcement

-- 1. Create audit log table for document operations
CREATE TABLE IF NOT EXISTS document_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  cabinet_id uuid REFERENCES cabinets(id) ON DELETE CASCADE,
  operation text NOT NULL CHECK (operation IN ('upload', 'download', 'delete', 'view', 'update')),
  bucket_name text NOT NULL,
  file_path text NOT NULL,
  file_name text,
  file_size bigint,
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_document_audit_logs_user ON document_audit_logs(user_id);
CREATE INDEX idx_document_audit_logs_cabinet ON document_audit_logs(cabinet_id);
CREATE INDEX idx_document_audit_logs_created ON document_audit_logs(created_at DESC);

ALTER TABLE document_audit_logs ENABLE ROW LEVEL SECURITY;

-- Professionals can view audit logs for their cabinet
CREATE POLICY "Cabinet members can view audit logs"
  ON document_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    cabinet_id IN (
      SELECT cm.cabinet_id 
      FROM cabinet_members cm 
      WHERE cm.user_id = auth.uid() 
        AND cm.status = 'active'
    )
  );

-- 2. Function to log document operations
CREATE OR REPLACE FUNCTION log_document_operation(
  p_operation text,
  p_bucket_name text,
  p_file_path text,
  p_file_name text DEFAULT NULL,
  p_file_size bigint DEFAULT NULL,
  p_cabinet_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO document_audit_logs (
    user_id,
    cabinet_id,
    operation,
    bucket_name,
    file_path,
    file_name,
    file_size,
    metadata
  ) VALUES (
    auth.uid(),
    p_cabinet_id,
    p_operation,
    p_bucket_name,
    p_file_path,
    p_file_name,
    p_file_size,
    p_metadata
  );
END;
$$;

-- 3. Function to check storage quota before upload
CREATE OR REPLACE FUNCTION check_storage_quota(
  p_cabinet_id uuid,
  p_file_size bigint
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_storage bigint;
  v_max_storage bigint;
  v_subscription_plan text;
  v_result jsonb;
BEGIN
  -- Get cabinet's current storage and subscription plan
  SELECT 
    COALESCE(storage_used, 0),
    subscription_plan
  INTO v_current_storage, v_subscription_plan
  FROM cabinets
  WHERE id = p_cabinet_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'Cabinet not found'
    );
  END IF;

  -- Determine max storage based on plan
  v_max_storage := CASE v_subscription_plan
    WHEN 'free' THEN 1073741824        -- 1 GB
    WHEN 'essential' THEN 10737418240   -- 10 GB
    WHEN 'premium' THEN 107374182400    -- 100 GB
    ELSE NULL                            -- unlimited
  END;

  -- Check if upload would exceed quota
  IF v_max_storage IS NOT NULL AND (v_current_storage + p_file_size) > v_max_storage THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'Storage quota exceeded',
      'current_storage', v_current_storage,
      'max_storage', v_max_storage,
      'file_size', p_file_size
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'current_storage', v_current_storage,
    'max_storage', v_max_storage,
    'remaining', CASE 
      WHEN v_max_storage IS NULL THEN NULL
      ELSE v_max_storage - v_current_storage
    END
  );
END;
$$;

-- 4. Function to upload document to cabinet (personal space)
CREATE OR REPLACE FUNCTION upload_cabinet_document(
  p_cabinet_id uuid,
  p_file_name text,
  p_file_size bigint,
  p_file_type text,
  p_storage_path text,
  p_client_name text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_is_member boolean;
  v_quota_check jsonb;
  v_document_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Check if user is an active member of the cabinet
  SELECT EXISTS (
    SELECT 1 
    FROM cabinet_members 
    WHERE cabinet_id = p_cabinet_id 
      AND user_id = v_user_id 
      AND status = 'active'
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authorized for this cabinet'
    );
  END IF;

  -- Check storage quota
  v_quota_check := check_storage_quota(p_cabinet_id, p_file_size);
  
  IF NOT (v_quota_check->>'allowed')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', v_quota_check->>'error',
      'quota_info', v_quota_check
    );
  END IF;

  -- Get user's role to determine document role
  DECLARE
    v_role text;
  BEGIN
    SELECT role INTO v_role
    FROM cabinets
    WHERE id = p_cabinet_id;

    -- Insert document record
    INSERT INTO documents (
      owner_id,
      name,
      client_name,
      status,
      role,
      storage_path
    ) VALUES (
      v_user_id,
      p_file_name,
      p_client_name,
      'En cours',
      v_role,
      p_storage_path
    ) RETURNING id INTO v_document_id;

    -- Update cabinet storage usage
    UPDATE cabinets
    SET storage_used = COALESCE(storage_used, 0) + p_file_size
    WHERE id = p_cabinet_id;

    -- Log the upload
    PERFORM log_document_operation(
      'upload',
      'documents',
      p_storage_path,
      p_file_name,
      p_file_size,
      p_cabinet_id,
      jsonb_build_object(
        'file_type', p_file_type,
        'document_id', v_document_id
      )
    );

    RETURN jsonb_build_object(
      'success', true,
      'document_id', v_document_id,
      'storage_used', (SELECT storage_used FROM cabinets WHERE id = p_cabinet_id)
    );
  END;
END;
$$;

-- 5. Function to upload document to client shared space
CREATE OR REPLACE FUNCTION upload_client_document(
  p_client_id uuid,
  p_file_name text,
  p_file_size bigint,
  p_file_type text,
  p_file_url text,
  p_description text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_is_authorized boolean;
  v_cabinet_id uuid;
  v_document_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Check if user is client or professional for this client
  SELECT 
    c.owner_id,
    (c.user_id = v_user_id) OR EXISTS (
      SELECT 1 
      FROM cabinet_members cm 
      WHERE cm.cabinet_id = c.owner_id 
        AND cm.user_id = v_user_id 
        AND cm.status = 'active'
    )
  INTO v_cabinet_id, v_is_authorized
  FROM clients c
  WHERE c.id = p_client_id;

  IF NOT v_is_authorized THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authorized for this client'
    );
  END IF;

  -- Insert into client_shared_documents
  INSERT INTO client_shared_documents (
    client_id,
    title,
    file_name,
    file_url,
    file_size,
    file_type,
    uploaded_by,
    description
  ) VALUES (
    p_client_id,
    p_file_name,
    p_file_name,
    p_file_url,
    p_file_size,
    p_file_type,
    v_user_id,
    p_description
  ) RETURNING id INTO v_document_id;

  -- Log the upload
  PERFORM log_document_operation(
    'upload',
    'shared-documents',
    p_file_url,
    p_file_name,
    p_file_size,
    v_cabinet_id,
    jsonb_build_object(
      'file_type', p_file_type,
      'client_id', p_client_id,
      'document_id', v_document_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'document_id', v_document_id
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION log_document_operation TO authenticated;
GRANT EXECUTE ON FUNCTION check_storage_quota TO authenticated;
GRANT EXECUTE ON FUNCTION upload_cabinet_document TO authenticated;
GRANT EXECUTE ON FUNCTION upload_client_document TO authenticated;
