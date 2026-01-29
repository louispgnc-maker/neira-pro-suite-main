-- Create RPC to get cabinet subscription info (bypasses RLS)
CREATE OR REPLACE FUNCTION get_cabinet_subscription_info(user_id_param UUID)
RETURNS TABLE (
  cabinet_id UUID,
  subscription_plan TEXT,
  max_members INT,
  billing_period TEXT,
  subscription_started_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as cabinet_id,
    c.subscription_plan,
    c.max_members,
    c.billing_period,
    c.subscription_started_at
  FROM cabinets c
  INNER JOIN cabinet_members cm ON cm.cabinet_id = c.id
  WHERE cm.user_id = user_id_param
    AND cm.status = 'active';
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_cabinet_subscription_info(UUID) TO authenticated;
