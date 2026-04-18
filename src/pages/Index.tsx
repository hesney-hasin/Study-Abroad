import React, { useState, useEffect, useRef } from 'react';
import heroBg from '@/assets/hero-bg.png';
import { useNavigate } from 'react-router-dom';
import { StudentProfile, EvaluationResult } from '@/types';
import { ProfileWizard, ProfileWizardRef } from '@/components/wizard/ProfileWizard';
import { ResultsDashboard } from '@/components/results/ResultsDashboard';
import { invokeAI } from '@/lib/aiClient';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, LogIn, LogOut, User, Folder, Trash2, Clock, ArrowRight, ChevronRight, ChevronLeft, UserRound, Globe, Award, BarChart3, BookOpen, DollarSign, Search, FileText, Map } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { useSavedEvaluations, SavedEvaluation } from '@/hooks/useSavedEvaluations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { AnimatedCounter } from '@/components/landing/AnimatedCounter';
import { InteractiveFeatureCard } from '@/components/landing/InteractiveFeatureCard';
import { MiniDemoPreview } from '@/components/landing/MiniDemoPreview';

import { countries } from '@/data/countries';
import { scholarships } from '@/data/scholarships';

type AppState = 'landing' | 'wizard' | 'results' | 'evaluating';

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const { evaluations, fetchEvaluations, saveEvaluation, deleteEvaluation, loading: evalLoading } = useSavedEvaluations();
  
  const [appState, setAppState] = useState<AppState>('landing');
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [currentProfile, setCurrentProfile] = useState<StudentProfile | null>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [evalToDelete, setEvalToDelete] = useState<string | null>(null);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchEvaluations();
    }
  }, [user, fetchEvaluations]);

  const handleWizardComplete = async (profile: StudentProfile) => {
    setCurrentProfile(profile);
    setAppState('evaluating');
    setEvaluationError(null);

    try {
      const { data, error } = await invokeAI({
        edgeFunctionPath: 'evaluate-countries',
        body: {
          profile,
          countries: profile.preferredCountries.length > 0
            ? profile.preferredCountries
            : ['germany', 'canada', 'usa', 'australia', 'uk']
        },
        systemPrompt: 'You are a country evaluation engine for study abroad. Evaluate the given countries for the student profile and return detailed JSON results.',
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const evaluationResult: EvaluationResult = {
        ...data,
        timestamp: new Date(data.timestamp),
      };

      setResult(evaluationResult);
      setAppState('results');

      if (user) {
        const timestamp = new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        await saveEvaluation(`Evaluation - ${timestamp}`, profile, evaluationResult);
      }
    } catch (err: any) {
      console.error('Evaluation failed:', err);
      setEvaluationError(err.message || 'Failed to evaluate countries. Please try again.');
      toast.error(err.message || 'Evaluation failed. Please try again.');
      setAppState('wizard');
    }
  };

  const handleResultsBack = () => {
    setAppState('wizard');
  };

  const handleReset = () => {
    setResult(null);
    setCurrentProfile(null);
    setWizardStep(0);
    setAppState('landing');
  };

  const wizardRef = useRef<ProfileWizardRef>(null);

  const handleStart = () => {
    setWizardStep(0);
    setAppState('wizard');
  };

  const handleLoadEvaluation = (saved: SavedEvaluation) => {
    setResult(saved.result_data);
    setCurrentProfile(saved.profile_data);
    setWizardStep(3);
    setAppState('results');
    toast.success(`Loaded: ${saved.name}`);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEvalToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (evalToDelete) {
      await deleteEvaluation(evalToDelete);
      setEvalToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      {appState === 'landing' && (
        <header className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <GraduationCap className="w-4.5 h-4.5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-base cursor-pointer text-white" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }} onClick={() => navigate('/')}>
                StudyAbroad
              </span>
            </div>
            
            <ThemeToggle />
            {authLoading ? (
              <div className="w-8 h-8 rounded-md bg-accent animate-pulse" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 h-9">
                    <User className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-sm">{user.email?.split('@')[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    {user.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="w-3.5 h-3.5 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button size="sm" onClick={() => navigate('/auth')} className="gap-2 h-9 bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90 text-white border-0 shadow-md hover:shadow-lg transition-all hover:scale-[1.02]">
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
              </Button>
            )}
          </div>
        </header>
      )}


      <AnimatePresence mode="wait">
        {appState === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col pt-14 relative"
          >
            {/* Full-page background image */}
            <div className="absolute inset-0">
              <img src={heroBg} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 dark:bg-black/60" />
            </div>

            {/* Hero */}
            <div className="flex items-center justify-center px-4 py-10 relative overflow-hidden">
              <div className="max-w-2xl mx-auto text-center relative">

                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="inline-block px-3 py-1 rounded-md bg-white/20 text-white text-xs font-medium tracking-wide uppercase mb-6"
                >
                  For Bangladeshi Students
                </motion.p>

                <motion.h1
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-3xl sm:text-4xl md:text-6xl font-extrabold mb-4 leading-[1.15] text-white"
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
                >
                  Evaluate your study abroad feasibility
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-base sm:text-lg text-white/90 max-w-lg mx-auto mb-8 leading-relaxed"
                  style={{ textShadow: '0 2px 6px rgba(0,0,0,0.4)' }}
                >
                  Get a data-driven assessment of your eligibility, costs, and scholarship opportunities across European universities.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="flex flex-col items-center gap-3 justify-center w-full max-w-xl mx-auto"
                >
                  {/* Primary CTA */}
                  <Button
                    onClick={handleStart}
                    size="lg"
                    className="gap-2 px-10 h-14 text-base font-bold shadow-xl w-full sm:w-auto bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90 transition-all hover:scale-[1.04] hover:shadow-2xl ring-2 ring-white/30 text-white"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Start Evaluation
                  </Button>

                  {/* Navigation Buttons */}
                  <div className="grid grid-cols-4 gap-2 w-full">
                    <Button
                      onClick={() => navigate('/visa')}
                      className="gap-1.5 h-10 text-xs sm:text-sm border-2 border-primary bg-primary text-white hover:bg-primary/90 shadow-lg transition-all hover:scale-[1.03]"
                    >
                      <Globe className="w-4 h-4" />
                      <span className="hidden sm:inline">Visa Guide</span>
                    </Button>
                    <Button
                      onClick={() => navigate('/country-guide')}
                      className="gap-1.5 h-10 text-xs sm:text-sm border-2 border-orange-500 bg-orange-500 text-white hover:bg-orange-500/90 shadow-lg transition-all hover:scale-[1.03]"
                    >
                      <Map className="w-4 h-4" />
                      <span className="hidden sm:inline">Country Guide</span>
                    </Button>
                    <Button
                      onClick={() => navigate('/professors')}
                      className="gap-1.5 h-10 text-xs sm:text-sm border-2 border-violet-500 bg-violet-500 text-white hover:bg-violet-500/90 shadow-lg transition-all hover:scale-[1.03]"
                    >
                      <UserRound className="w-4 h-4" />
                      <span className="hidden sm:inline">Professors</span>
                    </Button>
                    <Button
                      onClick={() => navigate('/paper-analysis')}
                      className="gap-1.5 h-10 text-xs sm:text-sm border-2 border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-500/90 shadow-lg transition-all hover:scale-[1.03]"
                    >
                      <FileText className="w-4 h-4" />
                      <span className="hidden sm:inline">Paper Analysis</span>
                    </Button>
                  </div>
                </motion.div>

                {/* Saved Evaluations */}
                {user && evaluations.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-10"
                  >
                    <Card className="max-w-md mx-auto text-left shadow-sm">
                      <CardHeader className="pb-3 px-4 pt-4">
                        <CardTitle className="text-sm flex items-center gap-2 font-medium" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          <Folder className="w-4 h-4 text-muted-foreground" />
                          Saved Evaluations
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1 max-h-48 overflow-y-auto px-4 pb-4">
                        {evaluations.slice(0, 5).map((saved) => (
                          <div
                            key={saved.id}
                            onClick={() => handleLoadEvaluation(saved)}
                            className="flex items-center justify-between p-2.5 rounded-md hover:bg-accent cursor-pointer transition-colors group"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{saved.name}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                {new Date(saved.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                              onClick={(e) => handleDeleteClick(saved.id, e)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                        {evaluations.length > 5 && (
                          <p className="text-xs text-muted-foreground text-center pt-2">
                            +{evaluations.length - 5} more
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Stats Counter Section */}
            <div className="px-4 pb-12">
              <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
                <AnimatedCounter end={countries.length} suffix="+" label="Global Destinations" icon={<Globe className="w-5 h-5 text-primary" />} />
                <AnimatedCounter end={scholarships.length} suffix="+" label="Scholarships" icon={<Award className="w-5 h-5 text-primary" />} />
                <AnimatedCounter end={6} label="Analysis Engines" icon={<BarChart3 className="w-5 h-5 text-primary" />} />
                <AnimatedCounter end={100} suffix="%" label="Free to Use" icon={<DollarSign className="w-5 h-5 text-primary" />} />
              </div>
            </div>

            {/* Interactive Feature Cards */}
            <div className="px-4 pb-12">
              <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
                <InteractiveFeatureCard
                  title="Academic Match"
                  desc="CGPA and test score eligibility analysis across institutions"
                  icon={BookOpen}
                  index={0}
                  accentColor="blue"
                  preview={
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Min CGPA</span>
                        <span className="font-medium text-foreground">2.5 – 3.5</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">IELTS Range</span>
                        <span className="font-medium text-foreground">6.0 – 7.0</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">GRE Required</span>
                        <span className="font-medium text-foreground">Varies</span>
                      </div>
                    </div>
                  }
                />
                <InteractiveFeatureCard
                  title="Cost Breakdown"
                  desc="Tuition, living expenses, and budget feasibility comparison"
                  icon={DollarSign}
                  index={1}
                  accentColor="amber"
                  preview={
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Tuition</span>
                        <span className="font-medium text-foreground">€0 – €15k/yr</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Living Cost</span>
                        <span className="font-medium text-foreground">€600 – €1.5k/mo</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Visa Deposit</span>
                        <span className="font-medium text-foreground">€5k – €11k</span>
                      </div>
                    </div>
                  }
                />
                <InteractiveFeatureCard
                  title="Scholarship Finder"
                  desc="Matched funding opportunities based on your profile"
                  icon={Search}
                  index={2}
                  accentColor="emerald"
                  preview={
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">DAAD</span>
                        <span className="font-medium text-[hsl(var(--success))]">Full Fund</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Erasmus+</span>
                        <span className="font-medium text-[hsl(var(--success))]">Partial</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">SI Scholarship</span>
                        <span className="font-medium text-[hsl(var(--success))]">Full Fund</span>
                      </div>
                    </div>
                  }
                />
              </div>
            </div>

            {/* Mini Demo Preview */}
            <div className="px-4 pb-16">
              <MiniDemoPreview />
            </div>

            {/* Login prompt */}
            {!user && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="pb-12 text-sm text-white/70 text-center"
              >
                <button onClick={() => navigate('/auth')} className="text-white font-medium hover:underline underline-offset-4">
                  Sign in
                </button>{' '}
                to save evaluations and access them later.
              </motion.p>
            )}
          </motion.div>
        )}

        {appState === 'wizard' && (
          <motion.div
            key="wizard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen py-8 px-4"
          >
            <div className="max-w-3xl mx-auto">
              <div className="mb-6">
                <Button variant="ghost" onClick={() => {
                  const wentBack = wizardRef.current?.goBack();
                  if (!wentBack) {
                    setWizardStep(0);
                    setAppState('landing');
                  }
                }} className="gap-1 text-muted-foreground mb-4">
                  <ChevronLeft className="w-4 h-4" />
                  Go Back
                </Button>
                <div className="text-center">
                  <h1 className="text-2xl font-semibold">Build Your Profile</h1>
                  <p className="text-muted-foreground text-sm mt-1">Tell us about your academic background and goals</p>
                </div>
              </div>
              <ProfileWizard
                ref={wizardRef}
                initialProfile={currentProfile ?? undefined}
                initialStep={wizardStep}
                onStepChange={setWizardStep}
                onComplete={handleWizardComplete}
              />
            </div>
          </motion.div>
        )}

        {appState === 'evaluating' && (
          <motion.div
            key="evaluating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex items-center justify-center px-4"
          >
            <div className="text-center max-w-md">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 animate-pulse">
                <GraduationCap className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Evaluating Your Profile</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Our AI is analyzing your profile against real country data, scholarships, and requirements. This may take 15-30 seconds...
              </p>
              <div className="flex items-center justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2.5 h-2.5 rounded-full bg-primary"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {appState === 'results' && result && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen py-8 px-4"
          >
            <ResultsDashboard result={result} onBack={handleResultsBack} onReset={handleReset} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Evaluation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The saved evaluation will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
