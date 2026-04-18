import { StudentProfile, Country, NextStep } from '@/types';

/**
 * External Reference Linking Module
 * Provide static, authoritative links and next steps
 */

export const generateNextSteps = (
  profile: StudentProfile,
  country: Country,
  hasScholarshipMatches: boolean
): NextStep[] => {
  const steps: NextStep[] = [];
  let priority = 1;

  // 1. Research programs
  steps.push({
    priority: priority++,
    title: `Research ${profile.degreeLevel} programs in ${country.name}`,
    description: `Explore available ${profile.degreeLevel === 'phd' ? 'doctoral' : profile.degreeLevel} programs matching your interests`,
    link: country.officialLinks.mainPortal,
  });

  // 2. English test if missing
  if (!profile.ielts && !profile.toefl) {
    steps.push({
      priority: priority++,
      title: 'Take English proficiency test',
      description: `IELTS ${country.requirements.minIELTS}+ or TOEFL ${country.requirements.minTOEFL}+ recommended`,
      link: 'https://www.ielts.org/for-test-takers/book-a-test',
    });
  }

  // 3. Scholarship research
  if (country.officialLinks.scholarshipPortal) {
    steps.push({
      priority: priority++,
      title: hasScholarshipMatches ? 'Apply for matching scholarships' : 'Explore scholarship options',
      description: `Research funding opportunities for ${country.name}`,
      link: country.officialLinks.scholarshipPortal,
    });
  }

  // 4. Visa information
  steps.push({
    priority: priority++,
    title: 'Review visa requirements',
    description: `Understand student visa process for ${country.name}`,
    link: country.officialLinks.visaInfo,
  });

  // 5. Document preparation
  steps.push({
    priority: priority++,
    title: 'Prepare required documents',
    description: 'Gather transcripts, recommendation letters, and motivation statement',
  });

  // PhD specific steps
  if (profile.degreeLevel === 'phd') {
    steps.push({
      priority: priority++,
      title: 'Identify potential supervisors',
      description: 'Research professors whose work aligns with your interests and reach out',
    });
  }

  return steps;
};

/**
 * Get general resource links
 */
export const getGeneralResources = (): { title: string; url: string; description: string }[] => [
  {
    title: 'DAAD Database',
    url: 'https://www.daad.de/en/study-and-research-in-germany/',
    description: 'Comprehensive database of programs and scholarships in Germany',
  },
  {
    title: 'Study in Europe',
    url: 'https://education.ec.europa.eu/study-in-europe',
    description: 'Official EU portal for studying in Europe',
  },
  {
    title: 'Erasmus+ Program',
    url: 'https://erasmus-plus.ec.europa.eu/',
    description: 'EU program for education, training, and youth',
  },
  {
    title: 'IELTS Registration',
    url: 'https://www.ielts.org/for-test-takers/book-a-test',
    description: 'Book your IELTS test',
  },
  {
    title: 'GRE Registration',
    url: 'https://www.ets.org/gre',
    description: 'Register for GRE General Test',
  },
];

/**
 * Get country-specific resources
 */
export const getCountryResources = (countryId: string): { title: string; url: string }[] => {
  const resources: Record<string, { title: string; url: string }[]> = {
    germany: [
      { title: 'DAAD Scholarship Database', url: 'https://www.daad.de/en/study-and-research-in-germany/scholarships/' },
      { title: 'Uni-Assist Application Portal', url: 'https://www.uni-assist.de/' },
      { title: 'Study in Germany Official', url: 'https://www.study-in-germany.de/' },
    ],
    finland: [
      { title: 'Study in Finland', url: 'https://www.studyinfinland.fi/' },
      { title: 'Finnish University Admissions', url: 'https://www.studyinfo.fi/' },
      { title: 'Finnish Immigration Service', url: 'https://migri.fi/' },
    ],
    sweden: [
      { title: 'Swedish Institute Scholarships', url: 'https://si.se/en/apply/scholarships/' },
      { title: 'University Admissions Sweden', url: 'https://www.universityadmissions.se/' },
      { title: 'Study in Sweden', url: 'https://studyinsweden.se/' },
    ],
    netherlands: [
      { title: 'Study in Holland', url: 'https://www.studyinholland.nl/' },
      { title: 'Nuffic Scholarships', url: 'https://www.nuffic.nl/en/subjects/scholarships' },
      { title: 'Studielink Application', url: 'https://www.studielink.nl/' },
    ],
    italy: [
      { title: 'Study in Italy', url: 'https://www.study-in-italy.it/' },
      { title: 'Italian Government Scholarships', url: 'https://studyinitaly.esteri.it/' },
      { title: 'Universitaly Portal', url: 'https://www.universitaly.it/' },
    ],
  };

  return resources[countryId] || [];
};
