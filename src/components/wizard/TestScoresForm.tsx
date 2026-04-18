import React from 'react';
import { StudentProfile } from '@/types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Languages, PenTool, Calculator } from 'lucide-react';

interface TestScoresFormProps {
  data: Partial<StudentProfile>;
  onChange: (data: Partial<StudentProfile>) => void;
}

export const TestScoresForm: React.FC<TestScoresFormProps> = ({ data, onChange }) => {
  const updateField = <K extends keyof StudentProfile>(field: K, value: StudentProfile[K]) => {
    onChange({ ...data, [field]: value });
  };

  const updateGRE = (field: keyof NonNullable<StudentProfile['gre']>, value: number) => {
    const currentGRE = data.gre || { verbal: 0, quantitative: 0, writing: 0, total: 0 };
    const updatedGRE = { ...currentGRE, [field]: value };
    if (field !== 'total') {
      updatedGRE.total = updatedGRE.verbal + updatedGRE.quantitative;
    }
    onChange({ ...data, gre: updatedGRE });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Section header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-full bg-violet-500/10">
          <PenTool className="w-5 h-5 text-violet-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Test Scores</h3>
          <p className="text-xs text-muted-foreground">Optional but recommended. Leave blank if not taken yet.</p>
        </div>
      </div>

      {/* English Proficiency */}
      <div className="space-y-6 p-5 rounded-xl bg-violet-500/5 border border-violet-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-violet-500/10">
            <Languages className="w-5 h-5 text-violet-500" />
          </div>
          <h3 className="text-lg font-semibold">English Proficiency</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* IELTS */}
          <div className="input-group">
            <Label htmlFor="ielts">IELTS Score (0-9)</Label>
            <div className="mt-3 space-y-3">
              <Slider
                value={[data.ielts || 0]}
                onValueChange={([val]) => updateField('ielts', val)}
                max={9}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Score: {data.ielts || 'Not taken'}</span>
                <Input
                  id="ielts"
                  type="number"
                  step="0.5"
                  min="0"
                  max="9"
                  className="w-20 text-center"
                  value={data.ielts || ''}
                  onChange={(e) => updateField('ielts', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* TOEFL */}
          <div className="input-group">
            <Label htmlFor="toefl">TOEFL iBT Score (0-120)</Label>
            <div className="mt-3 space-y-3">
              <Slider
                value={[data.toefl || 0]}
                onValueChange={([val]) => updateField('toefl', val)}
                max={120}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Score: {data.toefl || 'Not taken'}</span>
                <Input
                  id="toefl"
                  type="number"
                  min="0"
                  max="120"
                  className="w-20 text-center"
                  value={data.toefl || ''}
                  onChange={(e) => updateField('toefl', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GRE Scores */}
      <div className="space-y-6 p-5 rounded-xl bg-violet-500/5 border border-violet-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-violet-500/10">
            <Calculator className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">GRE Scores</h3>
            <p className="text-sm text-muted-foreground">Optional for most European programs</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Verbal */}
          <div className="input-group">
            <Label htmlFor="gre-verbal">Verbal (130-170)</Label>
            <Input
              id="gre-verbal"
              type="number"
              min="130"
              max="170"
              placeholder="e.g., 155"
              value={data.gre?.verbal || ''}
              onChange={(e) => updateGRE('verbal', parseInt(e.target.value) || 0)}
              className="mt-2"
            />
          </div>

          {/* Quantitative */}
          <div className="input-group">
            <Label htmlFor="gre-quant">Quantitative (130-170)</Label>
            <Input
              id="gre-quant"
              type="number"
              min="130"
              max="170"
              placeholder="e.g., 165"
              value={data.gre?.quantitative || ''}
              onChange={(e) => updateGRE('quantitative', parseInt(e.target.value) || 0)}
              className="mt-2"
            />
          </div>

          {/* Writing */}
          <div className="input-group">
            <Label htmlFor="gre-writing">Analytical Writing (0-6)</Label>
            <Input
              id="gre-writing"
              type="number"
              step="0.5"
              min="0"
              max="6"
              placeholder="e.g., 4.0"
              value={data.gre?.writing || ''}
              onChange={(e) => updateGRE('writing', parseFloat(e.target.value) || 0)}
              className="mt-2"
            />
          </div>
        </div>

        {data.gre?.verbal && data.gre?.quantitative && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center p-3 rounded-lg bg-muted/50"
          >
            <span className="text-sm text-muted-foreground">
              Total GRE Score: <span className="font-bold text-foreground">{data.gre.total}/340</span>
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
