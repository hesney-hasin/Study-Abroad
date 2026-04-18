import React, { useState, useRef, useEffect } from 'react';
import { StudentProfile } from '@/types';
import { countries } from '@/data/countries';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Sparkles, Loader2, Send, X, Bot, User, MessageCircle } from 'lucide-react';
import { invokeAI, streamAI } from '@/lib/aiClient';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface CountryFormProps {
  data: Partial<StudentProfile>;
  onChange: (data: Partial<StudentProfile>) => void;
}

interface CountrySuggestion {
  countryId: string;
  rank: number;
  reason: string;
  fitScore: 'excellent' | 'good' | 'moderate' | 'weak';
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const fitScoreColors: Record<string, string> = {
  excellent: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30',
  good: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  moderate: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  weak: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
};

const ALL_COUNTRY_IDS = countries.map(c => c.id);

const getCountryName = (id: string) => countries.find(c => c.id === id)?.name || id;
const getCountryFlag = (id: string) => countries.find(c => c.id === id)?.flagEmoji || '🌍';

export const CountryForm: React.FC<CountryFormProps> = ({ data, onChange }) => {
  const [suggestions, setSuggestions] = useState<CountrySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, streamingContent]);

  const profileSummary = `Degree: ${data.degreeLevel || 'masters'}, Major: ${data.major || 'N/A'}, CGPA: ${data.cgpa || 'N/A'}/${data.cgpaScale || 4}, Budget: $${data.budgetMin || 0}-$${data.budgetMax || 0}/yr, IELTS: ${data.ielts || 'N/A'}, TOEFL: ${data.toefl || 'N/A'}, GRE: ${data.gre ? 'Yes' : 'No'}, Research: ${data.hasResearchExperience ? 'Yes' : 'No'}`;

  const handleGetSuggestions = async () => {
    setLoading(true);
    try {
      const parts = [`Suggest the best study abroad countries for my profile.`];
      parts.push(`Degree Level: ${data.degreeLevel || 'masters'}`);
      if (data.major) parts.push(`Major: ${data.major}`);
      if (data.cgpa != null && data.cgpa > 0) parts.push(`CGPA: ${data.cgpa} out of ${data.cgpaScale || 4}`);
      if (data.budgetMin || data.budgetMax) parts.push(`Budget: $${data.budgetMin || 0}-$${data.budgetMax || 0}/year`);
      if (data.ielts) parts.push(`IELTS: ${data.ielts}`);
      if (data.toefl) parts.push(`TOEFL: ${data.toefl}`);
      if (data.gre) parts.push(`GRE: Verbal ${data.gre.verbal}, Quant ${data.gre.quantitative}, Writing ${data.gre.writing}`);
      if (data.extracurriculars) parts.push(`Extracurriculars: ${data.extracurriculars}`);
      if (data.hasWorkExperience) parts.push(`Has work experience`);
      if (data.internshipDetails) parts.push(`Internships: ${data.internshipDetails}`);
      if (data.workExperienceYears && data.workExperienceYears > 0) parts.push(`Work experience: ${data.workExperienceYears} years`);
      if (data.hasResearchExperience) parts.push(`Has research experience`);
      if (data.publicationsCount && data.publicationsCount > 0) parts.push(`Publications: ${data.publicationsCount}`);
      if (data.researchPaperCount && data.researchPaperCount > 0) parts.push(`Research papers: ${data.researchPaperCount}`);
      if (data.researchPapers) parts.push(`Paper details: ${data.researchPapers}`);
      if (data.programPreference) parts.push(`Preferred specialization: ${data.programPreference}`);
      
      const profileText = parts.join('\n');
      const { data: result, error } = await invokeAI({
        edgeFunctionPath: 'chat',
        body: {
          messages: [{ role: 'user', content: profileText }],
          mode: 'suggest-countries',
        },
      });

      if (error) throw error;

      if (result?.suggestions?.length) {
        const sorted = result.suggestions.sort((a: CountrySuggestion, b: CountrySuggestion) => a.rank - b.rank);
        setSuggestions(sorted);

        const recommended = sorted
          .filter((s: CountrySuggestion) => s.fitScore === 'excellent' || s.fitScore === 'good')
          .map((s: CountrySuggestion) => s.countryId);
        if (recommended.length > 0) {
          onChange({ ...data, preferredCountries: recommended });
        }
        toast.success('AI suggestions ready!');
      } else {
        toast.error('Could not generate suggestions. Try again.');
      }
    } catch (err) {
      console.error('Suggestion error:', err);
      toast.error('Failed to get AI suggestions');
    } finally {
      setLoading(false);
    }
  };

  const toggleCountry = (countryId: string) => {
    const current = data.preferredCountries || [];
    if (current.includes(countryId)) {
      onChange({ ...data, preferredCountries: current.filter(c => c !== countryId) });
    } else if (current.length >= 3) {
      toast.error("Please select up to 3 countries to evaluate.");
      return;
    } else {
      onChange({ ...data, preferredCountries: [...current, countryId] });
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: userMsg }];
    setChatMessages(newMessages);
    setChatLoading(true);
    setStreamingContent('');

    try {
      const systemContext = `You are a study abroad country advisor. The student's profile: ${profileSummary}. 
Currently selected countries: ${(data.preferredCountries || []).map(id => getCountryName(id)).join(', ') || 'None'}.
Available countries: ${countries.map(c => c.name).join(', ')}.

Help them choose the best countries. When suggesting countries, use their exact IDs from this list: ${ALL_COUNTRY_IDS.join(', ')}.
If the student wants to add/remove countries, tell them which ones and they can click to toggle. Keep responses concise and helpful.`;

      const apiMessages = [
        { role: 'system', content: systemContext },
        ...newMessages.map((m) => ({ role: m.role, content: m.content })),
      ];

      let fullContent = '';
      await new Promise<void>((resolve) => {
        streamAI({
          messages: apiMessages as { role: 'user' | 'assistant' | 'system'; content: string }[],
          edgeFunctionPath: 'chat',
          mode: 'advisor',
          onDelta: (chunk) => {
            fullContent += chunk;
            setStreamingContent(fullContent);
          },
          onDone: () => resolve(),
          onError: (err) => {
            if (!fullContent) {
              fullContent = `Sorry, I had trouble responding: ${err}`;
            }
            resolve();
          },
        });
      });

      setChatMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: fullContent || 'Sorry, I had trouble responding. Please try again.',
        },
      ]);
    } catch (err) {
      console.error('Chat error:', err);
      setChatMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: 'Sorry, I had trouble responding. Please try again.',
        },
      ]);
    } finally {
      setChatLoading(false);
      setStreamingContent('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Section header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-full bg-emerald-500/10">
          <Globe className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Destinations</h3>
          <p className="text-xs text-muted-foreground">Choose your preferred countries to study abroad</p>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
        <Sparkles className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">AI-Powered Country Selection</p>
          <p className="text-xs text-muted-foreground mt-1">
            Get AI recommendations based on your profile, then chat to refine. We cover 25+ global destinations.
          </p>
        </div>
      </div>

      {/* AI Suggestion Button */}
      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          onClick={handleGetSuggestions}
          disabled={loading || !data.degreeLevel}
          className="gap-2 border-primary/30 hover:bg-primary/10"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing your profile...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-primary" />
              {suggestions.length > 0 ? 'Re-analyze with AI' : 'Get AI Recommendations'}
            </>
          )}
        </Button>
      </div>

      {/* AI Suggestions */}
      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Recommendations — click to select/deselect
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {suggestions.map((s, i) => {
                const isSelected = (data.preferredCountries || []).includes(s.countryId);
                return (
                  <motion.div
                    key={s.countryId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-primary/10 border-primary shadow-sm'
                        : 'bg-card border-border hover:border-primary/40'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedCard(expandedCard === s.countryId ? null : s.countryId)}
                      className="flex items-start gap-3 p-3 w-full text-left"
                    >
                      <span className="text-xl">{getCountryFlag(s.countryId)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-sm">{getCountryName(s.countryId)}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${fitScoreColors[s.fitScore]}`}>
                            {s.fitScore}
                          </span>
                        </div>
                        <p className={`text-[11px] text-muted-foreground leading-snug ${expandedCard === s.countryId ? '' : 'line-clamp-2'}`}>
                          {s.reason
                            .replace(/\*\*/g, '')
                            .replace(/\*([^*]+)\*/g, '$1')
                            .replace(/^\s*\*\s+/gm, '')
                            .replace(/\s\*\s/g, ' ')
                            .replace(/\(Country ID:\s*\w+\)/gi, '')
                            .replace(/Country ID:\s*\w+/gi, '')
                            .replace(/\(\w+\):\s*/gi, '')
                            .replace(/\bRationale:\s*/gi, '')
                            .replace(/\s{2,}/g, ' ')
                            .trim()}
                        </p>
                      </div>
                    </button>
                    {expandedCard === s.countryId && (
                      <div className="px-3 pb-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => toggleCountry(s.countryId)}
                          className={`text-xs px-3 py-1 rounded-full transition-colors ${
                            isSelected
                              ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                              : 'bg-primary/10 text-primary hover:bg-primary/20'
                          }`}
                        >
                          {isSelected ? 'Deselect' : 'Select'}
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected countries display */}
      {(data.preferredCountries?.length || 0) > 0 && (
        <div className="flex flex-wrap gap-2">
          <Label className="text-xs text-muted-foreground w-full mb-1">Selected ({data.preferredCountries?.length}):</Label>
          {data.preferredCountries?.map(id => (
            <button
              type="button"
              key={id}
              onClick={() => toggleCountry(id)}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors"
            >
              {getCountryFlag(id)} {getCountryName(id)}
              <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}

      {/* AI Chat for refinement */}
      <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
        <div className="px-4 py-3 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
            <MessageCircle className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <span className="text-sm font-semibold text-foreground">Country Advisor</span>
            <span className="text-[10px] text-muted-foreground ml-2">AI Agent • Tool-calling • Real-time search</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-muted-foreground">Online</span>
          </div>
        </div>

        <div className="h-64 overflow-y-auto p-4 space-y-4 bg-muted/20">
          {chatMessages.length === 0 && !streamingContent && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full gap-4 py-4"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center max-w-sm">
                <p className="text-sm font-medium text-foreground mb-1">Ask me about any country</p>
                <p className="text-xs text-muted-foreground">
                  I can compare countries, find scholarships, check tuition fees, and help you pick the best destinations.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  '🆓 Free tuition countries?',
                  '🎓 Best for PhD in CS?',
                  '💰 Cheapest living costs?',
                  '📊 Compare Norway vs Denmark',
                ].map(q => (
                  <button
                    type="button"
                    key={q}
                    onClick={() => { setChatInput(q); }}
                    className="text-xs px-3 py-1.5 rounded-full border border-primary/20 bg-background hover:bg-primary/5 hover:border-primary/40 transition-all text-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {chatMessages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-card border border-border shadow-sm rounded-bl-md'
              }`}>
                {msg.role === 'assistant' ? (
                  <div className="text-xs leading-relaxed prose prose-sm prose-neutral dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_table]:text-[10px] [&_strong]:text-foreground">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-xs leading-relaxed">{msg.content}</p>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          ))}

          {streamingContent && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5 justify-start">
              <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-bl-md px-3.5 py-2.5 bg-card border border-border shadow-sm">
                <div className="text-xs leading-relaxed prose prose-sm prose-neutral dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_strong]:text-foreground">
                  <ReactMarkdown>{streamingContent}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          )}

          {chatLoading && !streamingContent && (
            <div className="flex gap-2.5 items-start">
              <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); handleChatSend(); }}
          className="border-t border-border flex items-center gap-2 px-3 py-2.5 bg-background"
        >
          <Input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask about countries, scholarships, tuition..."
            className="text-sm h-9 border-0 shadow-none focus-visible:ring-0 bg-transparent"
            disabled={chatLoading}
          />
          <Button
            type="submit"
            size="sm"
            disabled={!chatInput.trim() || chatLoading}
            className="h-8 w-8 p-0 rounded-full"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      </div>
    </motion.div>
  );
};