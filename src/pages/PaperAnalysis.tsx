import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, FileText, Loader2, User, Link, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import ReactMarkdown from 'react-markdown';
import { usePaperChatPersistence } from '@/hooks/usePaperChatPersistence';
import { ChatSidebar } from '@/components/professors/ChatSidebar';
import { streamAI } from '@/lib/aiClient';

type Message = { role: 'user' | 'assistant'; content: string };

const SUGGESTIONS = [
  { text: 'Analyze this paper: "Attention Is All You Need" — transformer architecture for NLP' },
  { text: 'I have a paper on federated learning for healthcare. Which universities have research groups in this area?' },
  { text: 'My thesis is about reinforcement learning in robotics. What PhD positions and scholarships are available?' },
  { text: 'Analyze research opportunities for computer vision and autonomous driving' },
];

const PaperAnalysis: React.FC = () => {
  const navigate = useNavigate();
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
  } = usePaperChatPersistence();

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
        edgeFunctionPath: 'paper-analysis',
        systemPrompt: 'You are a research paper analysis assistant. Analyze papers, identify research themes, and recommend universities, professors, and scholarships aligned with the research.',
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

  const handleNewChat = async () => {
    const id = await createSession();
    setActiveSessionId(id);
    setMessages([]);
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50/50 to-background dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-background relative flex flex-col overflow-hidden">
      <div className="absolute top-10 left-0 w-64 h-64 bg-emerald-400/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-72 h-72 bg-teal-400/10 dark:bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
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
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-bold font-display text-foreground">Research Paper Analysis</h1>
                <p className="text-[10px] text-muted-foreground">AI-powered paper analysis & university matching</p>
              </div>
            </div>
          </div>
          <ThemeToggle />
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
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
                    <BookOpen className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center space-y-2">
                    <h2 className="text-xl font-semibold">Research Paper Analysis</h2>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                      Share your research paper links, titles, or abstracts. I'll analyze them and recommend universities,
                      professors, and scholarships aligned with your research.
                    </p>
                  </div>

                  <div className="grid gap-2 max-w-lg mx-auto">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s.text}
                        onClick={() => send(s.text)}
                        className="text-left text-sm px-4 py-3 rounded-lg bg-accent text-foreground hover:bg-accent/80 transition-colors"
                      >
                        {s.text}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-4">
                    <div className="flex items-center gap-1"><Link className="h-3 w-3" /> Paste paper links</div>
                    <div className="flex items-center gap-1"><FileText className="h-3 w-3" /> Describe your research</div>
                    <div className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> Get recommendations</div>
                  </div>
                </motion.div>
              )}

              {/* Messages */}
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <FileText className="h-4 w-4 text-primary" />
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
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:mt-1 [&>ol]:mt-1 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
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
              ))}

              {/* Loading indicator */}
              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Analyzing research...</span>
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
                  placeholder="Paste a paper link, title, or describe your research area..."
                  className="flex-1 text-sm bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:ring-1 focus:ring-ring resize-none min-h-[40px] max-h-[120px]"
                  disabled={isLoading}
                  rows={1}
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

export default PaperAnalysis;
