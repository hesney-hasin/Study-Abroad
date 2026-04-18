import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type Message = { role: 'user' | 'assistant'; content: string };

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: Message[];
}

const LOCAL_KEY = 'professor_chat_sessions';

function getLocalSessions(): ChatSession[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalSessions(sessions: ChatSession[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(sessions));
}

function generateTitle(messages: Message[]): string {
  const first = messages.find(m => m.role === 'user');
  if (!first) return 'New Chat';
  return first.content.slice(0, 50) + (first.content.length > 50 ? '…' : '');
}

export function useChatPersistence() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const migrationDone = useRef(false);

  // Load sessions
  const loadSessions = useCallback(async () => {
    if (user) {
      setLoading(true);
      const { data } = await supabase
        .from('professor_chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (data) {
        // Load messages for each session
        const sessionsWithMessages: ChatSession[] = await Promise.all(
          data.map(async (s) => {
            const { data: msgs } = await supabase
              .from('professor_chat_messages')
              .select('role, content, created_at')
              .eq('session_id', s.id)
              .order('created_at', { ascending: true });
            return {
              id: s.id,
              title: s.title,
              created_at: s.created_at,
              updated_at: s.updated_at,
              messages: (msgs || []).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
            };
          })
        );
        setSessions(sessionsWithMessages);
      }
      setLoading(false);
    } else {
      setSessions(getLocalSessions());
    }
  }, [user]);

  // Migrate localStorage sessions to DB on sign-in
  useEffect(() => {
    if (!user || migrationDone.current) return;
    migrationDone.current = true;

    const localSessions = getLocalSessions();
    if (localSessions.length === 0) {
      loadSessions();
      return;
    }

    (async () => {
      for (const session of localSessions) {
        if (session.messages.length === 0) continue;
        const { data: newSession } = await supabase
          .from('professor_chat_sessions')
          .insert({ user_id: user.id, title: session.title })
          .select()
          .single();

        if (newSession) {
          const msgs = session.messages.map(m => ({
            session_id: newSession.id,
            role: m.role,
            content: m.content,
          }));
          await supabase.from('professor_chat_messages').insert(msgs);
        }
      }
      localStorage.removeItem(LOCAL_KEY);
      await loadSessions();
    })();
  }, [user, loadSessions]);

  useEffect(() => {
    if (!user) {
      setSessions(getLocalSessions());
    } else if (!migrationDone.current) {
      // will be handled by migration effect
    } else {
      loadSessions();
    }
  }, [user, loadSessions]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  const createSession = useCallback(async (): Promise<string> => {
    const id = crypto.randomUUID();
    const newSession: ChatSession = {
      id,
      title: 'New Chat',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: [],
    };

    if (user) {
      const { data } = await supabase
        .from('professor_chat_sessions')
        .insert({ id, user_id: user.id, title: 'New Chat' })
        .select()
        .single();
      if (data) newSession.id = data.id;
    }

    setSessions(prev => [newSession, ...prev]);
    if (!user) saveLocalSessions([newSession, ...getLocalSessions()]);
    setActiveSessionId(newSession.id);
    return newSession.id;
  }, [user]);

  const updateSessionMessages = useCallback(async (sessionId: string, messages: Message[]) => {
    const title = generateTitle(messages);

    setSessions(prev => prev.map(s =>
      s.id === sessionId
        ? { ...s, messages, title, updated_at: new Date().toISOString() }
        : s
    ));

    if (!user) {
      const local = getLocalSessions().map(s =>
        s.id === sessionId ? { ...s, messages, title, updated_at: new Date().toISOString() } : s
      );
      saveLocalSessions(local);
    }
  }, [user]);

  const saveMessageToDB = useCallback(async (sessionId: string, message: Message) => {
    if (!user) return;
    await supabase.from('professor_chat_messages').insert({
      session_id: sessionId,
      role: message.role,
      content: message.content,
    });
  }, [user]);

  const updateSessionTitle = useCallback(async (sessionId: string, title: string) => {
    if (user) {
      await supabase.from('professor_chat_sessions').update({ title }).eq('id', sessionId);
    }
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title } : s));
    if (!user) {
      const local = getLocalSessions().map(s => s.id === sessionId ? { ...s, title } : s);
      saveLocalSessions(local);
    }
  }, [user]);

  const deleteSession = useCallback(async (sessionId: string) => {
    if (user) {
      await supabase.from('professor_chat_sessions').delete().eq('id', sessionId);
    }
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (!user) {
      saveLocalSessions(getLocalSessions().filter(s => s.id !== sessionId));
    }
    if (activeSessionId === sessionId) setActiveSessionId(null);
  }, [user, activeSessionId]);

  return {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    createSession,
    updateSessionMessages,
    saveMessageToDB,
    updateSessionTitle,
    deleteSession,
    loading,
  };
}
