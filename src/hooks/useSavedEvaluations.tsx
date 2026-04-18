import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { StudentProfile, EvaluationResult } from '@/types';
import { toast } from 'sonner';

export interface SavedEvaluation {
  id: string;
  name: string;
  profile_data: StudentProfile;
  result_data: EvaluationResult;
  created_at: string;
  updated_at: string;
}

export function useSavedEvaluations() {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<SavedEvaluation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvaluations = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_evaluations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Parse the JSONB data properly
      const parsed = (data || []).map(item => ({
        ...item,
        profile_data: item.profile_data as unknown as StudentProfile,
        result_data: item.result_data as unknown as EvaluationResult,
      }));
      
      setEvaluations(parsed);
    } catch (error: any) {
      console.error('Error fetching evaluations:', error);
      toast.error('Failed to load saved evaluations');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveEvaluation = useCallback(async (
    name: string,
    profile: StudentProfile,
    result: EvaluationResult
  ): Promise<SavedEvaluation | null> => {
    if (!user) {
      toast.error('Please log in to save evaluations');
      return null;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_evaluations')
        .insert({
          user_id: user.id,
          name,
          profile_data: profile as any,
          result_data: result as any,
        })
        .select()
        .single();

      if (error) throw error;

      const saved: SavedEvaluation = {
        ...data,
        profile_data: data.profile_data as unknown as StudentProfile,
        result_data: data.result_data as unknown as EvaluationResult,
      };

      setEvaluations(prev => [saved, ...prev]);
      toast.success('Evaluation saved successfully!');
      return saved;
    } catch (error: any) {
      console.error('Error saving evaluation:', error);
      toast.error('Failed to save evaluation');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const deleteEvaluation = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('saved_evaluations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEvaluations(prev => prev.filter(e => e.id !== id));
      toast.success('Evaluation deleted');
      return true;
    } catch (error: any) {
      console.error('Error deleting evaluation:', error);
      toast.error('Failed to delete evaluation');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const renameEvaluation = useCallback(async (id: string, newName: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('saved_evaluations')
        .update({ name: newName })
        .eq('id', id);

      if (error) throw error;

      setEvaluations(prev => prev.map(e => 
        e.id === id ? { ...e, name: newName } : e
      ));
      return true;
    } catch (error: any) {
      console.error('Error renaming evaluation:', error);
      toast.error('Failed to rename evaluation');
      return false;
    }
  }, [user]);

  return {
    evaluations,
    loading,
    fetchEvaluations,
    saveEvaluation,
    deleteEvaluation,
    renameEvaluation,
  };
}
