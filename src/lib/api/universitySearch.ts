import { supabase } from '@/integrations/supabase/client';
import { University, UniversityFilters } from '@/types/university';

export async function searchUniversities(
  query: string,
  filters: UniversityFilters
): Promise<University[]> {
  const { data, error } = await supabase.functions.invoke('university-search', {
    body: { query, filters },
  });

  if (error) {
    console.error('University search error:', error);
    throw new Error(error.message || 'Failed to search universities');
  }

  return data?.universities || [];
}
