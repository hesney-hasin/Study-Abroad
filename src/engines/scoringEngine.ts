import { 
  StudentProfile, 
  Country, 
  FeasibilityScore, 
  EligibilityResult, 
  CostEstimate, 
  ScholarshipMatch 
} from '@/types';
import { getAffordabilityScore } from './costEngine';
import { getOverallScholarshipFeasibility } from './scholarshipEngine';

/**
 * Feasibility Scoring Engine
 * Compute a deterministic feasibility score (0-100)
 */

// Default weights for scoring components
const DEFAULT_WEIGHTS = {
  academic: 0.35,
  financial: 0.30,
  scholarship: 0.20,
  risk: 0.15,
};

export const computeFeasibilityScore = (
  profile: StudentProfile,
  country: Country,
  eligibility: EligibilityResult,
  costEstimate: CostEstimate,
  scholarshipMatches: ScholarshipMatch[],
  riskScore: number
): FeasibilityScore => {
  const weights = { ...DEFAULT_WEIGHTS };

  // Adjust weights based on user's situation
  // If budget is very tight, increase financial weight
  if (costEstimate.affordabilityStatus === 'exceeds-budget') {
    weights.financial = 0.40;
    weights.academic = 0.30;
    weights.scholarship = 0.20;
    weights.risk = 0.10;
  }

  // Calculate component scores
  const academicScore = eligibility.score;
  const financialScore = getAffordabilityScore(costEstimate, profile);
  const scholarshipFeasibility = getOverallScholarshipFeasibility(scholarshipMatches);
  const scholarshipScore = scholarshipFeasibility.score;
  
  // Invert risk score (higher risk = lower score)
  const riskAdjustedScore = 100 - riskScore;

  // Calculate weighted overall score
  const overall = Math.round(
    academicScore * weights.academic +
    financialScore * weights.financial +
    scholarshipScore * weights.scholarship +
    riskAdjustedScore * weights.risk
  );

  return {
    overall: Math.max(0, Math.min(100, overall)),
    breakdown: {
      academic: academicScore,
      financial: financialScore,
      scholarship: scholarshipScore,
      risk: riskAdjustedScore,
    },
    weights,
  };
};

/**
 * Get score interpretation
 */
export const getScoreInterpretation = (score: number): {
  label: string;
  description: string;
  color: string;
} => {
  if (score >= 80) {
    return {
      label: 'Excellent',
      description: 'Strong candidate with high feasibility',
      color: 'text-success',
    };
  }
  if (score >= 65) {
    return {
      label: 'Good',
      description: 'Solid candidate with good prospects',
      color: 'text-success',
    };
  }
  if (score >= 50) {
    return {
      label: 'Moderate',
      description: 'Feasible with some considerations',
      color: 'text-warning',
    };
  }
  if (score >= 35) {
    return {
      label: 'Challenging',
      description: 'May require additional preparation',
      color: 'text-warning',
    };
  }
  return {
    label: 'Difficult',
    description: 'Significant obstacles to address',
    color: 'text-destructive',
  };
};

/**
 * Get component description for breakdown
 */
export const getComponentDescription = (
  component: keyof FeasibilityScore['breakdown'],
  score: number
): string => {
  const descriptions: Record<keyof FeasibilityScore['breakdown'], Record<string, string>> = {
    academic: {
      high: 'Strong academic profile matching requirements',
      medium: 'Academic profile meets basic requirements',
      low: 'Academic gaps may need to be addressed',
    },
    financial: {
      high: 'Budget comfortably covers estimated costs',
      medium: 'Budget is tight but manageable',
      low: 'Significant funding gap to address',
    },
    scholarship: {
      high: 'Good scholarship opportunities available',
      medium: 'Some scholarship options to explore',
      low: 'Limited scholarship matches',
    },
    risk: {
      high: 'Low risk profile with strong documentation',
      medium: 'Some risks to monitor',
      low: 'Several risk factors identified',
    },
  };

  const level = score >= 70 ? 'high' : score >= 50 ? 'medium' : 'low';
  return descriptions[component][level];
};
