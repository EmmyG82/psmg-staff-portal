-- Allow staff to update their own unavailability entries
CREATE POLICY "Staff can update own unavailability"
  ON public.unavailability
  FOR UPDATE
  USING (auth.uid() = staff_id)
  WITH CHECK (auth.uid() = staff_id);

-- Allow staff to delete their own unavailability entries
CREATE POLICY "Staff can delete own unavailability"
  ON public.unavailability
  FOR DELETE
  USING (auth.uid() = staff_id);
