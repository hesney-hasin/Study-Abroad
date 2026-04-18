import { StudentProfile } from '@/types';

/**
 * Normalize CGPA to a 4.0 scale
 */
export const normalizeCGPA = (cgpa: number, scale: number): number => {
  if (scale === 4.0) return cgpa;
  if (scale === 5.0) return (cgpa / 5.0) * 4.0;
  if (scale === 10.0) return (cgpa / 10.0) * 4.0;
  // Default assumption for other scales
  return (cgpa / scale) * 4.0;
};

/**
 * Map major to standardized category
 */
export const mapMajorToCategory = (major: string): string => {
  const majorLower = major.toLowerCase();
  
  const stemMajors = [
    'computer science', 'engineering', 'mathematics', 'physics', 
    'chemistry', 'biology', 'data science', 'software', 'electrical',
    'mechanical', 'civil', 'chemical', 'biomedical', 'aerospace',
    'information technology', 'it', 'cse', 'eee', 'ece'
  ];
  
  const businessMajors = [
    'business', 'management', 'finance', 'accounting', 'economics',
    'marketing', 'mba', 'commerce', 'bba'
  ];
  
  const socialScienceMajors = [
    'psychology', 'sociology', 'political science', 'international relations',
    'anthropology', 'history', 'philosophy', 'law'
  ];
  
  const artsMajors = [
    'art', 'design', 'music', 'literature', 'language', 'communication',
    'journalism', 'media', 'film'
  ];
  
  const healthMajors = [
    'medicine', 'pharmacy', 'nursing', 'public health', 'dentistry',
    'physiotherapy', 'medical'
  ];
  
  if (stemMajors.some(m => majorLower.includes(m))) return 'STEM';
  if (businessMajors.some(m => majorLower.includes(m))) return 'Business';
  if (socialScienceMajors.some(m => majorLower.includes(m))) return 'Social Sciences';
  if (artsMajors.some(m => majorLower.includes(m))) return 'Arts & Humanities';
  if (healthMajors.some(m => majorLower.includes(m))) return 'Health Sciences';
  
  return 'Other';
};

/**
 * Standardize and validate test scores
 */
export const standardizeTestScores = (profile: StudentProfile): {
  hasValidIELTS: boolean;
  hasValidTOEFL: boolean;
  hasValidGRE: boolean;
  ieltsScore: number | null;
  toeflScore: number | null;
  greTotal: number | null;
} => {
  const hasValidIELTS = profile.ielts !== undefined && profile.ielts >= 0 && profile.ielts <= 9;
  const hasValidTOEFL = profile.toefl !== undefined && profile.toefl >= 0 && profile.toefl <= 120;
  const hasValidGRE = profile.gre !== undefined && 
    profile.gre.total >= 260 && profile.gre.total <= 340;
  
  return {
    hasValidIELTS,
    hasValidTOEFL,
    hasValidGRE,
    ieltsScore: hasValidIELTS ? profile.ielts! : null,
    toeflScore: hasValidTOEFL ? profile.toefl! : null,
    greTotal: hasValidGRE ? profile.gre!.total : null,
  };
};

/**
 * Get normalized profile with standardized values
 */
export const getNormalizedProfile = (profile: StudentProfile) => {
  const normalizedCGPA = normalizeCGPA(profile.cgpa, profile.cgpaScale);
  const majorCategory = mapMajorToCategory(profile.major);
  const testScores = standardizeTestScores(profile);
  
  return {
    ...profile,
    normalizedCGPA,
    majorCategory,
    testScores,
  };
};
