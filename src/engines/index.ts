import { StudentProfile, Country, CountryEvaluation, EvaluationResult } from '@/types';
import { countries } from '@/data/countries';
import { getScholarshipsByCountry } from '@/data/scholarships';
import { evaluateAcademicEligibility } from './eligibilityEngine';
import { estimateCosts } from './costEngine';
import { getTopScholarshipMatches } from './scholarshipEngine';
import { detectRisks, calculateRiskScore } from './riskEngine';
import { computeFeasibilityScore } from './scoringEngine';
import { generateNextSteps } from './linksEngine';

/**
 * Main Evaluation Orchestrator
 * Coordinates all engines to produce comprehensive evaluation
 */

export const evaluateCountry = (
  profile: StudentProfile,
  country: Country
): CountryEvaluation => {
  // 1. Academic Eligibility
  const eligibility = evaluateAcademicEligibility(profile, country);

  // 2. Cost Estimation
  const costEstimate = estimateCosts(profile, country);

  // 3. Scholarship Matching
  const countryScholarships = getScholarshipsByCountry(country.id);
  const scholarshipMatches = getTopScholarshipMatches(profile, countryScholarships, 5);

  // 4. Risk Detection
  const risks = detectRisks(profile, country, eligibility, costEstimate, scholarshipMatches);
  const riskScore = calculateRiskScore(risks);

  // 5. Feasibility Scoring
  const feasibilityScore = computeFeasibilityScore(
    profile,
    country,
    eligibility,
    costEstimate,
    scholarshipMatches,
    riskScore
  );

  // 6. Next Steps
  const nextSteps = generateNextSteps(profile, country, scholarshipMatches.length > 0);

  return {
    country,
    eligibility,
    costEstimate,
    scholarshipMatches,
    risks,
    feasibilityScore,
    nextSteps,
  };
};

export const evaluateAllCountries = (profile: StudentProfile): EvaluationResult => {
  // Filter to preferred countries or evaluate all
  const countriesToEvaluate = profile.preferredCountries.length > 0
    ? countries.filter(c => profile.preferredCountries.includes(c.id))
    : countries;

  const evaluations = countriesToEvaluate
    .map(country => evaluateCountry(profile, country))
    .sort((a, b) => b.feasibilityScore.overall - a.feasibilityScore.overall);

  // Generate overall recommendation
  const topCountry = evaluations[0];
  const overallRecommendation = generateOverallRecommendation(profile, evaluations);

  return {
    profile,
    evaluations,
    overallRecommendation,
    timestamp: new Date(),
  };
};

const generateOverallRecommendation = (
  profile: StudentProfile,
  evaluations: CountryEvaluation[]
): string => {
  if (evaluations.length === 0) {
    return 'No countries selected for evaluation.';
  }

  const topCountry = evaluations[0];
  const topScore = topCountry.feasibilityScore.overall;

  if (topScore >= 75) {
    return `${topCountry.country.name} appears to be an excellent match for your profile with a feasibility score of ${topScore}%. Your academic credentials and budget align well with opportunities in this country.`;
  } else if (topScore >= 55) {
    return `${topCountry.country.name} shows good potential with a feasibility score of ${topScore}%. While there are some areas to strengthen, this is a viable option worth pursuing.`;
  } else if (topScore >= 40) {
    return `Your top option, ${topCountry.country.name}, has a feasibility score of ${topScore}%. Consider addressing the identified risks and exploring scholarship opportunities to improve your chances.`;
  } else {
    return `Based on your current profile, studying abroad may require additional preparation. Focus on strengthening your academic credentials, securing funding, or considering more accessible destinations.`;
  }
};

// Re-export all engines for convenience
export * from './profileNormalization';
export * from './eligibilityEngine';
export * from './costEngine';
export * from './scholarshipEngine';
export * from './scoringEngine';
export * from './riskEngine';
export * from './linksEngine';
