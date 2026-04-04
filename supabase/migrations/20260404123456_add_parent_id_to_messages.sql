ALTER TABLE public.messages
ADD COLUMN parent_id UUID REFERENCES public.messages(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS messages_parent_id_idx ON public.messages(parent_id);
