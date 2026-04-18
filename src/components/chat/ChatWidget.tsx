import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, User, Loader2, Search, FileText, GraduationCap, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import { streamAI } from '@/lib/aiClient';

type Message = { role: 'user' | 'assistant'; content: string };

const SUGGESTIONS = [
  { text: 'Visa process for Denmark' },
  { text: 'Universities in Japan for CS Masters' },
  { text: 'Compare scholarships: Germany vs Sweden' },
  { text: 'Document checklist for UK student visa' },
  { text: 'Evaluate my profile: CGPA 3.5, IELTS 7.0' },
  { text: 'Countries with post-study work permits' },
];

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

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
        messages: [...messages, userMsg],
        edgeFunctionPath: 'chat',
        systemPrompt: 'You are StudyAbroad Assistant — an expert on universities, visas, scholarships, and study abroad planning. Keep answers clear and actionable.',
        onDelta: updateAssistant,
        onDone: () => setIsLoading(false),
        onError: (err) => {
          updateAssistant(assistantSoFar ? `\n\n⚠️ ${err}` : `⚠️ ${err}`);
          setIsLoading(false);
        },
      });
    } catch {
      updateAssistant('\n\nConnection error. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="h-12 w-12 rounded-lg bg-primary shadow-md hover:bg-primary/90"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] h-[540px] flex flex-col rounded-lg border border-border bg-card shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <span className="font-medium text-sm block">StudyAbroad Assistant</span>
                <span className="text-[10px] text-muted-foreground">AI Agent · Universities · Visas · Scholarships</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Capabilities */}
            <div className="flex gap-3 px-4 py-2 border-b border-border">
              {[
                { icon: Search, label: 'Universities' },
                { icon: Globe, label: 'Visas' },
                { icon: GraduationCap, label: 'Scholarships' },
                { icon: FileText, label: 'Checklists' },
              ].map((cap) => (
                <div key={cap.label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <cap.icon className="h-3 w-3" />
                  {cap.label}
                </div>
              ))}
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="space-y-4">
                  <div className="text-center space-y-1 py-2">
                    <p className="text-sm font-medium text-foreground">How can I help?</p>
                    <p className="text-xs text-muted-foreground">
                      I can research universities, explain visa processes, find scholarships, and evaluate your profile.
                    </p>
                  </div>
                  <div className="grid gap-1">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s.text}
                        onClick={() => send(s.text)}
                        className="text-left text-xs px-3 py-2 rounded-md bg-accent text-foreground hover:bg-accent/80 transition-colors"
                      >
                        {s.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="h-6 w-6 rounded-md bg-accent flex items-center justify-center flex-shrink-0 mt-1">
                      <GraduationCap className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent text-foreground'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:mt-1 [&>ol]:mt-1 [&>table]:text-xs [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="h-3 w-3 text-primary" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex gap-2">
                  <div className="h-6 w-6 rounded-md bg-accent flex items-center justify-center">
                    <GraduationCap className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="bg-accent rounded-lg px-3 py-2 flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Researching...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border">
              <form
                onSubmit={(e) => { e.preventDefault(); send(input); }}
                className="flex gap-2"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about countries, universities, visas..."
                  className="flex-1 text-sm bg-background border border-border rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-ring"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!input.trim() || isLoading}
                  className="rounded-md"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
