
-- Add published column to shifts
ALTER TABLE public.shifts ADD COLUMN published boolean NOT NULL DEFAULT false;

-- Drop old staff policy and recreate with published filter
DROP POLICY IF EXISTS "Staff can view own shifts" ON public.shifts;
CREATE POLICY "Staff can view own published shifts"
ON public.shifts
FOR SELECT
USING (auth.uid() = staff_id AND published = true);
