import React, { useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, Loader2, Globe, Home, Briefcase, DollarSign,
  Bus, HeartPulse, Users, ShieldCheck, ExternalLink, ChevronDown, Link2, CalendarCheck, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { invokeAI } from '@/lib/aiClient';
import { toast } from 'sonner';

interface CountryGuideSource {
  title: string;
  url: string;
}

interface CountryGuideInfo {
  country: string;
  flag: string;
  housing: { summary: string; options: string[]; tips: string[] };
  partTimeJobs: { summary: string; rules: string[]; commonJobs: string[]; tips: string[] };
  costOfLiving: { summary: string; breakdown: Record<string, string> };
  transport: { summary: string; options: string[] };
  healthcare: { summary: string; details: string[] };
  studentLife: { summary: string; highlights: string[] };
  safety: { summary: string; tips: string[] };
  sources?: CountryGuideSource[];
  lastVerified?: string;
}

function renderValue(val: any): string {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.map(v => typeof v === 'string' ? v : JSON.stringify(v)).join(', ');
  if (typeof val === 'object') {
    return Object.entries(val)
      .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
      .join(' • ');
  }
  return String(val);
}

const POPULAR_COUNTRIES = [
  { name: 'Germany' },
  { name: 'Finland' },
  { name: 'Sweden' },
  { name: 'Netherlands' },
  { name: 'Italy' },
  { name: 'Denmark' },
  { name: 'USA' },
  { name: 'UK' },
  { name: 'Canada' },
  { name: 'Australia' },
  { name: 'Japan' },
  { name: 'South Korea' },
];

const SECTION_CONFIG = [
  { key: 'housing' as const, icon: Home, title: 'Housing & Accommodation', listKey: 'options', tipsKey: 'tips' },
  { key: 'partTimeJobs' as const, icon: Briefcase, title: 'Part-Time Jobs', listKey: 'commonJobs', tipsKey: 'tips', extraListKey: 'rules', extraListTitle: 'Work Rules' },
  { key: 'transport' as const, icon: Bus, title: 'Transportation', listKey: 'options' },
  { key: 'healthcare' as const, icon: HeartPulse, title: 'Healthcare', listKey: 'details' },
  { key: 'studentLife' as const, icon: Users, title: 'Student Life & Community', listKey: 'highlights' },
  { key: 'safety' as const, icon: ShieldCheck, title: 'Safety Tips', listKey: 'tips' },
];

const CountryGuide: React.FC = () => {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [guideData, setGuideData] = useState<CountryGuideInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchedCountry, setSearchedCountry] = useState('');
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const searchGuide = async (country: string) => {
    if (!country.trim()) return;
    setIsLoading(true);
    setSearchedCountry(country);
    setGuideData(null);

    try {
      const { data, error } = await invokeAI({
        edgeFunctionPath: 'chat',
        body: {
          mode: 'country-guide',
          messages: [
            { role: 'user', content: `Provide a complete student living guide for ${country} for a Bangladeshi student.` },
          ],
        },
        systemPrompt: 'You are a country living guide expert. Return JSON with a "guide" object containing: country, flag, housing, partTimeJobs, costOfLiving, transport, healthcare, studentLife, safety.',
      });

      if (error) throw error;

      if (data?.guide) {
        setGuideData(data.guide);
      } else {
        toast.error('Could not retrieve country guide. Try again.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch country guide. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchGuide(searchInput);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50/50 to-background dark:from-orange-950/30 dark:via-amber-950/20 dark:to-background relative overflow-hidden">
      <div className="absolute top-10 left-10 w-64 h-64 bg-orange-400/10 dark:bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-0 w-72 h-72 bg-amber-400/10 dark:bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Country Guide</h1>
              <p className="text-sm text-muted-foreground">
                AI-powered living guide for international students
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Search */}
        <Card className="mb-8 shadow-sm">
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Enter a country name..."
                  className="pl-10"
                />
              </div>
              <Button type="submit" disabled={isLoading || !searchInput.trim()} className="px-5">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
              </Button>
            </form>


            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Popular destinations:</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_COUNTRIES.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => { setSearchInput(c.name); searchGuide(c.name); }}
                    className="text-sm font-medium px-4 py-2 rounded-lg border-2 border-primary/20 bg-primary/5 hover:bg-primary/15 hover:border-primary/40 transition-all text-foreground hover:scale-[1.04] shadow-sm hover:shadow-md"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Researching living guide for <strong className="text-foreground">{searchedCountry}</strong>...
            </p>
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {guideData && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              <h2 className="text-lg font-semibold text-foreground">
                {guideData.flag} {guideData.country} — Student Living Guide
              </h2>

              {/* Cost of Living Overview */}
              {guideData.costOfLiving && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      Cost of Living
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{renderValue(guideData.costOfLiving.summary)}</p>
                    {guideData.costOfLiving.breakdown && typeof guideData.costOfLiving.breakdown === 'object' && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {Object.entries(guideData.costOfLiving.breakdown).map(([key, val]) => (
                          <div key={key} className="p-2.5 rounded-md bg-accent/50">
                            <span className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                            <p className="text-sm font-medium text-foreground mt-0.5">{renderValue(val)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Dynamic Sections */}
              <div className="grid md:grid-cols-2 gap-4">
                {SECTION_CONFIG.map(({ key, icon: Icon, title, listKey, tipsKey, extraListKey, extraListTitle }) => {
                  const section = guideData[key];
                  if (!section) return null;
                  const items = (section as any)[listKey];
                  const tips = tipsKey ? (section as any)[tipsKey] : null;
                  const extraItems = extraListKey ? (section as any)[extraListKey] : null;

                  return (
                    <Card key={key} className="shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          {title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="text-sm text-muted-foreground">{renderValue((section as any).summary)}</p>
                        {extraItems && Array.isArray(extraItems) && extraItems.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-foreground mb-1">{extraListTitle}</p>
                            <ul className="space-y-1">
                              {extraItems.map((item: string, i: number) => (
                                <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                                  <span className="text-muted-foreground mt-0.5">•</span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {items && Array.isArray(items) && items.length > 0 && (
                          <ul className="space-y-1">
                            {items.map((item: string, i: number) => (
                              <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                                <span className="text-muted-foreground mt-0.5">•</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        )}
                        {tips && Array.isArray(tips) && tips.length > 0 && (
                          <div className="pt-1 border-t border-border">
                            <p className="text-xs font-medium text-foreground mb-1">Tips</p>
                            <ul className="space-y-1">
                              {tips.map((tip: string, i: number) => (
                                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                  <span className="mt-0.5">💡</span>
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Sources */}
              <Card className="shadow-sm">
                <CardContent className="p-4 space-y-3">
                  {guideData.lastVerified && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarCheck className="h-3.5 w-3.5" />
                        <span>
                          Last verified: <strong className="text-foreground">{new Date(guideData.lastVerified).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => searchGuide(searchedCountry)}
                        disabled={isLoading}
                      >
                        <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  )}
                  {guideData.sources && guideData.sources.length > 0 && (
                    <div>
                      <button
                        onClick={() => setSourcesOpen(prev => !prev)}
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        <span>Sources ({guideData.sources.length})</span>
                        <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform ${sourcesOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {sourcesOpen && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {guideData.sources.map((source, i) => (
                            <a
                              key={i}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border bg-card hover:bg-accent transition-colors text-foreground"
                            >
                              <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="truncate max-w-[200px]">{source.title}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!guideData && !isLoading && (
          <div className="text-center py-16">
            <Globe className="h-10 w-10 text-border mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Search for a country to get a detailed student living guide
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CountryGuide;
