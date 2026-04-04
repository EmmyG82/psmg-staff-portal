CREATE OR REPLACE FUNCTION public.notify_users(
  _recipient_ids UUID[],
  _title TEXT,
  _message TEXT,
  _type TEXT DEFAULT 'info',
  _exclude_user_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  IF _recipient_ids IS NULL OR array_length(_recipient_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, read)
  SELECT DISTINCT
    recipient_id,
    _title,
    _message,
    COALESCE(NULLIF(_type, ''), 'info'),
    false
  FROM unnest(_recipient_ids) AS recipient_id
  WHERE recipient_id IS NOT NULL
    AND (_exclude_user_id IS NULL OR recipient_id <> _exclude_user_id);

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_all_active_users(
  _title TEXT,
  _message TEXT,
  _type TEXT DEFAULT 'info',
  _exclude_user_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, read)
  SELECT DISTINCT
    p.user_id,
    _title,
    _message,
    COALESCE(NULLIF(_type, ''), 'info'),
    false
  FROM public.profiles p
  WHERE p.active = true
    AND (_exclude_user_id IS NULL OR p.user_id <> _exclude_user_id);

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_admins(
  _title TEXT,
  _message TEXT,
  _type TEXT DEFAULT 'info',
  _exclude_user_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, read)
  SELECT DISTINCT
    ur.user_id,
    _title,
    _message,
    COALESCE(NULLIF(_type, ''), 'info'),
    false
  FROM public.user_roles ur
  INNER JOIN public.profiles p ON p.user_id = ur.user_id
  WHERE ur.role = 'admin'
    AND p.active = true
    AND (_exclude_user_id IS NULL OR ur.user_id <> _exclude_user_id);

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_users(UUID[], TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_all_active_users(TEXT, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_admins(TEXT, TEXT, TEXT, UUID) TO authenticated;
