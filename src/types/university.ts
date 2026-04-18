export interface University {
  id: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  flagEmoji: string;
  type: 'Public' | 'Private';
  tuitionMin: number;
  tuitionMax: number;
  currency: string;
  degreeTypes: string[];
  teachingLanguages: string[];
  ranking?: number;
  scholarshipsAvailable: boolean;
  researchFocus?: boolean;
  popularPrograms: string[];
  description: string;
  website: string;
  imageKeyword?: string;
}

export interface UniversityFilters {
  country?: string;
  degreeLevel?: string;
  tuitionMax?: number;
  language?: string;
  category?: string;
  field?: string;
}
