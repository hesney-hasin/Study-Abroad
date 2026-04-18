import React from 'react';
import { CountryEvaluation, StudentProfile } from '@/types';
import { Button } from '@/components/ui/button';
import { ScoreRing } from '@/components/ui/score-ring';
import { StatusBadge } from '@/components/ui/status-badge';
import { motion } from 'framer-motion';
import { formatCostRange, formatCurrency } from '@/engines/costEngine';
import { getScoreInterpretation } from '@/engines/scoringEngine';
import { 
  X, 
  ExternalLink,
  GraduationCap,
  Wallet,
  Award,
  Shield,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Download
} from 'lucide-react';
import { generateComparisonReport } from '@/utils/pdfExport';

interface ComparisonViewProps {
  evaluations: CountryEvaluation[];
  onClose: () => void;
  onRemoveCountry: (countryId: string) => void;
  profile?: StudentProfile;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ 
  evaluations, 
  onClose,
  onRemoveCountry,
  profile
}) => {
  if (evaluations.length === 0) return null;

  const handleExportPDF = () => {
    if (profile) {
      generateComparisonReport(evaluations, profile);
    }
  };

  const MetricRow: React.FC<{ 
    label: string; 
    icon: React.ReactNode;
    children: React.ReactNode;
  }> = ({ label, icon, children }) => (
    <div className="grid grid-cols-[200px_repeat(auto-fit,minmax(200px,1fr))] gap-4 py-4 border-b border-border">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background z-50 overflow-auto"
    >
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h2 className="text-xl font-bold">Compare Countries</h2>
          <div className="flex items-center gap-3">
            {profile && (
              <Button variant="default" onClick={handleExportPDF}>
                <Download className="w-4 h-4 mr-2" />
                Export Comparison PDF
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Country Headers */}
        <div className="grid grid-cols-[200px_repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-6">
          <div /> {/* Empty cell for label column */}
          {evaluations.map((evaluation, index) => (
            <motion.div
              key={evaluation.country.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative p-4 rounded-xl bg-card border border-border text-center"
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => onRemoveCountry(evaluation.country.id)}
              >
                <X className="w-4 h-4" />
              </Button>
              <span className="text-4xl block mb-2">{evaluation.country.flagEmoji}</span>
              <h3 className="text-lg font-bold">{evaluation.country.name}</h3>
            </motion.div>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="space-y-0 bg-card rounded-xl border border-border overflow-hidden">
          {/* Overall Score */}
          <MetricRow label="Feasibility Score" icon={<Shield className="w-4 h-4" />}>
            {evaluations.map((e) => {
              const interpretation = getScoreInterpretation(e.feasibilityScore.overall);
              return (
                <div key={e.country.id} className="flex flex-col items-center gap-2">
                  <ScoreRing score={e.feasibilityScore.overall} size="md" showLabel={false} />
                  <span className={`text-sm font-medium ${interpretation.color}`}>
                    {interpretation.label}
                  </span>
                </div>
              );
            })}
          </MetricRow>

          {/* Academic Score */}
          <MetricRow label="Academic Match" icon={<GraduationCap className="w-4 h-4" />}>
            {evaluations.map((e) => (
              <div key={e.country.id} className="flex flex-col items-center gap-1">
                <span className="text-2xl font-bold">{e.feasibilityScore.breakdown.academic}%</span>
                <StatusBadge status={e.eligibility.status}>
                  {e.eligibility.status}
                </StatusBadge>
              </div>
            ))}
          </MetricRow>

          {/* Financial Score */}
          <MetricRow label="Financial Fit" icon={<Wallet className="w-4 h-4" />}>
            {evaluations.map((e) => (
              <div key={e.country.id} className="flex flex-col items-center gap-1">
                <span className="text-2xl font-bold">{e.feasibilityScore.breakdown.financial}%</span>
                <StatusBadge 
                  status={e.costEstimate.affordabilityStatus === 'affordable' ? 'high' : 
                          e.costEstimate.affordabilityStatus === 'tight' ? 'medium' : 'low'}
                >
                  {e.costEstimate.affordabilityStatus}
                </StatusBadge>
              </div>
            ))}
          </MetricRow>

          {/* Scholarship Score */}
          <MetricRow label="Scholarship Potential" icon={<Award className="w-4 h-4" />}>
            {evaluations.map((e) => (
              <div key={e.country.id} className="flex flex-col items-center gap-1">
                <span className="text-2xl font-bold">{e.feasibilityScore.breakdown.scholarship}%</span>
                <span className="text-sm text-muted-foreground">
                  {e.scholarshipMatches.length} match{e.scholarshipMatches.length !== 1 ? 'es' : ''}
                </span>
              </div>
            ))}
          </MetricRow>

          {/* Risk Score */}
          <MetricRow label="Risk Level" icon={<AlertTriangle className="w-4 h-4" />}>
            {evaluations.map((e) => {
              const highRisks = e.risks.filter(r => r.severity === 'high').length;
              const medRisks = e.risks.filter(r => r.severity === 'medium').length;
              return (
                <div key={e.country.id} className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-bold">{e.feasibilityScore.breakdown.risk}%</span>
                  <div className="flex gap-2 text-xs">
                    {highRisks > 0 && (
                      <span className="text-destructive">{highRisks} high</span>
                    )}
                    {medRisks > 0 && (
                      <span className="text-warning">{medRisks} med</span>
                    )}
                    {highRisks === 0 && medRisks === 0 && (
                      <span className="text-success">Low risk</span>
                    )}
                  </div>
                </div>
              );
            })}
          </MetricRow>

          {/* Tuition Per Year */}
          <MetricRow label="Tuition / Year" icon={<GraduationCap className="w-4 h-4" />}>
            {evaluations.map((e) => (
              <div key={e.country.id} className="text-center">
                <span className="font-semibold">
                  {formatCostRange(e.costEstimate.tuitionPerYear.min, e.costEstimate.tuitionPerYear.max)}
                </span>
                {e.costEstimate.tuitionPerYear.max === 0 && (
                  <span className="block text-xs text-success">Free tuition available!</span>
                )}
              </div>
            ))}
          </MetricRow>

          {/* Living Costs */}
          <MetricRow label="Living Costs / Year" icon={<TrendingUp className="w-4 h-4" />}>
            {evaluations.map((e) => (
              <div key={e.country.id} className="text-center">
                <span className="font-semibold">
                  {formatCostRange(e.costEstimate.livingPerYear.min, e.costEstimate.livingPerYear.max)}
                </span>
              </div>
            ))}
          </MetricRow>

          {/* Total Program Cost */}
          <MetricRow label="Total Program Cost" icon={<Wallet className="w-4 h-4" />}>
            {evaluations.map((e) => (
              <div key={e.country.id} className="text-center">
                <span className="font-bold text-lg text-primary">
                  {formatCostRange(e.costEstimate.totalProgram.min, e.costEstimate.totalProgram.max)}
                </span>
                {e.costEstimate.budgetGap && (
                  <span className="block text-xs text-destructive">
                    Gap: {formatCurrency(e.costEstimate.budgetGap)}
                  </span>
                )}
              </div>
            ))}
          </MetricRow>

          {/* Program Duration */}
          <MetricRow label="Program Duration" icon={<Clock className="w-4 h-4" />}>
            {evaluations.map((e) => (
              <div key={e.country.id} className="text-center font-semibold">
                {e.costEstimate.programDuration} year{e.costEstimate.programDuration !== 1 ? 's' : ''}
              </div>
            ))}
          </MetricRow>

          {/* GRE Required */}
          <MetricRow label="GRE Required" icon={<CheckCircle2 className="w-4 h-4" />}>
            {evaluations.map((e) => (
              <div key={e.country.id} className="flex justify-center">
                {e.country.requirements.requiresGRE ? (
                  <span className="flex items-center gap-1 text-warning">
                    <AlertTriangle className="w-4 h-4" /> Usually required
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-success">
                    <CheckCircle2 className="w-4 h-4" /> Not required
                  </span>
                )}
              </div>
            ))}
          </MetricRow>

          {/* Min IELTS */}
          <MetricRow label="Min IELTS Score" icon={<GraduationCap className="w-4 h-4" />}>
            {evaluations.map((e) => (
              <div key={e.country.id} className="text-center font-semibold">
                {e.country.requirements.minIELTS || 'N/A'}
              </div>
            ))}
          </MetricRow>

          {/* Min CGPA */}
          <MetricRow label="Min CGPA (4.0 scale)" icon={<GraduationCap className="w-4 h-4" />}>
            {evaluations.map((e) => (
              <div key={e.country.id} className="text-center font-semibold">
                {e.country.requirements.minCGPA}
              </div>
            ))}
          </MetricRow>

          {/* Top Scholarship */}
          <MetricRow label="Top Scholarship" icon={<Award className="w-4 h-4" />}>
            {evaluations.map((e) => {
              const topScholarship = e.scholarshipMatches[0];
              return (
                <div key={e.country.id} className="text-center">
                  {topScholarship ? (
                    <div>
                      <p className="font-medium text-sm">{topScholarship.scholarship.name}</p>
                      <StatusBadge status={topScholarship.feasibility} className="mt-1">
                        {topScholarship.matchScore}% match
                      </StatusBadge>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">No matches</span>
                  )}
                </div>
              );
            })}
          </MetricRow>

          {/* Official Portal */}
          <MetricRow label="Official Portal" icon={<ExternalLink className="w-4 h-4" />}>
            {evaluations.map((e) => (
              <div key={e.country.id} className="text-center">
                <Button variant="link" size="sm" asChild className="h-auto p-0">
                  <a href={e.country.officialLinks.mainPortal} target="_blank" rel="noopener noreferrer">
                    Visit Portal <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </Button>
              </div>
            ))}
          </MetricRow>
        </div>

        {/* Winner Highlight */}
        {evaluations.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 p-6 rounded-xl bg-gradient-hero text-primary-foreground text-center"
          >
            <h3 className="text-lg font-semibold mb-2">🏆 Best Match</h3>
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl">
                {evaluations.reduce((best, current) => 
                  current.feasibilityScore.overall > best.feasibilityScore.overall ? current : best
                ).country.flagEmoji}
              </span>
              <span className="text-2xl font-bold">
                {evaluations.reduce((best, current) => 
                  current.feasibilityScore.overall > best.feasibilityScore.overall ? current : best
                ).country.name}
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
