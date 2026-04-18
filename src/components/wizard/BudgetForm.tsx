import React from 'react';
import { StudentProfile } from '@/types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Wallet, TrendingUp, HelpCircle } from 'lucide-react';
import { formatCurrency } from '@/engines/costEngine';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BudgetFormProps {
  data: Partial<StudentProfile>;
  onChange: (data: Partial<StudentProfile>) => void;
}

const MIN_BUDGET = 5000;
const MAX_BUDGET = 200000;
const STEP = 5000;
const MIN_GAP = 5000;

const budgetRanges = [
  { label: 'Limited', min: 10000, max: 25000, description: 'Part scholarships needed' },
  { label: 'Moderate', min: 25000, max: 50000, description: 'Covers affordable destinations' },
  { label: 'Comfortable', min: 50000, max: 100000, description: 'Most options available' },
  { label: 'Flexible', min: 100000, max: 200000, description: 'Full flexibility' },
];

export const BudgetForm: React.FC<BudgetFormProps> = ({ data, onChange }) => {
  const budgetMin = data.budgetMin ?? 20000;
  const budgetMax = data.budgetMax ?? 50000;

  const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

  const updateBudget = (min: number, max: number) => {
    onChange({ ...data, budgetMin: min, budgetMax: max });
  };

  const updateField = <K extends keyof StudentProfile>(field: K, value: StudentProfile[K]) => {
    onChange({ ...data, [field]: value });
  };

  const handleSliderChange = (values: number[]) => {
    let [newMin, newMax] = values;
    newMin = clamp(newMin, MIN_BUDGET, MAX_BUDGET - MIN_GAP);
    newMax = clamp(newMax, newMin + MIN_GAP, MAX_BUDGET);
    updateBudget(newMin, newMax);
  };

  const handleMinInput = (raw: string) => {
    const parsed = parseInt(raw) || MIN_BUDGET;
    const newMin = clamp(parsed, MIN_BUDGET, budgetMax - MIN_GAP);
    updateBudget(newMin, budgetMax);
  };

  const handleMaxInput = (raw: string) => {
    const parsed = parseInt(raw) || MAX_BUDGET;
    const newMax = clamp(parsed, budgetMin + MIN_GAP, MAX_BUDGET);
    updateBudget(budgetMin, newMax);
  };

  const selectPreset = (min: number, max: number) => {
    updateBudget(min, max);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-full bg-amber-500/10">
          <Wallet className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Budget & Goals</h3>
          <p className="text-xs text-muted-foreground">Plan your financial investment for studying abroad</p>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-lg bg-info/10 border border-info/30">
        <TrendingUp className="w-5 h-5 text-info mt-0.5" />
        <div>
          <p className="text-sm font-medium text-info-foreground">
            Your total budget for the entire program
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Include tuition fees, living expenses, travel, and insurance for the full duration of your studies.
          </p>
        </div>
      </div>

      <div className="input-group">
        <div className="flex items-center gap-2">
          <Label className="text-base">Quick Select Budget Range</Label>
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-xs">
                These are approximate total costs for a 2-year Master's program including tuition and living expenses.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          {budgetRanges.map((range) => {
            const isSelected = budgetMin === range.min && budgetMax === range.max;
            return (
              <motion.button
                key={range.label}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => selectPreset(range.min, range.max)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all duration-200 ${
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                <span className="font-semibold text-sm">{range.label}</span>
                <span className="text-xs text-muted-foreground">
                  {formatCurrency(range.min)} - {formatCurrency(range.max)}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="space-y-6 p-5 rounded-xl bg-amber-500/5 border border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-amber-500/10">
            <Wallet className="w-5 h-5 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold">Custom Budget Range</h3>
        </div>

        <div className="space-y-4">
          <Slider
            value={[budgetMin, budgetMax]}
            onValueChange={handleSliderChange}
            min={MIN_BUDGET}
            max={MAX_BUDGET}
            step={STEP}
            minStepsBetweenThumbs={1}
            className="w-full"
          />

          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">{formatCurrency(MIN_BUDGET)}</span>
            <span className="text-muted-foreground">{formatCurrency(MAX_BUDGET)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="input-group">
            <Label htmlFor="budgetMin">Minimum Budget (EUR)</Label>
            <Input
              id="budgetMin"
              type="number"
              min={MIN_BUDGET}
              max={budgetMax - MIN_GAP}
              step="1000"
              value={budgetMin}
              onChange={(e) => handleMinInput(e.target.value)}
              className="mt-2"
            />
          </div>
          <div className="input-group">
            <Label htmlFor="budgetMax">Maximum Budget (EUR)</Label>
            <Input
              id="budgetMax"
              type="number"
              min={budgetMin + MIN_GAP}
              max={MAX_BUDGET}
              step="1000"
              value={budgetMax}
              onChange={(e) => handleMaxInput(e.target.value)}
              className="mt-2"
            />
          </div>
        </div>

        <motion.div
          key={`${budgetMin}-${budgetMax}`}
          initial={{ opacity: 0.5, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center p-4 rounded-lg bg-gradient-hero text-primary-foreground"
        >
          <span className="text-lg font-bold">
            {formatCurrency(budgetMin)} — {formatCurrency(budgetMax)}
          </span>
        </motion.div>
      </div>

      <div className="input-group">
        <Label htmlFor="program">Preferred Program/Specialization (Optional)</Label>
        <Input
          id="program"
          placeholder="e.g., Data Science, Renewable Energy, Machine Learning"
          value={data.programPreference || ''}
          onChange={(e) => updateField('programPreference', e.target.value)}
          className="mt-2"
        />
        <p className="text-xs text-muted-foreground mt-1">
          This helps us find more relevant scholarship opportunities
        </p>
      </div>
    </motion.div>
  );
};
