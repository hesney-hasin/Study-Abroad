import React from 'react';
import { CountryEvaluation } from '@/types';
import { ScoreRing } from '@/components/ui/score-ring';
import { StatusBadge } from '@/components/ui/status-badge';
import { motion } from 'framer-motion';
import { formatCostRange } from '@/engines/costEngine';
import { getScoreInterpretation } from '@/engines/scoringEngine';
import { 
  TrendingUp, 
  AlertTriangle, 
  ChevronRight,
  GraduationCap,
  Wallet,
  Award,
} from 'lucide-react';

interface CountryCardProps {
  evaluation: CountryEvaluation;
  index: number;
  onClick: () => void;
  isExpanded?: boolean;
}

export const CountryCard: React.FC<CountryCardProps> = ({ 
  evaluation, 
  index, 
  onClick,
  isExpanded 
}) => {
  const { country, feasibilityScore, eligibility, costEstimate, scholarshipMatches, risks } = evaluation;
  const interpretation = getScoreInterpretation(feasibilityScore.overall);
  
  const highRisks = risks.filter(r => r.severity === 'high').length;
  const hasScholarships = scholarshipMatches.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className={`card-elevated p-5 cursor-pointer ${
        isExpanded ? 'ring-2 ring-primary' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">{country.name}</h3>
          <span className={`text-xs font-medium ${interpretation.color}`}>
            {interpretation.label}
          </span>
        </div>
        <ScoreRing score={feasibilityScore.overall} size="md" />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Eligibility</p>
            <StatusBadge status={eligibility.status} className="mt-0.5">
              {eligibility.status === 'eligible' ? 'Eligible' : 
               eligibility.status === 'borderline' ? 'Borderline' : 'Review Needed'}
            </StatusBadge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Cost/Year</p>
            <p className="font-medium text-sm">
              {formatCostRange(costEstimate.totalPerYear.min, costEstimate.totalPerYear.max)}
            </p>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-4 gap-1.5 mb-4">
        {Object.entries(feasibilityScore.breakdown).map(([key, value]) => (
          <div key={key} className="text-center p-1.5 rounded-md bg-accent">
            <p className="text-[10px] text-muted-foreground capitalize">{key}</p>
            <p className="font-semibold text-xs">{value}%</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      <div className="flex flex-wrap gap-2 text-xs">
        {highRisks > 0 && (
          <span className="flex items-center gap-1 text-destructive">
            <AlertTriangle className="w-3 h-3" />
            {highRisks} risk{highRisks > 1 ? 's' : ''}
          </span>
        )}
        {hasScholarships && (
          <span className="flex items-center gap-1 text-success">
            <Award className="w-3 h-3" />
            {scholarshipMatches.length} scholarship{scholarshipMatches.length > 1 ? 's' : ''}
          </span>
        )}
        {costEstimate.affordabilityStatus === 'affordable' && (
          <span className="flex items-center gap-1 text-success">
            <TrendingUp className="w-3 h-3" />
            Within budget
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">View details</span>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
    </motion.div>
  );
};
