import { StudentProfile, Country, EligibilityResult, EligibilityStatus } from '@/types';
import { getNormalizedProfile } from './profileNormalization';

/**
 * Academic Eligibility Engine
 * Deterministic rules to check eligibility for MS/PhD per country
 */

export const evaluateAcademicEligibility = (
  profile: StudentProfile,
  country: Country
): EligibilityResult => {
  const normalized = getNormalizedProfile(profile);
  const reasons: string[] = [];
  const recommendations: string[] = [];
  let score = 100;

  // 1. CGPA Check
  if (normalized.normalizedCGPA >= country.requirements.minCGPA) {
    reasons.push(`✓ Your CGPA (${normalized.normalizedCGPA.toFixed(2)}/4.0) meets the minimum requirement (${country.requirements.minCGPA}/4.0)`);
  } else if (normalized.normalizedCGPA >= country.requirements.borderlineCGPA) {
    score -= 20;
    reasons.push(`⚠ Your CGPA (${normalized.normalizedCGPA.toFixed(2)}/4.0) is borderline (required: ${country.requirements.minCGPA}/4.0)`);
    recommendations.push('Consider highlighting relevant work experience or research to strengthen your application');
  } else {
    score -= 40;
    reasons.push(`✗ Your CGPA (${normalized.normalizedCGPA.toFixed(2)}/4.0) is below the typical requirement (${country.requirements.minCGPA}/4.0)`);
    recommendations.push('Consider universities with more flexible admission criteria');
    recommendations.push('Strong recommendation letters and motivation can help offset lower CGPA');
  }

  // 2. English Proficiency Check
  const { hasValidIELTS, hasValidTOEFL, ieltsScore, toeflScore } = normalized.testScores;
  
  if (!hasValidIELTS && !hasValidTOEFL) {
    if (country.requirements.acceptsWithoutEnglishTest) {
      score -= 5;
      reasons.push('⚠ No English test score provided (some programs may accept alternative proof)');
      recommendations.push('Taking IELTS/TOEFL will significantly expand your options');
    } else {
      score -= 25;
      reasons.push('✗ No English test score provided (typically required)');
      recommendations.push(`IELTS ${country.requirements.minIELTS}+ or TOEFL ${country.requirements.minTOEFL}+ is typically required`);
    }
  } else {
    if (hasValidIELTS && country.requirements.minIELTS) {
      if (ieltsScore! >= country.requirements.minIELTS) {
        reasons.push(`✓ Your IELTS score (${ieltsScore}) meets the requirement (${country.requirements.minIELTS})`);
      } else if (ieltsScore! >= country.requirements.minIELTS - 0.5) {
        score -= 10;
        reasons.push(`⚠ Your IELTS score (${ieltsScore}) is slightly below requirement (${country.requirements.minIELTS})`);
        recommendations.push('Some universities offer conditional admission with pre-sessional English courses');
      } else {
        score -= 25;
        reasons.push(`✗ Your IELTS score (${ieltsScore}) is below requirement (${country.requirements.minIELTS})`);
        recommendations.push('Consider retaking IELTS to improve your score');
      }
    }
    
    if (hasValidTOEFL && country.requirements.minTOEFL) {
      if (toeflScore! >= country.requirements.minTOEFL) {
        reasons.push(`✓ Your TOEFL score (${toeflScore}) meets the requirement (${country.requirements.minTOEFL})`);
      } else if (toeflScore! >= country.requirements.minTOEFL - 5) {
        score -= 10;
        reasons.push(`⚠ Your TOEFL score (${toeflScore}) is slightly below requirement (${country.requirements.minTOEFL})`);
      } else {
        score -= 25;
        reasons.push(`✗ Your TOEFL score (${toeflScore}) is below requirement (${country.requirements.minTOEFL})`);
      }
    }
  }

  // 3. GRE Check (if required)
  if (country.requirements.requiresGRE) {
    const { hasValidGRE, greTotal } = normalized.testScores;
    if (!hasValidGRE) {
      score -= 20;
      reasons.push('✗ GRE score is required but not provided');
      recommendations.push('GRE is required for most programs in this country');
    } else if (greTotal! >= 310) {
      reasons.push(`✓ Your GRE score (${greTotal}) is competitive`);
    } else if (greTotal! >= 300) {
      score -= 10;
      reasons.push(`⚠ Your GRE score (${greTotal}) is acceptable but not highly competitive`);
    } else {
      score -= 15;
      reasons.push(`⚠ Your GRE score (${greTotal}) may limit competitive program options`);
    }
  } else {
    if (normalized.testScores.hasValidGRE) {
      reasons.push(`✓ GRE not required, but your score (${normalized.testScores.greTotal}) can strengthen your application`);
    }
  }

  // 4. Degree-specific considerations
  if (profile.degreeLevel === 'phd') {
    if (profile.hasResearchExperience) {
      score += 5;
      reasons.push('✓ Research experience is valuable for PhD applications');
    } else {
      score -= 10;
      reasons.push('⚠ Research experience is typically expected for PhD programs');
      recommendations.push('Consider highlighting any project work or thesis research');
    }
    
    if (profile.publicationsCount && profile.publicationsCount > 0) {
      score += 5;
      reasons.push(`✓ Publications (${profile.publicationsCount}) strengthen your PhD application`);
    }
  }

  // 5. Work experience consideration
  if (profile.degreeLevel === 'masters' && profile.hasWorkExperience) {
    score += 3;
    reasons.push('✓ Work experience enhances your Master\'s application');
  }

  // Normalize score to 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine status
  let status: EligibilityStatus;
  if (score >= 70) {
    status = 'eligible';
  } else if (score >= 50) {
    status = 'borderline';
  } else {
    status = 'not-eligible';
  }

  return {
    status,
    score,
    reasons,
    recommendations,
  };
};

/**
 * Get eligibility color based on status
 */
export const getEligibilityColor = (status: EligibilityStatus): string => {
  switch (status) {
    case 'eligible':
      return 'text-success';
    case 'borderline':
      return 'text-warning';
    case 'not-eligible':
      return 'text-destructive';
  }
};
