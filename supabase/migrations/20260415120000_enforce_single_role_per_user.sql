-- Enforce one role per user in user_roles.
-- Previously the unique constraint was (user_id, role), allowing a user to have
-- both 'admin' and 'staff' rows. The application treats each person as having a
-- single role, so we normalise the table and tighten the constraint to (user_id).

-- 1. Remove any duplicate rows, keeping the highest-privilege role (admin > staff).
DELETE FROM public.user_roles ur
WHERE ur.role = 'staff'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = ur.user_id
      AND ur2.role = 'admin'
  );

-- 2. Drop the old compound unique constraint.
ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_user_id_role_key;

-- 3. Add a simple unique constraint on user_id (one role per user).
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);
