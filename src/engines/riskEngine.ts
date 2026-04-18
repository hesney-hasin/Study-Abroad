import { StudentProfile, Country, Risk, RiskCategory, EligibilityResult, CostEstimate, ScholarshipMatch } from '@/types';
import { getNormalizedProfile } from './profileNormalization';

/**
 * Risk Detection Module
 * Identify academic, financial, or eligibility risks
 */

export const detectRisks = (
  profile: StudentProfile,
  country: Country,
  eligibility: EligibilityResult,
  costEstimate: CostEstimate,
  scholarshipMatches: ScholarshipMatch[]
): Risk[] => {
  const risks: Risk[] = [];
  const normalized = getNormalizedProfile(profile);

  // Academic Risks
  if (normalized.normalizedCGPA < country.requirements.borderlineCGPA) {
    risks.push({
      category: 'academic',
      severity: 'high',
      title: 'Low CGPA',
      description: `Your CGPA (${normalized.normalizedCGPA.toFixed(2)}) is below the typical threshold for ${country.name}`,
      mitigation: 'Consider universities with more flexible admission criteria or highlight exceptional achievements',
    });
  } else if (normalized.normalizedCGPA < country.requirements.minCGPA) {
    risks.push({
      category: 'academic',
      severity: 'medium',
      title: 'Borderline CGPA',
      description: `Your CGPA is slightly below preferred levels for competitive programs`,
      mitigation: 'Strong recommendation letters and relevant experience can help offset this',
    });
  }

  // English proficiency risks
  if (!normalized.testScores.hasValidIELTS && !normalized.testScores.hasValidTOEFL) {
    risks.push({
      category: 'academic',
      severity: 'high',
      title: 'Missing English Proficiency Test',
      description: 'Most programs require IELTS or TOEFL scores',
      mitigation: `Target IELTS ${country.requirements.minIELTS || 6.5}+ or TOEFL ${country.requirements.minTOEFL || 90}+`,
    });
  } else if (normalized.testScores.ieltsScore && country.requirements.minIELTS) {
    if (normalized.testScores.ieltsScore < country.requirements.minIELTS - 0.5) {
      risks.push({
        category: 'academic',
        severity: 'medium',
        title: 'IELTS Score Below Requirement',
        description: `Your IELTS (${normalized.testScores.ieltsScore}) is below the typical requirement (${country.requirements.minIELTS})`,
        mitigation: 'Consider retaking IELTS or look for pre-sessional English programs',
      });
    }
  }

  // Research experience for PhD
  if (profile.degreeLevel === 'phd' && !profile.hasResearchExperience) {
    risks.push({
      category: 'academic',
      severity: 'medium',
      title: 'Limited Research Experience',
      description: 'PhD programs typically expect research background',
      mitigation: 'Highlight thesis work, projects, or consider a research-focused Master\'s first',
    });
  }

  // Financial Risks
  if (costEstimate.affordabilityStatus === 'exceeds-budget') {
    const gap = costEstimate.budgetGap || 0;
    risks.push({
      category: 'financial',
      severity: 'high',
      title: 'Budget Shortfall',
      description: `Estimated costs exceed your budget by approximately €${gap.toLocaleString()}`,
      mitigation: 'Explore scholarship opportunities or consider more affordable alternatives',
    });
  } else if (costEstimate.affordabilityStatus === 'tight') {
    risks.push({
      category: 'financial',
      severity: 'medium',
      title: 'Tight Budget',
      description: 'Your budget may not cover unexpected expenses',
      mitigation: 'Build in a 10-15% buffer and explore part-time work options',
    });
  }

  // Scholarship dependency risk
  const hasFullFunding = scholarshipMatches.some(
    m => m.scholarship.coversTuition && m.scholarship.coversLiving && m.feasibility !== 'low'
  );
  
  if (costEstimate.affordabilityStatus !== 'affordable' && !hasFullFunding) {
    risks.push({
      category: 'financial',
      severity: 'medium',
      title: 'Scholarship Dependency',
      description: 'You may need scholarship funding to afford this program',
      mitigation: 'Apply to multiple scholarships and have backup plans',
    });
  }

  // Eligibility Risks
  if (eligibility.status === 'not-eligible') {
    risks.push({
      category: 'eligibility',
      severity: 'high',
      title: 'Eligibility Concerns',
      description: 'Your profile may not meet standard admission requirements',
      mitigation: 'Review specific program requirements and contact admissions offices',
    });
  }

  // GRE requirement risk
  if (country.requirements.requiresGRE && !normalized.testScores.hasValidGRE) {
    risks.push({
      category: 'eligibility',
      severity: 'high',
      title: 'Missing GRE Score',
      description: 'GRE is typically required for programs in this country',
      mitigation: 'Schedule a GRE test with adequate preparation time',
    });
  }

  // Documentation Risks
  risks.push({
    category: 'documentation',
    severity: 'low',
    title: 'Document Preparation',
    description: 'Ensure all academic documents are properly attested and translated if needed',
    mitigation: 'Start document preparation 3-4 months before deadlines',
  });

  return risks;
};

/**
 * Calculate overall risk score (0-100, higher = more risk)
 */
export const calculateRiskScore = (risks: Risk[]): number => {
  if (risks.length === 0) return 0;

  const severityWeights = {
    high: 30,
    medium: 15,
    low: 5,
  };

  const totalRiskPoints = risks.reduce((sum, risk) => {
    return sum + severityWeights[risk.severity];
  }, 0);

  // Cap at 100
  return Math.min(100, totalRiskPoints);
};

/**
 * Get risk severity color
 */
export const getRiskColor = (severity: Risk['severity']): string => {
  switch (severity) {
    case 'high':
      return 'text-destructive';
    case 'medium':
      return 'text-warning';
    case 'low':
      return 'text-muted-foreground';
  }
};

/**
 * Get risk category icon name
 */
export const getRiskCategoryIcon = (category: RiskCategory): string => {
  switch (category) {
    case 'academic':
      return 'GraduationCap';
    case 'financial':
      return 'Wallet';
    case 'eligibility':
      return 'ClipboardCheck';
    case 'documentation':
      return 'FileText';
  }
};
