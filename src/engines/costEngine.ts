import { StudentProfile, Country, CostEstimate } from '@/types';

const EUR_TO_BDT = 120; // Approximate exchange rate

/**
 * Cost Estimation Engine
 * Estimate total study cost and compare against user budget
 */

export const estimateCosts = (
  profile: StudentProfile,
  country: Country
): CostEstimate => {
  const degreeLevel = profile.degreeLevel;
  
  // Get tuition range
  const tuitionPerYear = {
    min: country.tuition[degreeLevel].min,
    max: country.tuition[degreeLevel].max,
  };
  
  // Get living costs (annual = monthly * 12)
  const livingPerYear = {
    min: country.livingCosts.min * 12,
    max: country.livingCosts.max * 12,
  };
  
  // Total per year
  const totalPerYear = {
    min: tuitionPerYear.min + livingPerYear.min,
    max: tuitionPerYear.max + livingPerYear.max,
  };
  
  // Program duration
  const programDuration = country.programDuration[degreeLevel];
  
  // Total for entire program
  const totalProgram = {
    min: totalPerYear.min * programDuration,
    max: totalPerYear.max * programDuration,
  };
  
  // Compare with user budget (assuming budget is in EUR)
  const userBudgetMin = profile.budgetMin;
  const userBudgetMax = profile.budgetMax;
  
  let affordabilityStatus: CostEstimate['affordabilityStatus'];
  let budgetGap: number | undefined;
  
  // Check if budget covers minimum costs
  if (userBudgetMax >= totalProgram.min) {
    if (userBudgetMin >= totalProgram.min) {
      affordabilityStatus = 'affordable';
    } else {
      affordabilityStatus = 'tight';
    }
  } else {
    affordabilityStatus = 'exceeds-budget';
    budgetGap = totalProgram.min - userBudgetMax;
  }

  return {
    tuitionPerYear,
    livingPerYear,
    totalPerYear,
    totalProgram,
    programDuration,
    affordabilityStatus,
    budgetGap,
  };
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number, currency: 'EUR' | 'BDT' = 'EUR'): string => {
  if (currency === 'BDT') {
    return `৳${(amount * EUR_TO_BDT).toLocaleString()}`;
  }
  return `€${amount.toLocaleString()}`;
};

/**
 * Get cost range as formatted string
 */
export const formatCostRange = (min: number, max: number, currency: 'EUR' | 'BDT' = 'EUR'): string => {
  if (min === max) {
    return formatCurrency(min, currency);
  }
  return `${formatCurrency(min, currency)} - ${formatCurrency(max, currency)}`;
};

/**
 * Get affordability score (0-100)
 */
export const getAffordabilityScore = (estimate: CostEstimate, profile: StudentProfile): number => {
  const avgCost = (estimate.totalProgram.min + estimate.totalProgram.max) / 2;
  const avgBudget = (profile.budgetMin + profile.budgetMax) / 2;
  
  if (avgBudget >= avgCost) {
    return 100;
  }
  
  const ratio = avgBudget / avgCost;
  return Math.round(ratio * 100);
};

/**
 * Get affordability status color
 */
export const getAffordabilityColor = (status: CostEstimate['affordabilityStatus']): string => {
  switch (status) {
    case 'affordable':
      return 'text-success';
    case 'tight':
      return 'text-warning';
    case 'exceeds-budget':
      return 'text-destructive';
  }
};
