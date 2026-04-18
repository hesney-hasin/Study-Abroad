// Core types for the Study Feasibility System

export type DegreeLevel = 'undergraduate' | 'masters' | 'phd';

export type EligibilityStatus = 'eligible' | 'borderline' | 'not-eligible';

export type FeasibilityLevel = 'high' | 'medium' | 'low';

export type RiskCategory = 'academic' | 'financial' | 'eligibility' | 'documentation';

export interface StudentProfile {
  // Basic Info
  name?: string;
  
  // Academic Profile
  degreeLevel: DegreeLevel;
  currentDegree: string; // e.g., "Bachelor's in Computer Science"
  major: string;
  cgpa: number;
  cgpaScale: number; // 4.0 or 5.0
  
  // Test Scores (optional)
  gre?: {
    verbal: number;
    quantitative: number;
    writing: number;
    total: number;
  };
  ielts?: number;
  toefl?: number;
  
  // Preferences
  budgetMin: number;
  budgetMax: number;
  preferredCountries: string[];
  programPreference?: string;
  
  // Additional factors
  hasResearchExperience?: boolean;
  hasWorkExperience?: boolean;
  publicationsCount?: number;
  
  // Degree-specific fields
  // Bachelor's (Bangladeshi SSC/HSC system)
  sscGPA?: number; // SSC GPA on 5.0 scale
  hscGPA?: number; // HSC GPA on 5.0 scale
  extracurriculars?: string; // ECAs description
  
  // Master's
  internshipDetails?: string; // Internship & work experience description
  workExperienceYears?: number;
  
  // PhD
  researchPapers?: string; // Research paper details/links
  researchPaperCount?: number;
  workExperienceDetails?: string;
}

export interface Country {
  id: string;
  name: string;
  code: string;
  flagEmoji: string;
  region: 'europe' | 'north-america' | 'asia' | 'oceania';
  
  // Tuition costs (EUR per year)
  tuition: {
    undergraduate: { min: number; max: number };
    masters: { min: number; max: number };
    phd: { min: number; max: number };
  };
  
  // Living costs (EUR per month)
  livingCosts: {
    min: number;
    max: number;
    average: number;
  };
  
  // Eligibility requirements
  requirements: {
    minCGPA: number; // on 4.0 scale
    borderlineCGPA: number;
    requiresGRE: boolean;
    minIELTS?: number;
    minTOEFL?: number;
    acceptsWithoutEnglishTest?: boolean;
  };
  
  // Program duration (years)
  programDuration: {
    undergraduate: number;
    masters: number;
    phd: number;
  };
  
  // Official resources
  officialLinks: {
    mainPortal: string;
    scholarshipPortal?: string;
    visaInfo: string;
  };
  
  // Special notes
  notes: string[];
}

export interface Scholarship {
  id: string;
  name: string;
  countryId: string;
  
  // Coverage
  coversTuition: boolean;
  coversLiving: boolean;
  monthlyStipend?: number;
  additionalBenefits: string[];
  
  // Eligibility
  eligibleDegrees: DegreeLevel[];
  minCGPA: number;
  requiresGRE: boolean;
  requiresIELTS: boolean;
  minIELTS?: number;
  
  // Competitiveness
  competitiveness: 'high' | 'medium' | 'low';
  annualRecipients?: number;
  
  // Links
  officialLink: string;
  deadline?: string;
  
  // Notes
  specialRequirements: string[];
}

export interface EligibilityResult {
  status: EligibilityStatus;
  score: number; // 0-100
  reasons: string[];
  recommendations: string[];
}

export interface CostEstimate {
  tuitionPerYear: { min: number; max: number };
  livingPerYear: { min: number; max: number };
  totalPerYear: { min: number; max: number };
  totalProgram: { min: number; max: number };
  programDuration: number;
  affordabilityStatus: 'affordable' | 'tight' | 'exceeds-budget';
  budgetGap?: number;
}

export interface ScholarshipMatch {
  scholarship: Scholarship;
  eligibility: EligibilityStatus;
  feasibility: FeasibilityLevel;
  matchScore: number;
  matchReasons: string[];
  missingRequirements: string[];
}

export interface Risk {
  category: RiskCategory;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  mitigation: string;
}

export interface FeasibilityScore {
  overall: number; // 0-100
  breakdown: {
    academic: number;
    financial: number;
    scholarship: number;
    risk: number;
  };
  weights: {
    academic: number;
    financial: number;
    scholarship: number;
    risk: number;
  };
}

export interface CountryEvaluation {
  country: Country;
  eligibility: EligibilityResult;
  costEstimate: CostEstimate;
  scholarshipMatches: ScholarshipMatch[];
  risks: Risk[];
  feasibilityScore: FeasibilityScore;
  nextSteps: NextStep[];
}

export interface NextStep {
  priority: number;
  title: string;
  description: string;
  link?: string;
  deadline?: string;
}

export interface EvaluationResult {
  profile: StudentProfile;
  evaluations: CountryEvaluation[];
  overallRecommendation: string;
  timestamp: Date;
}
