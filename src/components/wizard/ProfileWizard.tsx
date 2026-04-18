import React, { useState, useMemo, useImperativeHandle, forwardRef } from 'react';
import { StudentProfile, DegreeLevel } from '@/types';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import { AcademicForm } from './AcademicForm';
import { TestScoresForm } from './TestScoresForm';
import { BudgetForm } from './BudgetForm';
import { CountryForm } from './CountryForm';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles, RotateCcw } from 'lucide-react';
import wizardAcademic from '@/assets/wizard-academic.jpg';
import wizardTests from '@/assets/wizard-tests.jpg';
import wizardBudget from '@/assets/wizard-budget.jpg';
import wizardDestinations from '@/assets/wizard-destinations.jpg';

const stepBackgrounds = [wizardAcademic, wizardTests, wizardBudget, wizardDestinations];

export interface ProfileWizardRef {
  goBack: () => boolean; // returns true if went back a step, false if already at step 0
  currentStep: number;
}

interface ProfileWizardProps {
  onComplete: (profile: StudentProfile) => void;
  initialProfile?: Partial<StudentProfile>;
  initialStep?: number;
  onStepChange?: (step: number) => void;
}

const steps = [
  { id: 'academic', title: 'Academic Profile', description: 'Your education background' },
  { id: 'tests', title: 'Test Scores', description: 'IELTS, TOEFL, GRE' },
  { id: 'budget', title: 'Budget & Goals', description: 'Financial planning' },
  { id: 'countries', title: 'Destinations', description: 'Choose countries' },
];

const defaultProfile: Partial<StudentProfile> = {
  degreeLevel: 'masters',
  cgpaScale: 4,
  budgetMin: 20000,
  budgetMax: 50000,
  preferredCountries: [],
};

export const ProfileWizard = forwardRef<ProfileWizardRef, ProfileWizardProps>(({ onComplete, initialProfile, initialStep = 0, onStepChange }, ref) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [profile, setProfile] = useState<Partial<StudentProfile>>(initialProfile || defaultProfile);

  useImperativeHandle(ref, () => ({
    goBack: () => {
      if (currentStep > 0) {
        const prev = currentStep - 1;
        setCurrentStep(prev);
        onStepChange?.(prev);
        return true;
      }
      return false;
    },
    currentStep,
  }), [currentStep, onStepChange]);

  const updateProfile = (data: Partial<StudentProfile>) => {
    setProfile((prev) => ({ ...prev, ...data }));
  };

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 0:
        return profile.degreeLevel && profile.major && profile.cgpa && profile.cgpa > 0;
      case 1:
        return true; // Test scores are optional
      case 2:
        return profile.budgetMin && profile.budgetMax && profile.budgetMax >= profile.budgetMin;
      case 3:
        return true; // Countries are optional (evaluates all if none selected)
      default:
        return false;
    }
  }, [currentStep, profile]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      onStepChange?.(next);
    } else {
      // Complete the wizard
      const completeProfile: StudentProfile = {
        degreeLevel: profile.degreeLevel as DegreeLevel,
        currentDegree: `${profile.degreeLevel === 'undergraduate' ? 'HSC' : "Bachelor's"} in ${profile.major}`,
        major: profile.major!,
        cgpa: profile.cgpa!,
        cgpaScale: profile.cgpaScale || 4,
        budgetMin: profile.budgetMin!,
        budgetMax: profile.budgetMax!,
        preferredCountries: profile.preferredCountries || [],
        gre: profile.gre,
        ielts: profile.ielts,
        toefl: profile.toefl,
        programPreference: profile.programPreference,
        hasResearchExperience: profile.hasResearchExperience,
        hasWorkExperience: profile.hasWorkExperience,
        publicationsCount: profile.publicationsCount,
        // Degree-specific fields
        extracurriculars: profile.extracurriculars,
        internshipDetails: profile.internshipDetails,
        workExperienceYears: profile.workExperienceYears,
        researchPapers: profile.researchPapers,
        researchPaperCount: profile.researchPaperCount,
        workExperienceDetails: profile.workExperienceDetails,
      };
      onComplete(completeProfile);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      onStepChange?.(prev);
    }
  };

  const handleReset = () => {
    setProfile(defaultProfile);
    setCurrentStep(0);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <AcademicForm data={profile} onChange={updateProfile} />;
      case 1:
        return <TestScoresForm data={profile} onChange={updateProfile} />;
      case 2:
        return <BudgetForm data={profile} onChange={updateProfile} />;
      case 3:
        return <CountryForm data={profile} onChange={updateProfile} />;
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto rounded-2xl overflow-hidden">
      {/* Full-cover background image per step */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`bg-${currentStep}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 z-0"
        >
          <img
            src={stepBackgrounds[currentStep]}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
          />
          {/* Light blur + soft overlay so form stays readable, photo dominates */}
          <div className="absolute inset-0 backdrop-blur-[2px] bg-background/40" />
        </motion.div>
      </AnimatePresence>

      {/* Foreground content */}
      <div className="relative z-10 p-6 md:p-8">
        {/* Stepper */}
        <Stepper steps={steps} currentStep={currentStep} className="mb-8" />

        {/* Form Content */}
        <div className="min-h-[400px] rounded-xl bg-background/60 backdrop-blur-sm p-4 md:p-6 border border-border/40 shadow-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/60">
        <div className="flex gap-2">
          {currentStep > 0 && (
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          <Button variant="ghost" onClick={handleReset} className="text-muted-foreground">
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        </div>

        <Button
          onClick={handleNext}
          disabled={!canProceed}
          variant={currentStep === steps.length - 1 ? 'hero' : 'default'}
          size="lg"
        >
          {currentStep === steps.length - 1 ? (
            <>
              <Sparkles className="w-4 h-4 mr-1" />
              Evaluate Feasibility
            </>
          ) : (
            <>
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
        </div>
      </div>
    </div>
  );
});

ProfileWizard.displayName = 'ProfileWizard';
