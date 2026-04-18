
-- Chat sessions table
CREATE TABLE public.professor_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chat messages table
CREATE TABLE public.professor_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.professor_chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.professor_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professor_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS for chat sessions
CREATE POLICY "Users can view their own chat sessions" ON public.professor_chat_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own chat sessions" ON public.professor_chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own chat sessions" ON public.professor_chat_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own chat sessions" ON public.professor_chat_sessions FOR DELETE USING (auth.uid() = user_id);

-- RLS for chat messages (through session ownership)
CREATE POLICY "Users can view their own chat messages" ON public.professor_chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.professor_chat_sessions WHERE id = session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert their own chat messages" ON public.professor_chat_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.professor_chat_sessions WHERE id = session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete their own chat messages" ON public.professor_chat_messages FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.professor_chat_sessions WHERE id = session_id AND user_id = auth.uid())
);
