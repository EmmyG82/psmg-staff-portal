-- Create jokes table to store daily jokes
CREATE TABLE public.jokes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  joke_text TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on jokes table
ALTER TABLE public.jokes ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read active jokes
CREATE POLICY "Authenticated users can read jokes"
  ON public.jokes
  FOR SELECT
  TO authenticated
  USING (active = true);

-- Create current_joke view: returns one random active joke
CREATE VIEW public.current_joke AS
  SELECT joke_text
  FROM public.jokes
  WHERE active = true
  ORDER BY random()
  LIMIT 1;

-- Seed some initial jokes so the view always has data
INSERT INTO public.jokes (joke_text) VALUES
  ('Why don''t scientists trust atoms? Because they make up everything!'),
  ('I told my computer I needed a break. Now it won''t stop sending me Kit-Kat ads.'),
  ('Why did the scarecrow win an award? Because he was outstanding in his field!'),
  ('I''m reading a book about anti-gravity. It''s impossible to put down.'),
  ('Why did the bicycle fall over? Because it was two-tired!'),
  ('What do you call a fake noodle? An impasta.'),
  ('Why can''t you give Elsa a balloon? Because she''ll let it go.'),
  ('I used to hate facial hair, but then it grew on me.'),
  ('Why did the math book look so sad? Because it had too many problems.'),
  ('What do you call cheese that isn''t yours? Nacho cheese!');
