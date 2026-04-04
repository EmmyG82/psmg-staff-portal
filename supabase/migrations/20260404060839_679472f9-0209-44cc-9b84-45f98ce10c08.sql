CREATE POLICY "Staff can update own unavailability"
ON public.unavailability
FOR UPDATE
TO public
USING (auth.uid() = staff_id)
WITH CHECK (auth.uid() = staff_id);

CREATE POLICY "Staff can delete own unavailability"
ON public.unavailability
FOR DELETE
TO public
USING (auth.uid() = staff_id);