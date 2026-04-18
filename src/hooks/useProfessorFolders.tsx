import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { ParsedProfessor } from '@/lib/professorParser';

export interface ProfessorFolder {
    id: string;
    name: string;
    created_at: string;
    professor_count?: number;
}

export function useProfessorFolders() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [folders, setFolders] = useState<ProfessorFolder[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchFolders = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('professor_folders')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (!error && data) {
            // Get counts
            const { data: counts } = await supabase
                .from('saved_professors')
                .select('folder_id')
                .eq('user_id', user.id);

            const countMap: Record<string, number> = {};
            counts?.forEach(c => {
                if (c.folder_id) countMap[c.folder_id] = (countMap[c.folder_id] || 0) + 1;
            });

            setFolders(data.map(f => ({ ...f, professor_count: countMap[f.id] || 0 })));
        }
        setLoading(false);
    }, [user]);

    useEffect(() => { fetchFolders(); }, [fetchFolders]);

    const createFolder = async (name: string) => {
        if (!user) return null;
        const { data, error } = await supabase
            .from('professor_folders')
            .insert({ user_id: user.id, name })
            .select()
            .single();

        if (error) {
            toast({ title: 'Error', description: 'Failed to create folder', variant: 'destructive' });
            return null;
        }
        await fetchFolders();
        return data;
    };

    const saveProfessor = async (professor: ParsedProfessor, folderId: string) => {
        if (!user) {
            toast({ title: 'Sign in required', description: 'Please sign in to save professors', variant: 'destructive' });
            return false;
        }

        const { error } = await supabase
            .from('saved_professors')
            .insert({
                user_id: user.id,
                folder_id: folderId,
                professor_name: professor.name,
                university: professor.university || null,
                department: professor.department || null,
                research_areas: professor.researchAreas,
                email: professor.email || null,
                profile_url: professor.profileUrl || null,
                funding_status: professor.fundingStatus || null,
                notes: professor.fitReason || null,
                raw_data: professor as any,
            });

        if (error) {
            toast({ title: 'Error', description: 'Failed to save professor', variant: 'destructive' });
            return false;
        }

        toast({ title: 'Saved!', description: `${professor.name} saved to folder` });
        await fetchFolders();
        return true;
    };

    const deleteFolder = async (folderId: string) => {
        if (!user) return;
        await supabase.from('professor_folders').delete().eq('id', folderId);
        await fetchFolders();
    };

    return { folders, loading, createFolder, saveProfessor, deleteFolder, fetchFolders };
}
