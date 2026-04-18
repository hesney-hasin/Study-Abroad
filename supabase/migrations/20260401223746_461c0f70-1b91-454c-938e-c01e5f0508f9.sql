
-- Paper chat sessions table
CREATE TABLE public.paper_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.paper_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own paper chat sessions" ON public.paper_chat_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own paper chat sessions" ON public.paper_chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own paper chat sessions" ON public.paper_chat_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own paper chat sessions" ON public.paper_chat_sessions FOR DELETE USING (auth.uid() = user_id);

-- Paper chat messages table
CREATE TABLE public.paper_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.paper_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.paper_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own paper chat messages" ON public.paper_chat_messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.paper_chat_sessions WHERE id = paper_chat_messages.session_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert their own paper chat messages" ON public.paper_chat_messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.paper_chat_sessions WHERE id = paper_chat_messages.session_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete their own paper chat messages" ON public.paper_chat_messages FOR DELETE USING (EXISTS (SELECT 1 FROM public.paper_chat_sessions WHERE id = paper_chat_messages.session_id AND user_id = auth.uid()));

-- Updated_at trigger for paper_chat_sessions
CREATE TRIGGER update_paper_chat_sessions_updated_at BEFORE UPDATE ON public.paper_chat_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
