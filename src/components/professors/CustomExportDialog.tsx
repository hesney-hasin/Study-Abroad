import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { ParsedProfessor } from '@/lib/professorParser';
import { professorsToCsv, professorsToHtmlTable, downloadBlob, downloadCsv } from '@/lib/professorParser';
import { callAI, isLocal } from '@/lib/aiClient';

const ALL_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'title', label: 'Title' },
  { key: 'university', label: 'University' },
  { key: 'department', label: 'Department' },
  { key: 'researchAreas', label: 'Research Areas' },
  { key: 'email', label: 'Email' },
  { key: 'profileUrl', label: 'Profile URL' },
  { key: 'fundingStatus', label: 'Funding Status' },
  { key: 'recentWork', label: 'Recent Work' },
  { key: 'fitReason', label: 'Why a Good Fit' },
] as const;

type FieldKey = typeof ALL_FIELDS[number]['key'];

interface CustomExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professors: ParsedProfessor[];
  exportType: 'csv' | 'sheets';
}

export const CustomExportDialog: React.FC<CustomExportDialogProps> = ({
  open, onOpenChange, professors, exportType,
}) => {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<FieldKey>>(new Set(ALL_FIELDS.map(f => f.key)));
  const [nlInput, setNlInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  const toggle = (key: FieldKey) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (key === 'name') return next; // name always required
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleSmartSelect = async () => {
    if (!nlInput.trim()) return;
    setIsRefining(true);
    try {
      const allFieldKeys = ALL_FIELDS.map(f => f.key).join(', ');
      const prompt = `Given these available fields: [${allFieldKeys}], the user wants: "${nlInput.trim()}". Return a JSON object with a "selectedFields" array containing only the matching field keys. Always include "name".`;

      if (isLocal()) {
        const result = await callAI({
          messages: [{ role: 'user', content: prompt }],
          systemPrompt: 'You are a helper that returns JSON. Only return valid JSON with a "selectedFields" array.',
          edgeFunctionPath: 'export-refine',
        });
        try {
          const parsed = JSON.parse(result);
          if (parsed.selectedFields) {
            setSelected(new Set(parsed.selectedFields as FieldKey[]));
            toast({ title: '✨ Fields updated', description: `Selected ${parsed.selectedFields.length} fields based on your description.` });
          }
        } catch {
          toast({ title: 'Error', description: 'Could not parse response. Please select fields manually.', variant: 'destructive' });
        }
      } else {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-refine`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ description: nlInput.trim() }),
          }
        );
        const data = await resp.json();
        if (data.selectedFields) {
          setSelected(new Set(data.selectedFields as FieldKey[]));
          toast({ title: '✨ Fields updated', description: `Selected ${data.selectedFields.length} fields based on your description.` });
        }
      }
    } catch {
      toast({ title: 'Error', description: 'Could not process your request. Please select fields manually.', variant: 'destructive' });
    } finally {
      setIsRefining(false);
    }
  };

  const handleExport = () => {
    const fields = Array.from(selected);
    if (exportType === 'csv') {
      const csv = professorsToCsv(professors, fields);
      downloadCsv(csv, `professors-${Date.now()}.csv`);
    } else {
      const html = professorsToHtmlTable(professors, fields);
      const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
      downloadBlob(blob, 'professors.xls');
    }
    toast({
      title: exportType === 'csv' ? '📄 CSV exported!' : '📊 File downloaded!',
      description: `Exported ${professors.length} professors with ${fields.length} fields.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">
            Custom Export — {exportType === 'csv' ? 'CSV' : 'Google Sheets'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Checkboxes */}
          <div className="grid grid-cols-2 gap-2">
            {ALL_FIELDS.map(f => (
              <label key={f.key} className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={selected.has(f.key)}
                  onCheckedChange={() => toggle(f.key)}
                  disabled={f.key === 'name'}
                />
                {f.label}
              </label>
            ))}
          </div>

          {/* NL input */}
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground">Or describe what you want:</p>
            <div className="flex gap-2">
              <Input
                value={nlInput}
                onChange={(e) => setNlInput(e.target.value)}
                placeholder='e.g. "only name, email, and university"'
                className="text-xs h-8"
                onKeyDown={(e) => e.key === 'Enter' && handleSmartSelect()}
              />
              <Button
                size="sm"
                variant="secondary"
                className="h-8 text-xs gap-1 shrink-0"
                onClick={handleSmartSelect}
                disabled={!nlInput.trim() || isRefining}
              >
                {isRefining ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Smart Select
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs"
            onClick={() => setSelected(new Set(ALL_FIELDS.map(f => f.key)))}
          >
            Select All
          </Button>
          <Button size="sm" onClick={handleExport} disabled={selected.size === 0}>
            Export ({selected.size} fields)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
