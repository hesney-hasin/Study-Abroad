import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EvaluationResult, CountryEvaluation } from '@/types';
import { formatCostRange, formatCurrency } from '@/engines/costEngine';
import { getScoreInterpretation } from '@/engines/scoringEngine';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

const COLORS = {
  primary: [23, 128, 119] as [number, number, number],    // Teal
  success: [34, 139, 92] as [number, number, number],     // Green
  warning: [217, 144, 33] as [number, number, number],    // Gold
  destructive: [220, 53, 69] as [number, number, number], // Red
  muted: [108, 117, 125] as [number, number, number],     // Gray
  dark: [33, 37, 41] as [number, number, number],         // Dark
};

const getScoreColor = (score: number): [number, number, number] => {
  if (score >= 70) return COLORS.success;
  if (score >= 50) return COLORS.warning;
  return COLORS.destructive;
};

const addHeader = (doc: jsPDF, title: string, subtitle?: string) => {
  // Header background
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, doc.internal.pageSize.width, 35, 'F');
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 20, 18);
  
  if (subtitle) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 20, 28);
  }
  
  // Reset text color
  doc.setTextColor(...COLORS.dark);
};

const addSectionTitle = (doc: jsPDF, title: string, y: number): number => {
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(title, 20, y);
  doc.setTextColor(...COLORS.dark);
  return y + 8;
};

const addFooter = (doc: jsPDF) => {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text(
      `Page ${i} of ${pageCount} | Generated on ${new Date().toLocaleDateString()}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
    doc.text(
      'Study Abroad Feasibility Evaluator',
      20,
      doc.internal.pageSize.height - 10
    );
  }
};

export const generateFeasibilityReport = (result: EvaluationResult): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header
  addHeader(
    doc, 
    'Study Abroad Feasibility Report',
    `${result.profile.degreeLevel === 'undergraduate' ? "Bachelor's" : 
      result.profile.degreeLevel === 'masters' ? "Master's" : 'PhD'} in ${result.profile.major}`
  );

  let yPos = 50;

  // Profile Summary Section
  yPos = addSectionTitle(doc, 'Your Profile Summary', yPos);
  
  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [
      ['Degree Level', result.profile.degreeLevel.charAt(0).toUpperCase() + result.profile.degreeLevel.slice(1)],
      ['Major', result.profile.major],
      ['CGPA', `${result.profile.cgpa} / ${result.profile.cgpaScale}`],
      ['IELTS Score', result.profile.ielts ? String(result.profile.ielts) : 'Not provided'],
      ['TOEFL Score', result.profile.toefl ? String(result.profile.toefl) : 'Not provided'],
      ['GRE Score', result.profile.gre ? `${result.profile.gre.total}/340` : 'Not provided'],
      ['Budget Range', `€${result.profile.budgetMin.toLocaleString()} - €${result.profile.budgetMax.toLocaleString()}`],
    ],
    theme: 'striped',
    headStyles: { fillColor: COLORS.primary },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 100 },
    },
    margin: { left: 20, right: 20 },
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // Overall Recommendation
  yPos = addSectionTitle(doc, 'Overall Recommendation', yPos);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const splitRecommendation = doc.splitTextToSize(result.overallRecommendation, pageWidth - 40);
  doc.text(splitRecommendation, 20, yPos);
  yPos += splitRecommendation.length * 5 + 15;

  // Country Rankings Table
  yPos = addSectionTitle(doc, 'Country Feasibility Rankings', yPos);

  const countryData = result.evaluations.map((e, index) => [
    `#${index + 1}`,
    `${e.country.name} (${e.country.code})`,
    `${e.feasibilityScore.overall}%`,
    getScoreInterpretation(e.feasibilityScore.overall).label,
    e.eligibility.status.charAt(0).toUpperCase() + e.eligibility.status.slice(1),
    e.costEstimate.affordabilityStatus.charAt(0).toUpperCase() + e.costEstimate.affordabilityStatus.slice(1),
    String(e.scholarshipMatches.length),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Rank', 'Country', 'Score', 'Rating', 'Eligibility', 'Budget Fit', 'Scholarships']],
    body: countryData,
    theme: 'grid',
    headStyles: { fillColor: COLORS.primary, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 35 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
      6: { cellWidth: 25, halign: 'center' },
    },
    margin: { left: 20, right: 20 },
    didParseCell: (data) => {
      if (data.column.index === 2 && data.section === 'body') {
        const score = parseInt(data.cell.text[0]);
        data.cell.styles.textColor = getScoreColor(score);
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // Detailed Country Analysis (new pages)
  result.evaluations.forEach((evaluation, index) => {
    doc.addPage();
    
    addHeader(
      doc,
      `${evaluation.country.name} (${evaluation.country.code})`,
      `Detailed Feasibility Analysis • Rank #${index + 1}`
    );

    let detailY = 50;

    // Score Overview
    detailY = addSectionTitle(doc, 'Feasibility Score Breakdown', detailY);
    
    autoTable(doc, {
      startY: detailY,
      head: [['Component', 'Score', 'Weight', 'Contribution']],
      body: [
        ['Academic Match', `${evaluation.feasibilityScore.breakdown.academic}%`, '35%', 
          `${Math.round(evaluation.feasibilityScore.breakdown.academic * 0.35)}%`],
        ['Financial Fit', `${evaluation.feasibilityScore.breakdown.financial}%`, '30%',
          `${Math.round(evaluation.feasibilityScore.breakdown.financial * 0.30)}%`],
        ['Scholarship Potential', `${evaluation.feasibilityScore.breakdown.scholarship}%`, '20%',
          `${Math.round(evaluation.feasibilityScore.breakdown.scholarship * 0.20)}%`],
        ['Risk Assessment', `${evaluation.feasibilityScore.breakdown.risk}%`, '15%',
          `${Math.round(evaluation.feasibilityScore.breakdown.risk * 0.15)}%`],
        ['OVERALL SCORE', `${evaluation.feasibilityScore.overall}%`, '100%', 
          getScoreInterpretation(evaluation.feasibilityScore.overall).label],
      ],
      theme: 'grid',
      headStyles: { fillColor: COLORS.primary },
      margin: { left: 20, right: 20 },
      didParseCell: (data) => {
        if (data.row.index === 4) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      },
    });

    detailY = doc.lastAutoTable.finalY + 15;

    // Cost Estimate
    detailY = addSectionTitle(doc, 'Cost Estimate', detailY);
    
    autoTable(doc, {
      startY: detailY,
      head: [['Cost Category', 'Annual', 'Total Program']],
      body: [
        ['Tuition Fees', 
          formatCostRange(evaluation.costEstimate.tuitionPerYear.min, evaluation.costEstimate.tuitionPerYear.max),
          formatCostRange(evaluation.costEstimate.tuitionPerYear.min * evaluation.costEstimate.programDuration, 
            evaluation.costEstimate.tuitionPerYear.max * evaluation.costEstimate.programDuration)],
        ['Living Expenses',
          formatCostRange(evaluation.costEstimate.livingPerYear.min, evaluation.costEstimate.livingPerYear.max),
          formatCostRange(evaluation.costEstimate.livingPerYear.min * evaluation.costEstimate.programDuration,
            evaluation.costEstimate.livingPerYear.max * evaluation.costEstimate.programDuration)],
        ['TOTAL',
          formatCostRange(evaluation.costEstimate.totalPerYear.min, evaluation.costEstimate.totalPerYear.max),
          formatCostRange(evaluation.costEstimate.totalProgram.min, evaluation.costEstimate.totalProgram.max)],
      ],
      theme: 'grid',
      headStyles: { fillColor: COLORS.primary },
      margin: { left: 20, right: 20 },
      didParseCell: (data) => {
        if (data.row.index === 2) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      },
    });

    detailY = doc.lastAutoTable.finalY + 5;
    doc.setFontSize(10);
    doc.text(`Program Duration: ${evaluation.costEstimate.programDuration} years | Budget Status: ${evaluation.costEstimate.affordabilityStatus.toUpperCase()}`, 20, detailY + 5);
    
    if (evaluation.costEstimate.budgetGap) {
      doc.setTextColor(...COLORS.destructive);
      doc.text(`Budget Gap: ${formatCurrency(evaluation.costEstimate.budgetGap)}`, 20, detailY + 12);
      doc.setTextColor(...COLORS.dark);
    }

    detailY += 25;

    // Scholarships
    if (evaluation.scholarshipMatches.length > 0) {
      detailY = addSectionTitle(doc, 'Scholarship Matches', detailY);
      
      const scholarshipData = evaluation.scholarshipMatches.map(match => [
        match.scholarship.name,
        `${match.matchScore}%`,
        match.feasibility.charAt(0).toUpperCase() + match.feasibility.slice(1),
        [
          match.scholarship.coversTuition ? 'Tuition' : '',
          match.scholarship.coversLiving ? 'Living' : '',
          match.scholarship.monthlyStipend ? `€${match.scholarship.monthlyStipend}/mo` : ''
        ].filter(Boolean).join(', ') || 'Partial',
      ]);

      autoTable(doc, {
        startY: detailY,
        head: [['Scholarship Name', 'Match', 'Feasibility', 'Coverage']],
        body: scholarshipData,
        theme: 'grid',
        headStyles: { fillColor: COLORS.primary },
        margin: { left: 20, right: 20 },
      });

      detailY = doc.lastAutoTable.finalY + 15;
    }

    // Risks
    if (evaluation.risks.length > 0 && detailY < 220) {
      detailY = addSectionTitle(doc, 'Risk Assessment', detailY);
      
      const riskData = evaluation.risks.map(risk => [
        risk.severity.toUpperCase(),
        risk.category.charAt(0).toUpperCase() + risk.category.slice(1),
        risk.title,
        risk.mitigation,
      ]);

      autoTable(doc, {
        startY: detailY,
        head: [['Severity', 'Category', 'Risk', 'Mitigation']],
        body: riskData,
        theme: 'grid',
        headStyles: { fillColor: COLORS.primary },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 25 },
          2: { cellWidth: 45 },
          3: { cellWidth: 70 },
        },
        margin: { left: 20, right: 20 },
        didParseCell: (data) => {
          if (data.column.index === 0 && data.section === 'body') {
            const severity = data.cell.text[0].toLowerCase();
            if (severity === 'high') data.cell.styles.textColor = COLORS.destructive;
            else if (severity === 'medium') data.cell.styles.textColor = COLORS.warning;
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });
    }

    // Next Steps
    if (evaluation.nextSteps.length > 0) {
      const nextStepsY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : detailY + 15;
      
      if (nextStepsY < 250) {
        addSectionTitle(doc, 'Recommended Next Steps', nextStepsY);
        
        const stepsData = evaluation.nextSteps.slice(0, 4).map(step => [
          `${step.priority}.`,
          step.title,
          step.description,
        ]);

        autoTable(doc, {
          startY: nextStepsY + 8,
          head: [],
          body: stepsData,
          theme: 'plain',
          bodyStyles: { fontSize: 9 },
          columnStyles: {
            0: { cellWidth: 10, fontStyle: 'bold' },
            1: { cellWidth: 50, fontStyle: 'bold' },
            2: { cellWidth: 100 },
          },
          margin: { left: 20, right: 20 },
        });
      }
    }

    // Official Links
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text(`Official Portal: ${evaluation.country.officialLinks.mainPortal}`, 20, 280);
  });

  // Add footer to all pages
  addFooter(doc);

  // Save the PDF
  const fileName = `feasibility-report-${result.profile.major.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

export const generateComparisonReport = (
  evaluations: CountryEvaluation[],
  profile: EvaluationResult['profile']
): void => {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.width;
  
  // Header
  addHeader(
    doc,
    'Country Comparison Report',
    `Comparing ${evaluations.map(e => e.country.name).join(' vs ')} for ${profile.degreeLevel} studies`
  );

  let yPos = 50;

  // Main Comparison Table
  yPos = addSectionTitle(doc, 'Side-by-Side Comparison', yPos);

  const headers = ['Metric', ...evaluations.map(e => `${e.country.name} (${e.country.code})`)];
  
  const comparisonData = [
    ['Feasibility Score', ...evaluations.map(e => `${e.feasibilityScore.overall}%`)],
    ['Rating', ...evaluations.map(e => getScoreInterpretation(e.feasibilityScore.overall).label)],
    ['Academic Match', ...evaluations.map(e => `${e.feasibilityScore.breakdown.academic}%`)],
    ['Financial Fit', ...evaluations.map(e => `${e.feasibilityScore.breakdown.financial}%`)],
    ['Scholarship Potential', ...evaluations.map(e => `${e.feasibilityScore.breakdown.scholarship}%`)],
    ['Risk Score', ...evaluations.map(e => `${e.feasibilityScore.breakdown.risk}%`)],
    ['', '', '', ''], // Spacer
    ['Eligibility Status', ...evaluations.map(e => e.eligibility.status.charAt(0).toUpperCase() + e.eligibility.status.slice(1))],
    ['Budget Status', ...evaluations.map(e => e.costEstimate.affordabilityStatus.charAt(0).toUpperCase() + e.costEstimate.affordabilityStatus.slice(1))],
    ['', '', '', ''], // Spacer
    ['Tuition/Year', ...evaluations.map(e => formatCostRange(e.costEstimate.tuitionPerYear.min, e.costEstimate.tuitionPerYear.max))],
    ['Living/Year', ...evaluations.map(e => formatCostRange(e.costEstimate.livingPerYear.min, e.costEstimate.livingPerYear.max))],
    ['Total Program Cost', ...evaluations.map(e => formatCostRange(e.costEstimate.totalProgram.min, e.costEstimate.totalProgram.max))],
    ['Program Duration', ...evaluations.map(e => `${e.costEstimate.programDuration} years`)],
    ['', '', '', ''], // Spacer
    ['GRE Required', ...evaluations.map(e => e.country.requirements.requiresGRE ? 'Yes' : 'No')],
    ['Min IELTS', ...evaluations.map(e => e.country.requirements.minIELTS?.toString() || 'N/A')],
    ['Min CGPA', ...evaluations.map(e => e.country.requirements.minCGPA.toString())],
    ['', '', '', ''], // Spacer
    ['Scholarship Matches', ...evaluations.map(e => String(e.scholarshipMatches.length))],
    ['Top Scholarship', ...evaluations.map(e => e.scholarshipMatches[0]?.scholarship.name || 'None')],
    ['High Risks', ...evaluations.map(e => String(e.risks.filter(r => r.severity === 'high').length))],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [headers],
    body: comparisonData,
    theme: 'grid',
    headStyles: { fillColor: COLORS.primary, fontSize: 10, halign: 'center' },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45 },
    },
    margin: { left: 15, right: 15 },
    didParseCell: (data) => {
      // Highlight scores
      if (data.row.index === 0 && data.column.index > 0 && data.section === 'body') {
        const score = parseInt(data.cell.text[0]);
        if (!isNaN(score)) {
          data.cell.styles.textColor = getScoreColor(score);
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 12;
        }
      }
      // Center data columns
      if (data.column.index > 0) {
        data.cell.styles.halign = 'center';
      }
      // Style spacer rows
      if (data.cell.text[0] === '' && data.section === 'body') {
        data.cell.styles.fillColor = [248, 249, 250];
      }
    },
  });

  yPos = doc.lastAutoTable.finalY + 15;

  // Winner highlight
  const winner = evaluations.reduce((best, current) => 
    current.feasibilityScore.overall > best.feasibilityScore.overall ? current : best
  );

  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(15, yPos, pageWidth - 30, 25, 3, 3, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Best Match: ${winner.country.name} (${winner.feasibilityScore.overall}% Feasibility)`, pageWidth / 2, yPos + 15, { align: 'center' });

  // Add footer
  addFooter(doc);

  // Save
  const countryNames = evaluations.map(e => e.country.name.toLowerCase()).join('-vs-');
  const fileName = `comparison-${countryNames}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
