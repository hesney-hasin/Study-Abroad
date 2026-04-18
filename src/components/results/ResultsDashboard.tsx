import React, { useState } from "react";
import { EvaluationResult, CountryEvaluation } from '@/types';
import { CountryCard } from './CountryCard';
import { CountryDetailPanel } from './CountryDetailPanel';
import { ComparisonView } from './ComparisonView';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw,
  TrendingUp,
  AlertTriangle,
  Award,
  BarChart3,
  GitCompare,
  X,
  Download,
  ChevronLeft,
} from 'lucide-react';
import { ScoreRing } from '@/components/ui/score-ring';
import { getScoreInterpretation } from '@/engines/scoringEngine';
import { generateFeasibilityReport, generateComparisonReport } from '@/utils/pdfExport';

interface ResultsDashboardProps {
  result: EvaluationResult;
  onBack: () => void;
  onReset: () => void;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ result, onBack, onReset }) => {
  const [selectedCountry, setSelectedCountry] = useState<CountryEvaluation | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const avgScore = Math.round(
    result.evaluations.reduce((sum, e) => sum + e.feasibilityScore.overall, 0) / 
    result.evaluations.length
  );
  const interpretation = getScoreInterpretation(avgScore);
  
  const totalScholarships = result.evaluations.reduce(
    (sum, e) => sum + e.scholarshipMatches.length, 0
  );
  
  const highRiskCount = result.evaluations.reduce(
    (sum, e) => sum + e.risks.filter(r => r.severity === 'high').length, 0
  );

  const bestCountry = result.evaluations[0];
  const affordableOptions = result.evaluations.filter(
    e => e.costEstimate.affordabilityStatus === 'affordable'
  ).length;

  const toggleCompareSelection = (countryId: string) => {
    if (selectedForCompare.includes(countryId)) {
      setSelectedForCompare(prev => prev.filter(id => id !== countryId));
    } else if (selectedForCompare.length < 3) {
      setSelectedForCompare(prev => [...prev, countryId]);
    }
  };

  const handleCompare = () => {
    if (selectedForCompare.length >= 2) {
      setShowComparison(true);
    }
  };

  const handleRemoveFromCompare = (countryId: string) => {
    setSelectedForCompare(prev => prev.filter(id => id !== countryId));
    if (selectedForCompare.length <= 2) {
      setShowComparison(false);
    }
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setSelectedForCompare([]);
    setShowComparison(false);
  };

  const comparisonEvaluations = result.evaluations.filter(
    e => selectedForCompare.includes(e.country.id)
  );

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="mb-3 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Go Back
        </Button>
        <h1 className="text-2xl font-semibold mb-1">Feasibility Report</h1>
        <p className="text-sm text-muted-foreground">
          {result.profile.degreeLevel === 'undergraduate' ? "Bachelor's" : 
          result.profile.degreeLevel === 'masters' ? "Master's" : 'PhD'} in {result.profile.major}
        </p>
      </motion.div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
      >
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Avg. Feasibility</p>
          </div>
          <p className={`text-xl font-semibold ${interpretation.color}`}>{avgScore}%</p>
        </div>
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Within Budget</p>
          </div>
          <p className="text-xl font-semibold">{affordableOptions}/{result.evaluations.length}</p>
        </div>
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Scholarships</p>
          </div>
          <p className="text-xl font-semibold">{totalScholarships}</p>
        </div>
        <div className="card-elevated p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">High Risks</p>
          </div>
          <p className="text-xl font-semibold">{highRiskCount}</p>
        </div>
      </motion.div>

      {/* Top Recommendation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-5 rounded-lg bg-primary text-primary-foreground mb-8"
      >
        <div className="flex flex-col md:flex-row items-center gap-5">
          <ScoreRing score={bestCountry.feasibilityScore.overall} size="lg" showLabel={false} />
          <div className="flex-1 text-center md:text-left">
            <p className="text-xs uppercase tracking-wider opacity-70 mb-1">Top Recommendation</p>
            <h2 className="text-lg font-semibold mb-1.5">
              {bestCountry.country.name}
            </h2>
            <p className="text-sm opacity-85 leading-relaxed">{result.overallRecommendation}</p>
          </div>
        </div>
      </motion.div>

      {/* Compare Toggle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex items-center justify-between mb-5"
      >
        <h2 className="text-lg font-semibold" style={{ fontFamily: "'DM Sans', sans-serif" }}>Country Results</h2>
        {compareMode ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {selectedForCompare.length}/3 selected
            </span>
            <Button 
              size="sm"
              disabled={selectedForCompare.length < 2}
              onClick={handleCompare}
              className="h-8 text-xs"
            >
              <GitCompare className="w-3.5 h-3.5 mr-1.5" />
              Compare
            </Button>
            <Button variant="ghost" size="sm" onClick={exitCompareMode} className="h-8 text-xs">
              <X className="w-3.5 h-3.5 mr-1" />
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setCompareMode(true)} className="h-8 text-xs">
            <GitCompare className="w-3.5 h-3.5 mr-1.5" />
            Compare
          </Button>
        )}
      </motion.div>

      {/* Country Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {result.evaluations.map((evaluation, index) => (
          <div key={evaluation.country.id} className="relative">
            {compareMode && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-3 left-3 z-10"
              >
                <div className="flex items-center gap-2 p-1.5 rounded-md bg-card/95 backdrop-blur-sm shadow-sm border border-border">
                  <Checkbox
                    id={`compare-${evaluation.country.id}`}
                    checked={selectedForCompare.includes(evaluation.country.id)}
                    onCheckedChange={() => toggleCompareSelection(evaluation.country.id)}
                    disabled={
                      !selectedForCompare.includes(evaluation.country.id) && 
                      selectedForCompare.length >= 3
                    }
                  />
                  <label 
                    htmlFor={`compare-${evaluation.country.id}`}
                    className="text-xs font-medium cursor-pointer"
                  >
                    Compare
                  </label>
                </div>
              </motion.div>
            )}
            <CountryCard
              evaluation={evaluation}
              index={index}
              onClick={() => !compareMode && setSelectedCountry(evaluation)}
              isExpanded={selectedCountry?.country.id === evaluation.country.id}
            />
          </div>
        ))}
      </div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="flex flex-wrap justify-center gap-3"
      >
        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          New Evaluation
        </Button>
        <Button 
          size="sm"
          onClick={() => generateFeasibilityReport(result)}
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Download PDF
        </Button>
      </motion.div>

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedCountry && !compareMode && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCountry(null)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            />
            <CountryDetailPanel
              evaluation={selectedCountry}
              onClose={() => setSelectedCountry(null)}
            />
          </>
        )}
      </AnimatePresence>

      {/* Comparison */}
      <AnimatePresence>
        {showComparison && (
          <ComparisonView
            evaluations={comparisonEvaluations}
            onClose={() => setShowComparison(false)}
            onRemoveCountry={handleRemoveFromCompare}
            profile={result.profile}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
