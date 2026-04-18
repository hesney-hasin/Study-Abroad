import React, { useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, FileText, Clock, DollarSign, AlertTriangle, ExternalLink, CheckCircle2, Loader2, Globe, Briefcase, Heart, Building, Link2, CalendarCheck, RefreshCw, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VisaSource {
  title: string;
  url: string;
}

interface VisaInfo {
  country: string;
  flag: string;
  visaType: string;
  processingTime: string;
  cost: string | Record<string, any>;
  financialProof: string | Record<string, any>;
  steps: string[];
  documents: string[];
  tips: string[];
  officialLink: string;
  postStudyWorkPermit?: string;
  healthInsurance?: string;
  embassyInfo?: string;
  sources?: VisaSource[];
  lastVerified?: string;
}

// Safely render a value that might be an object/array from Gemini
function renderValue(val: any): string {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.map(v => typeof v === 'string' ? v : JSON.stringify(v)).join(', ');
  if (typeof val === 'object') {
    return Object.entries(val)
      .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : Array.isArray(v) ? v.join(', ') : JSON.stringify(v)}`)
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

const VisaGuide: React.FC = () => {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [visaData, setVisaData] = useState<VisaInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchedCountry, setSearchedCountry] = useState('');
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const searchVisa = async (country: string) => {
    if (!country.trim()) return;
    setIsLoading(true);
    setSearchedCountry(country);
    setVisaData(null);

    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          mode: 'visa',
          messages: [
            { role: 'user', content: `Provide complete student visa information for ${country} for a Bangladeshi student.` },
          ],
        },
      });

      if (error) throw error;

      if (data?.visa) {
        setVisaData(data.visa);
      } else {
        toast.error('Could not retrieve visa information. Try again.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch visa info. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchVisa(searchInput);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/50 to-background dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-background relative overflow-hidden">
      <div className="absolute top-20 right-10 w-72 h-72 bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-40 left-0 w-56 h-56 bg-indigo-400/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Visa Guide</h1>
              <p className="text-sm text-muted-foreground">
                AI-powered visa guidance for Bangladeshi students
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
                    onClick={() => { setSearchInput(c.name); searchVisa(c.name); }}
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
              Researching visa requirements for <strong className="text-foreground">{searchedCountry}</strong>...
            </p>
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {visaData && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              <h2 className="text-lg font-semibold text-foreground">
                {visaData.country} — Student Visa Guide
              </h2>

              {/* Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: FileText, label: 'Visa Type', value: renderValue(visaData.visaType) },
                  { icon: Clock, label: 'Processing', value: renderValue(visaData.processingTime) },
                  { icon: DollarSign, label: 'Fee', value: renderValue(visaData.cost) },
                  { icon: AlertTriangle, label: 'Financial Proof', value: renderValue(visaData.financialProof) },
                ].map((item) => (
                  <Card key={item.label} className="shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground">{item.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Steps */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Step-by-Step Process
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2.5">
                    {visaData.steps.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="flex-shrink-0 h-5 w-5 rounded-md bg-accent text-muted-foreground text-xs font-medium flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-sm text-foreground leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              {/* Documents */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Required Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="grid md:grid-cols-2 gap-2">
                    {visaData.documents.map((doc, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success flex-shrink-0 mt-0.5" />
                        {doc}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Additional info */}
              <div className="grid md:grid-cols-2 gap-3">
                {visaData.postStudyWorkPermit && (
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                        Post-Study Work Permit
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground leading-relaxed">{visaData.postStudyWorkPermit}</p>
                    </CardContent>
                  </Card>
                )}
                {visaData.healthInsurance && (
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        <Heart className="h-3.5 w-3.5 text-muted-foreground" />
                        Health Insurance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground leading-relaxed">{visaData.healthInsurance}</p>
                    </CardContent>
                  </Card>
                )}
                {visaData.embassyInfo && (
                  <Card className="md:col-span-2 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        <Building className="h-3.5 w-3.5 text-muted-foreground" />
                        Embassy / Consulate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-foreground leading-relaxed">{visaData.embassyInfo}</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Tips */}
              <Card className="border-warning/20 bg-warning/3 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Important Tips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {visaData.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground leading-relaxed">
                        <span className="text-xs text-muted-foreground font-medium mt-0.5 flex-shrink-0">{i + 1}.</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Sources */}
              <Card className="shadow-sm">
                <CardContent className="p-4 space-y-3">
                  {visaData.lastVerified && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarCheck className="h-3.5 w-3.5" />
                        <span>
                          Last verified: <strong className="text-foreground">{new Date(visaData.lastVerified).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => searchVisa(searchedCountry)}
                        disabled={isLoading}
                      >
                        <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  )}
                  {visaData.sources && visaData.sources.length > 0 && (
                    <div>
                      <button
                        onClick={() => setSourcesOpen(prev => !prev)}
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        <span>Sources ({visaData.sources.length})</span>
                        <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform ${sourcesOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {sourcesOpen && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {visaData.sources.map((source, i) => (
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

              {/* Official link */}
              {visaData.officialLink && visaData.officialLink.startsWith('http') && (
                <div className="text-center">
                  <a href={visaData.officialLink} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-2 text-sm">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Official Visa Portal
                    </Button>
                  </a>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!visaData && !isLoading && (
          <div className="text-center py-16">
            <Globe className="h-10 w-10 text-border mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Search for a country to get detailed visa guidance
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisaGuide;
