import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, GraduationCap, Award, BookOpen, Globe, Beaker, Building2, X, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { University, UniversityFilters } from '@/types/university';
import { searchUniversities } from '@/lib/api/universitySearch';
import { UniversityCard } from '@/components/universities/UniversityCard';
import { toast } from 'sonner';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Globe },
  { id: 'bachelor', label: 'Bachelor', icon: BookOpen },
  { id: 'masters', label: 'Masters', icon: GraduationCap },
  { id: 'phd', label: 'PhD', icon: Beaker },
  { id: 'scholarships', label: 'Scholarships', icon: Award },
  { id: 'public', label: 'Public', icon: Building2 },
  { id: 'english', label: 'English Taught', icon: Globe },
  { id: 'research', label: 'Research', icon: Beaker },
];

const COUNTRIES = [
  { value: 'all', label: 'All Countries' },
  { value: 'Germany', label: '🇩🇪 Germany' },
  { value: 'Finland', label: '🇫🇮 Finland' },
  { value: 'Sweden', label: '🇸🇪 Sweden' },
  { value: 'Netherlands', label: '🇳🇱 Netherlands' },
  { value: 'Italy', label: '🇮🇹 Italy' },
  { value: 'France', label: '🇫🇷 France' },
  { value: 'Spain', label: '🇪🇸 Spain' },
  { value: 'Denmark', label: '🇩🇰 Denmark' },
  { value: 'Norway', label: '🇳🇴 Norway' },
  { value: 'Austria', label: '🇦🇹 Austria' },
  { value: 'Switzerland', label: '🇨🇭 Switzerland' },
  { value: 'Belgium', label: '🇧🇪 Belgium' },
  { value: 'Ireland', label: '🇮🇪 Ireland' },
  { value: 'Poland', label: '🇵🇱 Poland' },
  { value: 'Czech Republic', label: '🇨🇿 Czech Republic' },
  { value: 'Portugal', label: '🇵🇹 Portugal' },
  { value: 'Hungary', label: '🇭🇺 Hungary' },
  { value: 'USA', label: '🇺🇸 USA' },
  { value: 'UK', label: '🇬🇧 UK' },
  { value: 'Canada', label: '🇨🇦 Canada' },
  { value: 'Australia', label: '🇦🇺 Australia' },
  { value: 'Japan', label: '🇯🇵 Japan' },
  { value: 'South Korea', label: '🇰🇷 South Korea' },
];

const LANGUAGES = [
  { value: 'all', label: 'All Languages' },
  { value: 'English', label: 'English' },
  { value: 'German', label: 'German' },
  { value: 'French', label: 'French' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'Swedish', label: 'Swedish' },
  { value: 'Dutch', label: 'Dutch' },
  { value: 'Italian', label: 'Italian' },
  { value: 'Finnish', label: 'Finnish' },
  { value: 'Danish', label: 'Danish' },
  { value: 'Norwegian', label: 'Norwegian' },
  { value: 'Portuguese', label: 'Portuguese' },
  { value: 'Polish', label: 'Polish' },
  { value: 'Czech', label: 'Czech' },
  { value: 'Hungarian', label: 'Hungarian' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'Korean', label: 'Korean' },
];

const Universities: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [universities, setUniversities] = useState<University[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState<UniversityFilters>({});
  const [tuitionRange, setTuitionRange] = useState([50000]);

  const doSearch = useCallback(async (searchQuery: string, searchFilters: UniversityFilters) => {
    setIsLoading(true);
    setHasSearched(true);
    try {
      const results = await searchUniversities(searchQuery, searchFilters);
      setUniversities(results);
    } catch (err) {
      console.error(err);
      toast.error('Failed to search universities. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // No auto-search on load — wait for user to search

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const searchFilters: UniversityFilters = { ...filters };
    if (activeCategory !== 'all') searchFilters.category = activeCategory;
    if (tuitionRange[0] < 50000) searchFilters.tuitionMax = tuitionRange[0];
    doSearch(query, searchFilters);
  };

  const handleCategoryClick = (catId: string) => {
    setActiveCategory(catId);
    const searchFilters: UniversityFilters = { ...filters };
    if (catId !== 'all') searchFilters.category = catId;
    if (tuitionRange[0] < 50000) searchFilters.tuitionMax = tuitionRange[0];
    doSearch(query, searchFilters);
  };

  const handleFilterChange = (key: keyof UniversityFilters, value: string) => {
    const newFilters = { ...filters };
    if (value === 'all' || value === '') {
      delete newFilters[key];
    } else {
      (newFilters as Record<string, string | number>)[key] = value;
    }
    setFilters(newFilters);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <GraduationCap className="h-7 w-7 text-primary" />
            <span className="text-lg font-bold text-foreground">StudyAbroad</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <span className="text-primary font-medium cursor-pointer">Universities</span>
            <span className="text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => navigate('/evaluate')}>Evaluator</span>
            <span className="text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => navigate('/visa')}>Visa Guide</span>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>Sign In</Button>
            <Button size="sm" onClick={() => navigate('/evaluate')}>
              <Sparkles className="h-4 w-4 mr-1" /> Evaluate
            </Button>
          </div>
        </div>
      </header>

      {/* Category tabs */}
      <div className="bg-card border-b border-border overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 py-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                }`}
              >
                <cat.icon className="h-5 w-5" />
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="bg-card/50 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search universities, cities, countries..."
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="md:hidden"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </form>
          {hasSearched && !isLoading && (
            <p className="text-xs text-muted-foreground mt-2">
              <span className="font-semibold text-foreground">{universities.length}</span> universities found
              <span className="ml-2 text-primary">• AI-powered results</span>
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Filters sidebar */}
          <AnimatePresence>
            {showFilters && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 260, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="hidden md:block flex-shrink-0 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-foreground">Filters</h3>
                  <button onClick={() => { setFilters({}); setTuitionRange([50000]); }} className="text-xs text-primary hover:underline">
                    Clear all
                  </button>
                </div>

                {/* Country */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                    <Globe className="h-3.5 w-3.5" /> COUNTRY
                  </label>
                  <Select value={filters.country || 'all'} onValueChange={(v) => handleFilterChange('country', v)}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tuition */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    TUITION FEES (€/year)
                  </label>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>€0</span>
                    <span className="font-medium text-foreground">
                      {tuitionRange[0] >= 50000 ? 'Any' : `≤ €${tuitionRange[0].toLocaleString()}`}
                    </span>
                  </div>
                  <Slider
                    value={tuitionRange}
                    onValueChange={setTuitionRange}
                    max={50000}
                    step={1000}
                    className="w-full"
                  />
                </div>

                {/* Degree Level */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                    <GraduationCap className="h-3.5 w-3.5" /> DEGREE LEVEL
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Bachelor', 'Masters', 'PhD'].map((d) => (
                      <Badge
                        key={d}
                        variant={filters.degreeLevel === d ? 'default' : 'outline'}
                        className="cursor-pointer text-xs"
                        onClick={() => handleFilterChange('degreeLevel', filters.degreeLevel === d ? 'all' : d)}
                      >
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                    <BookOpen className="h-3.5 w-3.5" /> TEACHING LANGUAGE
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {LANGUAGES.slice(1).map((l) => (
                      <Badge
                        key={l.value}
                        variant={filters.language === l.value ? 'default' : 'outline'}
                        className="cursor-pointer text-xs"
                        onClick={() => handleFilterChange('language', filters.language === l.value ? 'all' : l.value)}
                      >
                        {l.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Program Field */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                    <Beaker className="h-3.5 w-3.5" /> PROGRAM / FIELD
                  </label>
                  <Input
                    placeholder="e.g. Computer Science"
                    value={filters.field || ''}
                    onChange={(e) => handleFilterChange('field', e.target.value || 'all')}
                    className="text-sm"
                  />
                </div>

                <Button onClick={handleSearch} className="w-full" size="sm">
                  Apply Filters
                </Button>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Results grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">AI is searching universities for you...</p>
              </div>
            ) : universities.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {universities.map((uni, i) => (
                  <motion.div
                    key={uni.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <UniversityCard
                      university={uni}
                      onClick={() => navigate(`/university/${uni.id}`, { state: { university: uni } })}
                    />
                  </motion.div>
                ))}
              </div>
            ) : hasSearched ? (
              <div className="text-center py-20">
                <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No universities found. Try different search terms or filters.</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Universities;
