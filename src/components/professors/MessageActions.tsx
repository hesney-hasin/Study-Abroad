import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderPlus, Download, Plus, Check, Sheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { ParsedProfessor } from '@/lib/professorParser';
import type { ProfessorFolder } from '@/hooks/useProfessorFolders';
import { CustomExportDialog } from './CustomExportDialog';

interface MessageActionsProps {
  professors: ParsedProfessor[];
  folders: ProfessorFolder[];
  onSaveToFolder: (professor: ParsedProfessor, folderId: string) => Promise<boolean>;
  onCreateFolder: (name: string) => Promise<any>;
  onExportCsv: (professors: ParsedProfessor[]) => void;
  isAuthenticated: boolean;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  professors,
  folders,
  onSaveToFolder,
  onCreateFolder,
  onExportCsv,
  isAuthenticated,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [savingProf, setSavingProf] = useState<ParsedProfessor | null>(null);
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());
  const [exportType, setExportType] = useState<'csv' | 'sheets' | null>(null);

  if (professors.length === 0) return null;

  const handleSave = async (prof: ParsedProfessor, folderId: string) => {
    const ok = await onSaveToFolder(prof, folderId);
    if (ok) setSavedSet(prev => new Set(prev).add(prof.name));
    setSavingProf(null);
  };

  const handleCreateAndSave = async () => {
    if (!newFolderName.trim()) return;
    const folder = await onCreateFolder(newFolderName.trim());
    if (folder && savingProf) {
      await handleSave(savingProf, folder.id);
    }
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const handleSignIn = () => {
    navigate('/auth');
  };

  return (
    <>
      <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border/50">
        {/* Save individual professors */}
        {professors.map((prof) => (
          <DropdownMenu key={prof.name}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                disabled={savedSet.has(prof.name)}
              >
                {savedSet.has(prof.name) ? (
                  <><Check className="h-3 w-3" /> Saved {prof.name.split(' ').pop()}</>
                ) : (
                  <><FolderPlus className="h-3 w-3" /> Save {prof.name.split(' ').pop()}</>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {!isAuthenticated ? (
                <DropdownMenuItem onClick={handleSignIn} className="text-xs cursor-pointer">
                  🔑 Sign in to save professors
                </DropdownMenuItem>
              ) : (
                <>
                  {folders.length === 0 && (
                    <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                      No folders yet
                    </DropdownMenuItem>
                  )}
                  {folders.map((f) => (
                    <DropdownMenuItem
                      key={f.id}
                      onClick={() => handleSave(prof, f.id)}
                      className="text-xs"
                    >
                      📁 {f.name} ({f.professor_count || 0})
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => { setSavingProf(prof); setShowNewFolder(true); }}
                    className="text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" /> New Folder
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ))}

        <div className="border-l border-border/50 mx-1" />

        {/* Export options — open custom dialog */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
          onClick={() => setExportType('csv')}
        >
          <Download className="h-3 w-3" /> CSV
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
          onClick={() => setExportType('sheets')}
        >
          <Sheet className="h-3 w-3" /> Google Sheets
        </Button>
      </div>

      {/* Custom export dialog */}
      {exportType && (
        <CustomExportDialog
          open={!!exportType}
          onOpenChange={(open) => !open && setExportType(null)}
          professors={professors}
          exportType={exportType}
        />
      )}

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
            onKeyDown={(e) => e.key === 'Enter' && handleCreateAndSave()}
          />
          <DialogFooter>
            <Button size="sm" variant="ghost" onClick={() => setShowNewFolder(false)}>Cancel</Button>
            <Button size="sm" onClick={handleCreateAndSave} disabled={!newFolderName.trim()}>
              Create & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};