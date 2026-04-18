import { StudentProfile, Scholarship, ScholarshipMatch, FeasibilityLevel, EligibilityStatus } from '@/types';
import { getNormalizedProfile } from './profileNormalization';

/**
 * Scholarship Feasibility Engine
 * Match user profile against country/degree-specific scholarship rules
 */

export const evaluateScholarshipMatch = (
  profile: StudentProfile,
  scholarship: Scholarship
): ScholarshipMatch => {
  const normalized = getNormalizedProfile(profile);
  const matchReasons: string[] = [];
  const missingRequirements: string[] = [];
  let matchScore = 100;

  // 1. Degree eligibility
  if (!scholarship.eligibleDegrees.includes(profile.degreeLevel)) {
    matchScore = 0;
    missingRequirements.push(`This scholarship is not available for ${profile.degreeLevel} students`);
    return createMatchResult(scholarship, 'not-eligible', 'low', matchScore, matchReasons, missingRequirements);
  }
  matchReasons.push(`✓ Available for ${profile.degreeLevel} students`);

  // 2. CGPA requirement
  if (normalized.normalizedCGPA >= scholarship.minCGPA) {
    matchReasons.push(`✓ Your CGPA (${normalized.normalizedCGPA.toFixed(2)}) meets the requirement (${scholarship.minCGPA})`);
  } else if (normalized.normalizedCGPA >= scholarship.minCGPA - 0.2) {
    matchScore -= 15;
    matchReasons.push(`⚠ Your CGPA (${normalized.normalizedCGPA.toFixed(2)}) is slightly below requirement (${scholarship.minCGPA})`);
  } else {
    matchScore -= 30;
    missingRequirements.push(`CGPA ${scholarship.minCGPA}+ required (you have ${normalized.normalizedCGPA.toFixed(2)})`);
  }

  // 3. GRE requirement
  if (scholarship.requiresGRE) {
    if (normalized.testScores.hasValidGRE) {
      matchReasons.push(`✓ GRE score (${normalized.testScores.greTotal}) provided`);
    } else {
      matchScore -= 25;
      missingRequirements.push('GRE score is required');
    }
  }

  // 4. IELTS requirement
  if (scholarship.requiresIELTS) {
    if (normalized.testScores.hasValidIELTS) {
      if (scholarship.minIELTS && normalized.testScores.ieltsScore! >= scholarship.minIELTS) {
        matchReasons.push(`✓ Your IELTS (${normalized.testScores.ieltsScore}) meets requirement (${scholarship.minIELTS})`);
      } else if (scholarship.minIELTS) {
        matchScore -= 15;
        missingRequirements.push(`IELTS ${scholarship.minIELTS}+ required (you have ${normalized.testScores.ieltsScore})`);
      }
    } else if (normalized.testScores.hasValidTOEFL) {
      matchReasons.push(`✓ TOEFL score (${normalized.testScores.toeflScore}) may be accepted`);
    } else {
      matchScore -= 20;
      missingRequirements.push('English language test score required');
    }
  }

  // 5. Competitiveness adjustment
  switch (scholarship.competitiveness) {
    case 'high':
      matchScore -= 10;
      if (scholarship.annualRecipients) {
        matchReasons.push(`ℹ Highly competitive (~${scholarship.annualRecipients} recipients/year)`);
      }
      break;
    case 'medium':
      matchReasons.push('ℹ Moderately competitive scholarship');
      break;
    case 'low':
      matchScore += 5;
      matchReasons.push('ℹ More accessible scholarship option');
      break;
  }

  // 6. Special factors
  if (profile.degreeLevel === 'phd' && profile.hasResearchExperience) {
    matchScore += 5;
    matchReasons.push('✓ Research experience strengthens PhD scholarship applications');
  }

  if (profile.hasWorkExperience && scholarship.specialRequirements.some(r => 
    r.toLowerCase().includes('work experience')
  )) {
    matchScore += 5;
    matchReasons.push('✓ Work experience aligns with scholarship requirements');
  }

  // Normalize score
  matchScore = Math.max(0, Math.min(100, matchScore));

  // Determine eligibility and feasibility
  let eligibility: EligibilityStatus;
  let feasibility: FeasibilityLevel;

  if (matchScore >= 70) {
    eligibility = 'eligible';
    feasibility = scholarship.competitiveness === 'high' ? 'medium' : 'high';
  } else if (matchScore >= 50) {
    eligibility = 'borderline';
    feasibility = 'medium';
  } else {
    eligibility = 'not-eligible';
    feasibility = 'low';
  }

  return createMatchResult(scholarship, eligibility, feasibility, matchScore, matchReasons, missingRequirements);
};

const createMatchResult = (
  scholarship: Scholarship,
  eligibility: EligibilityStatus,
  feasibility: FeasibilityLevel,
  matchScore: number,
  matchReasons: string[],
  missingRequirements: string[]
): ScholarshipMatch => ({
  scholarship,
  eligibility,
  feasibility,
  matchScore,
  matchReasons,
  missingRequirements,
});

/**
 * Get best scholarship matches for a country
 */
export const getTopScholarshipMatches = (
  profile: StudentProfile,
  scholarships: Scholarship[],
  limit: number = 3
): ScholarshipMatch[] => {
  const matches = scholarships.map(s => evaluateScholarshipMatch(profile, s));
  return matches
    .filter(m => m.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
};

/**
 * Get feasibility level color
 */
export const getFeasibilityColor = (level: FeasibilityLevel): string => {
  switch (level) {
    case 'high':
      return 'text-success';
    case 'medium':
      return 'text-warning';
    case 'low':
      return 'text-destructive';
  }
};

/**
 * Get overall scholarship feasibility for a country
 */
export const getOverallScholarshipFeasibility = (matches: ScholarshipMatch[]): {
  level: FeasibilityLevel;
  score: number;
} => {
  if (matches.length === 0) {
    return { level: 'low', score: 0 };
  }

  const avgScore = matches.reduce((sum, m) => sum + m.matchScore, 0) / matches.length;
  const hasHighMatch = matches.some(m => m.feasibility === 'high');

  let level: FeasibilityLevel;
  if (avgScore >= 70 || hasHighMatch) {
    level = 'high';
  } else if (avgScore >= 50) {
    level = 'medium';
  } else {
    level = 'low';
  }

  return { level, score: Math.round(avgScore) };
};
