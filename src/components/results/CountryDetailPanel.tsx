import React from 'react';
import { CountryEvaluation } from '@/types';
import { ScoreRing } from '@/components/ui/score-ring';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { formatCostRange, formatCurrency } from '@/engines/costEngine';
import { getScoreInterpretation, getComponentDescription } from '@/engines/scoringEngine';
import { getRiskColor } from '@/engines/riskEngine';
import {
  X,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  GraduationCap,
  Wallet,
  Award,
  Shield,
  ArrowRight,
  Info
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface CountryDetailPanelProps {
  evaluation: CountryEvaluation;
  onClose: () => void;
}

export const CountryDetailPanel: React.FC<CountryDetailPanelProps> = ({
  evaluation,
  onClose
}) => {
  const {
    country,
    feasibilityScore,
    eligibility,
    costEstimate,
    scholarshipMatches,
    risks,
    nextSteps
  } = evaluation;
  const interpretation = getScoreInterpretation(feasibilityScore.overall);

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed inset-y-0 right-0 w-full md:w-[500px] lg:w-[600px] bg-background border-l border-border shadow-2xl z-50 overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-6 z-10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <span className="text-5xl">{country.flagEmoji}</span>
            <div>
              <h2 className="text-2xl font-bold">{country.name}</h2>
              <span className={`text-sm font-medium ${interpretation.color}`}>
                {interpretation.label} • {interpretation.description}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Overall Score */}
        <div className="flex items-center justify-center p-6 rounded-xl bg-gradient-card border border-border">
          <ScoreRing score={feasibilityScore.overall} size="xl" label="Feasibility Score" />
        </div>

        {/* Score Breakdown */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Score Breakdown
          </h3>
          <div className="space-y-3">
            {(Object.entries(feasibilityScore.breakdown) as [keyof typeof feasibilityScore.breakdown, number][]).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize font-medium">{key}</span>
                  <span className="font-bold">{value}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className={`h-full rounded-full ${value >= 70 ? 'bg-success' : value >= 50 ? 'bg-warning' : 'bg-destructive'
                      }`}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {getComponentDescription(key, value)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Academic Eligibility */}
        <Accordion type="single" collapsible defaultValue="eligibility">
          <AccordionItem value="eligibility">
            <AccordionTrigger className="text-lg font-semibold">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                Academic Eligibility
                <StatusBadge status={eligibility.status} className="ml-2">
                  {eligibility.status}
                </StatusBadge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              {eligibility.reasons.map((reason, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  {reason.startsWith('✓') ? (
                    <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                  ) : reason.startsWith('✗') ? (
                    <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                  )}
                  <span>{reason.replace(/^[✓✗⚠ℹ]\s*/, '')}</span>
                </div>
              ))}
              {eligibility.recommendations.length > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-info/10 border border-info/30">
                  <p className="text-sm font-medium mb-2 flex items-center gap-1">
                    <Info className="w-4 h-4" />
                    Recommendations
                  </p>
                  <ul className="text-sm space-y-1">
                    {eligibility.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ArrowRight className="w-3 h-3 mt-1 shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Cost Estimate */}
        <Accordion type="single" collapsible>
          <AccordionItem value="costs">
            <AccordionTrigger className="text-lg font-semibold">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                Cost Estimate
                <StatusBadge
                  status={costEstimate.affordabilityStatus === 'affordable' ? 'high' :
                    costEstimate.affordabilityStatus === 'tight' ? 'medium' : 'low'}
                  className="ml-2"
                >
                  {costEstimate.affordabilityStatus}
                </StatusBadge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Tuition/Year</p>
                  <p className="font-semibold">
                    {formatCostRange(costEstimate.tuitionPerYear.min, costEstimate.tuitionPerYear.max)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Living/Year</p>
                  <p className="font-semibold">
                    {formatCostRange(costEstimate.livingPerYear.min, costEstimate.livingPerYear.max)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Program Duration</p>
                  <p className="font-semibold">{costEstimate.programDuration} years</p>
                </div>
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                  <p className="text-xs text-muted-foreground">Total Program</p>
                  <p className="font-bold text-primary">
                    {formatCostRange(costEstimate.totalProgram.min, costEstimate.totalProgram.max)}
                  </p>
                </div>
              </div>
              {costEstimate.budgetGap && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <p className="text-sm">
                    <strong>Budget Gap:</strong> Approximately {formatCurrency(costEstimate.budgetGap)} needed beyond your budget
                  </p>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Scholarships */}
        {scholarshipMatches.length > 0 && (
          <Accordion type="single" collapsible>
            <AccordionItem value="scholarships">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  Scholarship Matches ({scholarshipMatches.length})
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                {scholarshipMatches.map((match) => (
                  <div key={match.scholarship.id} className="p-4 rounded-lg bg-card border border-border">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{match.scholarship.name}</h4>
                      <StatusBadge status={match.feasibility}>
                        {match.feasibility} match
                      </StatusBadge>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {match.scholarship.coversTuition && (
                        <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success">
                          Covers Tuition
                        </span>
                      )}
                      {match.scholarship.coversLiving && (
                        <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success">
                          Covers Living
                        </span>
                      )}
                      {match.scholarship.monthlyStipend && (
                        <span className="text-xs px-2 py-1 rounded-full bg-info/10 text-info">
                          {formatCurrency(match.scholarship.monthlyStipend)}/month
                        </span>
                      )}
                    </div>
                    {match.missingRequirements.length > 0 && (
                      <div className="text-xs text-muted-foreground mb-2">
                        <strong>Missing:</strong> {match.missingRequirements.join(', ')}
                      </div>
                    )}
                    <Button variant="link" size="sm" asChild className="p-0 h-auto">
                      <a href={match.scholarship.officialLink} target="_blank" rel="noopener noreferrer">
                        View Details <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Risks */}
        {risks.length > 0 && (
          <Accordion type="single" collapsible>
            <AccordionItem value="risks">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-warning" />
                  Risk Assessment ({risks.length})
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-2">
                {risks.map((risk, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/50 border-l-4" style={{
                    borderLeftColor: risk.severity === 'high' ? 'hsl(var(--destructive))' :
                      risk.severity === 'medium' ? 'hsl(var(--warning))' :
                        'hsl(var(--muted-foreground))'
                  }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium uppercase ${getRiskColor(risk.severity)}`}>
                        {risk.severity}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">• {risk.category}</span>
                    </div>
                    <h4 className="font-medium">{risk.title}</h4>
                    <p className="text-sm text-muted-foreground">{risk.description}</p>
                    <p className="text-sm mt-2">
                      <strong>Mitigation:</strong> {risk.mitigation}
                    </p>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Next Steps */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-primary" />
            Recommended Next Steps
          </h3>
          <div className="space-y-3">
            {nextSteps.slice(0, 5).map((step) => (
              <div key={step.priority} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                  {step.priority}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{step.title}</h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  {step.link && (
                    <Button variant="link" size="sm" asChild className="p-0 h-auto mt-1">
                      <a href={step.link} target="_blank" rel="noopener noreferrer">
                        Visit Resource <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Country Notes */}
        {country.notes.length > 0 && (
          <div className="p-4 rounded-lg bg-info/5 border border-info/20">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-info" />
              About {country.name}
            </h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              {country.notes.map((note, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-info">•</span>
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Official Links */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
          <Button variant="outline" size="sm" asChild>
            <a href={country.officialLinks.mainPortal} target="_blank" rel="noopener noreferrer">
              Study Portal <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </Button>
          {country.officialLinks.scholarshipPortal && (
            <Button variant="outline" size="sm" asChild>
              <a href={country.officialLinks.scholarshipPortal} target="_blank" rel="noopener noreferrer">
                Scholarships <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </Button>
          )}

        </div>
      </div>
    </motion.div>
  );
};
