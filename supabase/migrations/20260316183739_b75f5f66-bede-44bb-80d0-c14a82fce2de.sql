
-- Professor folders table
CREATE TABLE public.professor_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Professors',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.professor_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own folders" ON public.professor_folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own folders" ON public.professor_folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own folders" ON public.professor_folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own folders" ON public.professor_folders FOR DELETE USING (auth.uid() = user_id);

-- Saved professors table
CREATE TABLE public.saved_professors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  folder_id UUID REFERENCES public.professor_folders(id) ON DELETE CASCADE,
  professor_name TEXT NOT NULL,
  university TEXT,
  department TEXT,
  research_areas TEXT[],
  email TEXT,
  profile_url TEXT,
  funding_status TEXT,
  notes TEXT,
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_professors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved professors" ON public.saved_professors FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own saved professors" ON public.saved_professors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own saved professors" ON public.saved_professors FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own saved professors" ON public.saved_professors FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at on folders
CREATE TRIGGER update_professor_folders_updated_at
  BEFORE UPDATE ON public.professor_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
