-- Restore user roles after data loss.
-- 1. Assign 'staff' role to all auth users who have no role yet.
-- 2. Assign 'admin' role to the designated admin user (upsert).

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'staff'::public.app_role
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Promote the admin user (insert or upgrade existing staff entry).
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'thegeorges8182@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- If the admin was already inserted as staff above, remove the staff entry.
DELETE FROM public.user_roles ur
WHERE ur.role = 'staff'
AND ur.user_id = (
  SELECT id FROM auth.users WHERE email = 'thegeorges8182@gmail.com'
);
