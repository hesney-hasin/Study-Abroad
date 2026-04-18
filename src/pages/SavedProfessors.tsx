import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Folder, Trash2, ExternalLink, Mail, Download, Sheet, Plus, ChevronRight, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useProfessorFolders } from '@/hooks/useProfessorFolders';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { professorsToCsv, downloadCsv, type ParsedProfessor } from '@/lib/professorParser';

interface SavedProfessor {
    id: string;
    professor_name: string;
    university: string | null;
    department: string | null;
    research_areas: string[] | null;
    email: string | null;
    profile_url: string | null;
    funding_status: string | null;
    notes: string | null;
    raw_data: any;
    created_at: string;
}

const SavedProfessors = () => {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const { folders, createFolder, deleteFolder, fetchFolders } = useProfessorFolders();
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
    const [professors, setProfessors] = useState<SavedProfessor[]>([]);
    const [loadingProfs, setLoadingProfs] = useState(false);
    const [showNewFolder, setShowNewFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/auth');
        }
    }, [user, authLoading, navigate]);

    // Fetch professors for selected folder
    useEffect(() => {
        if (!selectedFolder || !user) { setProfessors([]); return; }
        setLoadingProfs(true);
        supabase
            .from('saved_professors')
            .select('*')
            .eq('folder_id', selectedFolder)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .then(({ data, error }) => {
                if (!error && data) setProfessors(data as SavedProfessor[]);
                setLoadingProfs(false);
            });
    }, [selectedFolder, user]);

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        await createFolder(newFolderName.trim());
        setNewFolderName('');
        setShowNewFolder(false);
    };

    const handleDeleteFolder = async (folderId: string) => {
        await deleteFolder(folderId);
        if (selectedFolder === folderId) {
            setSelectedFolder(null);
            setProfessors([]);
        }
    };

    const handleDeleteProfessor = async (profId: string) => {
        await supabase.from('saved_professors').delete().eq('id', profId);
        setProfessors(prev => prev.filter(p => p.id !== profId));
        fetchFolders(); // refresh counts
        toast({ title: 'Deleted', description: 'Professor removed from folder' });
    };

    const handleExportCsv = () => {
        const parsed: ParsedProfessor[] = professors.map(p => ({
            name: p.professor_name,
            university: p.university || undefined,
            department: p.department || undefined,
            researchAreas: p.research_areas || [],
            email: p.email || undefined,
            profileUrl: p.profile_url || undefined,
            fundingStatus: p.funding_status || undefined,
            fitReason: p.notes || undefined,
        }));
        const csv = professorsToCsv(parsed);
        const folderName = folders.find(f => f.id === selectedFolder)?.name || 'professors';
        downloadCsv(csv, `${folderName.replace(/\s+/g, '-').toLowerCase()}.csv`);
    };

    const handleGoogleSheets = () => {
        const headers = ['Name', 'University', 'Department', 'Research Areas', 'Email', 'Profile URL', 'Funding', 'Notes'];
        const rows = professors.map(p => [
            p.professor_name,
            p.university || '',
            p.department || '',
            (p.research_areas || []).join('; '),
            p.email || '',
            p.profile_url || '',
            p.funding_status || '',
            p.notes || '',
        ]);
        const tsv = [headers, ...rows].map(r => r.join('\t')).join('\n');
        navigator.clipboard.writeText(tsv).then(() => {
            window.open('https://docs.google.com/spreadsheets/create', '_blank');
            toast({
                title: '📋 Data copied!',
                description: 'Google Sheet is opening — press Ctrl+V (or ⌘+V) to paste.',
            });
        });
    };

    if (authLoading) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 via-pink-50/50 to-background dark:from-violet-950/30 dark:via-pink-950/20 dark:to-background relative flex flex-col overflow-hidden">
            <div className="absolute top-10 left-0 w-72 h-72 bg-violet-400/10 dark:bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-20 right-10 w-56 h-56 bg-pink-400/10 dark:bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />
            {/* Header */}
            <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Folder className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-sm font-bold font-display text-foreground">Saved Professors</h1>
                                <p className="text-[10px] text-muted-foreground">Manage your professor folders</p>
                            </div>
                        </div>
                    </div>
                    <ThemeToggle />
                </div>
            </header>

            <div className="flex-1 container mx-auto max-w-5xl px-4 py-6">
                <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
                    {/* Sidebar: Folders */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-foreground">Folders</h2>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowNewFolder(true)}>
                                <Plus className="h-3 w-3 mr-1" /> New
                            </Button>
                        </div>

                        {folders.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Folder className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                <p className="text-xs">No folders yet</p>
                                <p className="text-[10px] mt-1">Save professors from the AI Professor Finder</p>
                                <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => navigate('/professors')}>
                                    <GraduationCap className="h-3 w-3 mr-1" /> Go to Professor Finder
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {folders.map((folder) => (
                                    <div
                                        key={folder.id}
                                        className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${selectedFolder === folder.id
                                                ? 'bg-primary/10 text-primary font-medium'
                                                : 'hover:bg-accent text-foreground'
                                            }`}
                                        onClick={() => setSelectedFolder(folder.id)}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Folder className="h-4 w-4 flex-shrink-0" />
                                            <span className="truncate text-xs">{folder.name}</span>
                                            <span className="text-[10px] text-muted-foreground">({folder.professor_count || 0})</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                            onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                                        >
                                            <Trash2 className="h-3 w-3 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Main: Professor list */}
                    <div>
                        {!selectedFolder ? (
                            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                <ChevronRight className="h-8 w-8 mb-2 opacity-40" />
                                <p className="text-sm">Select a folder to view saved professors</p>
                            </div>
                        ) : (
                            <>
                                {/* Toolbar */}
                                {professors.length > 0 && (
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-xs text-muted-foreground">{professors.length} professor{professors.length !== 1 ? 's' : ''}</span>
                                        <div className="flex-1" />
                                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleExportCsv}>
                                            <Download className="h-3 w-3" /> CSV
                                        </Button>
                                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleGoogleSheets}>
                                            <Sheet className="h-3 w-3" /> Google Sheets
                                        </Button>
                                    </div>
                                )}

                                {loadingProfs ? (
                                    <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
                                ) : professors.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                        <p className="text-sm">No professors saved in this folder</p>
                                        <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => navigate('/professors')}>
                                            Find Professors
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <AnimatePresence>
                                            {professors.map((prof) => (
                                                <motion.div
                                                    key={prof.id}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, x: -20 }}
                                                    className="bg-card border border-border rounded-xl p-4"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className="text-sm font-semibold text-foreground">{prof.professor_name}</h3>
                                                            {prof.university && (
                                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                                    🏛️ {prof.university}{prof.department ? ` — ${prof.department}` : ''}
                                                                </p>
                                                            )}
                                                            {prof.research_areas && prof.research_areas.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mt-2">
                                                                    {prof.research_areas.map((area, i) => (
                                                                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                                                            {area}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-3 mt-2">
                                                                {prof.email && (
                                                                    <a href={`mailto:${prof.email}`} className="text-[11px] text-primary flex items-center gap-1 hover:underline">
                                                                        <Mail className="h-3 w-3" /> {prof.email}
                                                                    </a>
                                                                )}
                                                                {prof.profile_url && (
                                                                    <a href={prof.profile_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary flex items-center gap-1 hover:underline">
                                                                        <ExternalLink className="h-3 w-3" /> Profile
                                                                    </a>
                                                                )}
                                                            </div>
                                                            {prof.funding_status && (
                                                                <p className="text-[11px] text-muted-foreground mt-1">💰 {prof.funding_status}</p>
                                                            )}
                                                            {prof.notes && (
                                                                <p className="text-[11px] text-muted-foreground mt-1">✅ {prof.notes}</p>
                                                            )}
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                                            onClick={() => handleDeleteProfessor(prof.id)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* New folder dialog */}
            <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="text-sm">Create New Folder</DialogTitle>
                    </DialogHeader>
                    <Input
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="e.g. MIT CS Professors"
                        className="text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                    />
                    <DialogFooter>
                        <Button size="sm" variant="ghost" onClick={() => setShowNewFolder(false)}>Cancel</Button>
                        <Button size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim()}>Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SavedProfessors;
