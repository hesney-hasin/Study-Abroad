import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, GraduationCap, Loader2, User, UserRound, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/hooks/useAuth';
import { useProfessorFolders } from '@/hooks/useProfessorFolders';
import { useChatPersistence } from '@/hooks/useChatPersistence';
import { parseProfessorsFromMarkdown, professorsToCsv, downloadCsv } from '@/lib/professorParser';
import { MessageActions } from '@/components/professors/MessageActions';
import { ChatSidebar } from '@/components/professors/ChatSidebar';
import { streamAI } from '@/lib/aiClient';

type Message = { role: 'user' | 'assistant'; content: string };

const SUGGESTIONS = [
  'Find PhD supervisors at MIT for Machine Learning',
  'Who are the top NLP professors at Stanford?',
  'Supervisors for Data Science PhD at Tampere University',
  'Compare CS professors: ETH Zurich vs TU Munich',
  'How to write a cold email to a professor for PhD?',
  'Professors working on distributed systems in Europe',
];

const ProfessorFinder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { folders, createFolder, saveProfessor } = useProfessorFolders();
  const {
    sessions,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    createSession,
    updateSessionMessages,
    saveMessageToDB,
    updateSessionTitle,
    deleteSession,
  } = useChatPersistence();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

useEffect(() => {
  if (!activeSession) {
    setMessages([]);
    return;
  }

  if (activeSession.messages.length > 0) {
    setMessages(activeSession.messages);
  }
}, [activeSession]);


  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const ensureSession = useCallback(async (): Promise<string> => {
    if (activeSessionId) return activeSessionId;
    return await createSession();
  }, [activeSessionId, createSession]);

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const sessionId = await ensureSession();
    const userMsg: Message = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Persist user message
    await saveMessageToDB(sessionId, userMsg);
    // Update title from first message
    if (messages.length === 0) {
      const title = text.trim().slice(0, 50) + (text.trim().length > 50 ? '…' : '');
      await updateSessionTitle(sessionId, title);
    }

    let assistantSoFar = '';
    const updateAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      await streamAI({
        messages: newMessages,
        edgeFunctionPath: 'professor-search',
        systemPrompt: 'You are an AI professor finder. Help users discover PhD supervisors, research groups, and provide structured professor information including name, university, department, research areas, email, and funding status.',
        onDelta: updateAssistant,
        onDone: async () => {
          setIsLoading(false);
          if (assistantSoFar.trim()) {
            const assistantMsg: Message = { role: 'assistant', content: assistantSoFar };
            await saveMessageToDB(sessionId, assistantMsg);
          }
          setMessages(prev => {
            updateSessionMessages(sessionId, prev);
            return prev;
          });
        },
        onError: (err) => {
          updateAssistant(assistantSoFar ? `\n\n⚠️ ${err}` : `⚠️ ${err}`);
          setIsLoading(false);
        },
      });
    } catch {
      updateAssistant('\n\n⚠️ Connection error. Please try again.');
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const handleExportCsv = (professors: ReturnType<typeof parseProfessorsFromMarkdown>) => {
    const csv = professorsToCsv(professors);
    downloadCsv(csv, `professors-${Date.now()}.csv`);
  };

  const handleNewChat = async () => {
    const id = await createSession();
    setActiveSessionId(id);
    setMessages([]);
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50/50 to-background dark:from-violet-950/30 dark:via-purple-950/20 dark:to-background relative flex flex-col overflow-hidden">
      <div className="absolute top-20 right-0 w-72 h-72 bg-violet-400/10 dark:bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-40 left-10 w-56 h-56 bg-purple-400/10 dark:bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <UserRound className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-bold font-display text-foreground">
                  AI Professor Finder
                </h1>
                <p className="text-[10px] text-muted-foreground">Chat to discover PhD supervisors</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => navigate('/saved-professors')}>
              <Folder className="h-3.5 w-3.5" /> Saved
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main area with sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <ChatSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onDeleteSession={deleteSession}
          onRenameSession={updateSessionTitle}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(prev => !prev)}
        />

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="container mx-auto max-w-3xl px-4 py-6 space-y-4">
              {/* Empty state */}
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-12 space-y-6"
                >
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold font-display text-foreground">
                      Find Your PhD Supervisor
                    </h2>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Ask me about professors, research groups, or PhD opportunities at any university. I can also help with cold emails and application tips.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="text-left text-xs px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Messages */}
              {messages.map((msg, i) => {
                const professors = msg.role === 'assistant' ? parseProfessorsFromMarkdown(msg.content) : [];
                
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <GraduationCap className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card border border-border text-foreground'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <>
                          <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:mt-1 [&>ol]:mt-1 [&>table]:text-xs [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm [&_a]:text-primary">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                          {/* "Use this prompt" button for refined prompts */}
                          {!isLoading && msg.content.startsWith('[REFINED PROMPT]') && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="mt-2 h-7 text-[11px] gap-1"
                              onClick={() => {
                                const refined = msg.content.replace(/^\[REFINED PROMPT\]\s*/, '');
                                setInput(refined);
                                inputRef.current?.focus();
                              }}
                            >
                              ✨ Use this prompt
                            </Button>
                          )}
                          {!isLoading && professors.length > 0 && (
                            <MessageActions
                              professors={professors}
                              folders={folders}
                              onSaveToFolder={saveProfessor}
                              onCreateFolder={createFolder}
                              onExportCsv={handleExportCsv}
                              isAuthenticated={!!user}
                            />
                          )}
                        </>
                      ) : (
                        msg.content
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {/* Loading indicator */}
              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Searching professors...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-border bg-card/80 backdrop-blur-sm">
            <div className="container mx-auto max-w-3xl px-4 py-3">
              <form
                onSubmit={(e) => { e.preventDefault(); send(input); }}
                className="flex gap-2 items-end"
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about professors, e.g. 'Find ML supervisors at Oxford'..."
                  className="flex-1 text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-ring resize-none min-h-[40px] max-h-[120px]"
                  rows={1}
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!input.trim() || isLoading}
                  className="rounded-lg h-[40px] w-[40px]"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                AI-generated recommendations — verify through official university websites
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessorFinder;
