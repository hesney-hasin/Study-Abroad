import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Google's NATIVE Gemini endpoint (not OpenAI-compat)
const GATEWAY_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

function getApiKeys(): string[] {
  const keys = [
    Deno.env.get("GEMINI_KEY_1"),
    Deno.env.get("GEMINI_KEY_2"),
    Deno.env.get("GEMINI_KEY_3"),
    Deno.env.get("GEMINI_KEY_4"),
  ].filter((k): k is string => !!k && k.length > 0);

  if (keys.length === 0) throw new Error("No Gemini API keys configured.");
  return keys;
}

// ─────────────────────────────────────────────
// AGENT SYSTEM PROMPT
// ─────────────────────────────────────────────

const AGENT_SYSTEM_PROMPT = `You are a Feasibility Evaluation AGENT for Bangladeshi students planning to study abroad.

## YOU ARE A REAL AI AGENT — USE YOUR OWN KNOWLEDGE
You have extensive training data about global universities, tuition fees, living costs, scholarships, visa requirements, and academic standards. USE THIS KNOWLEDGE DIRECTLY.

## YOUR WORKFLOW
For each country the student wants evaluated, you will be given tools to call. Use them step by step:

1. Call \`analyze_country\` for EACH country — provide real data from your knowledge about tuition, living costs, requirements, official links
2. Call \`evaluate_student_fit\` for EACH country — compare the student's profile against the country's real requirements 
3. Call \`submit_final_evaluation\` with the complete structured evaluation

You MUST call all tools in order. Be thorough and use REAL data.

## IMPORTANT RULES
- Use REAL, CURRENT data for tuition fees, living costs, and requirements
- Reference REAL scholarship programs with real URLs
- Be honest about eligibility — don't inflate scores
- Consider the student's budget realistically
- Factor in degree-level-specific requirements
- You can evaluate ANY country in the world
- You MUST end by calling submit_final_evaluation
- NEVER ask the student for more information — work with whatever profile data is provided
- If IELTS/TOEFL/GRE scores are missing, assume the student will take them later and evaluate based on other factors
- If extracurriculars, work experience, or research are not mentioned, simply skip those factors
- ALWAYS complete the full evaluation regardless of missing optional fields`;

// ─────────────────────────────────────────────
// Tool Declarations (Google NATIVE format — functionDeclarations)
// ─────────────────────────────────────────────

const AGENT_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "analyze_country",
        description: "Provide real data about a country for studying abroad. Use your training knowledge to give accurate tuition costs (EUR), living costs (EUR/month), academic requirements, scholarship programs, and official portal URLs. Call this for EACH country.",
        parameters: {
          type: "OBJECT",
          properties: {
            country_id: { type: "STRING", description: "Lowercase country identifier e.g. 'germany'" },
            country_name: { type: "STRING" },
            country_code: { type: "STRING", description: "ISO 2-letter code" },
            flag_emoji: { type: "STRING" },
            region: { type: "STRING", enum: ["europe", "north-america", "asia", "oceania", "middle-east", "africa", "south-america"] },
            tuition_ug_min: { type: "NUMBER" }, tuition_ug_max: { type: "NUMBER" },
            tuition_ms_min: { type: "NUMBER" }, tuition_ms_max: { type: "NUMBER" },
            tuition_phd_min: { type: "NUMBER" }, tuition_phd_max: { type: "NUMBER" },
            living_min: { type: "NUMBER" }, living_max: { type: "NUMBER" }, living_avg: { type: "NUMBER" },
            min_cgpa: { type: "NUMBER" }, borderline_cgpa: { type: "NUMBER" },
            min_ielts: { type: "NUMBER" }, min_toefl: { type: "NUMBER" },
            requires_gre: { type: "BOOLEAN" }, accepts_no_english_test: { type: "BOOLEAN" },
            duration_ug: { type: "NUMBER" }, duration_ms: { type: "NUMBER" }, duration_phd: { type: "NUMBER" },
            main_portal: { type: "STRING" }, scholarship_portal: { type: "STRING" }, visa_info: { type: "STRING" },
            country_notes: { type: "ARRAY", items: { type: "STRING" } },
            scholarships: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  id: { type: "STRING" }, name: { type: "STRING" },
                  covers_tuition: { type: "BOOLEAN" }, covers_living: { type: "BOOLEAN" },
                  monthly_stipend: { type: "NUMBER" },
                  additional_benefits: { type: "ARRAY", items: { type: "STRING" } },
                  eligible_degrees: { type: "ARRAY", items: { type: "STRING" } },
                  min_cgpa: { type: "NUMBER" }, requires_gre: { type: "BOOLEAN" },
                  requires_ielts: { type: "BOOLEAN" }, min_ielts: { type: "NUMBER" },
                  competitiveness: { type: "STRING", enum: ["high", "medium", "low"] },
                  annual_recipients: { type: "NUMBER" }, official_link: { type: "STRING" },
                  deadline: { type: "STRING" },
                  special_requirements: { type: "ARRAY", items: { type: "STRING" } },
                },
              },
            },
          },
          required: ["country_id", "country_name", "country_code", "flag_emoji", "region"],
        },
      },
      {
        name: "evaluate_student_fit",
        description: "Evaluate how well the student fits a specific country. Provide eligibility assessment, cost analysis, scholarship matching, risk assessment, feasibility scoring, and next steps.",
        parameters: {
          type: "OBJECT",
          properties: {
            country_id: { type: "STRING" },
            eligibility_status: { type: "STRING", enum: ["eligible", "borderline", "not-eligible"] },
            eligibility_score: { type: "NUMBER" },
            eligibility_reasons: { type: "ARRAY", items: { type: "STRING" } },
            eligibility_recommendations: { type: "ARRAY", items: { type: "STRING" } },
            affordability_status: { type: "STRING", enum: ["affordable", "tight", "exceeds-budget"] },
            budget_gap: { type: "NUMBER" },
            scholarship_matches: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  scholarship_id: { type: "STRING" },
                  eligibility: { type: "STRING", enum: ["eligible", "borderline", "not-eligible"] },
                  feasibility: { type: "STRING", enum: ["high", "medium", "low"] },
                  match_score: { type: "NUMBER" },
                  match_reasons: { type: "ARRAY", items: { type: "STRING" } },
                  missing_requirements: { type: "ARRAY", items: { type: "STRING" } },
                },
              },
            },
            risks: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  category: { type: "STRING", enum: ["academic", "financial", "eligibility", "documentation"] },
                  severity: { type: "STRING", enum: ["high", "medium", "low"] },
                  title: { type: "STRING" }, description: { type: "STRING" }, mitigation: { type: "STRING" },
                },
              },
            },
            overall_score: { type: "NUMBER" },
            academic_score: { type: "NUMBER" }, financial_score: { type: "NUMBER" },
            scholarship_score: { type: "NUMBER" }, risk_score: { type: "NUMBER" },
            next_steps: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  priority: { type: "NUMBER" }, title: { type: "STRING" },
                  description: { type: "STRING" }, link: { type: "STRING" }, deadline: { type: "STRING" },
                },
              },
            },
          },
          required: ["country_id", "eligibility_status", "eligibility_score", "overall_score"],
        },
      },
      {
        name: "submit_final_evaluation",
        description: "Submit your overall recommendation after analyzing all countries. Call this LAST.",
        parameters: {
          type: "OBJECT",
          properties: {
            overall_recommendation: { type: "STRING", description: "2-3 sentence overall recommendation" },
          },
          required: ["overall_recommendation"],
        },
      },
    ],
  },
];

// ─────────────────────────────────────────────
// AGENT LOOP — Google NATIVE format
// ─────────────────────────────────────────────

const MAX_AGENT_ITERATIONS = 5;

interface CountryAnalysis { countryData: any; scholarships: any[]; }
interface StudentFitResult {
  countryId: string; eligibility: any; costEstimate: any;
  scholarshipMatches: any[]; risks: any[]; feasibilityScore: any; nextSteps: any[];
}

// Calls Google native endpoint with ?key= auth, rotates keys on 429.
async function fetchWithKeyRotation(body: any, apiKeys: string[]): Promise<Response> {
  let lastErrText = "";

  for (let i = 0; i < apiKeys.length; i++) {
    const key = apiKeys[i];
    const url = `${GATEWAY_URL}?key=${encodeURIComponent(key)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" }, // NO Authorization header
      body: JSON.stringify(body),
    });

    if (response.ok) {
      console.log(`✅ Gemini call succeeded with key #${i + 1}`);
      return response;
    }

    lastErrText = await response.text();

    if (response.status === 429) {
      console.log(`⚠️ Key #${i + 1} rate-limited (429). Rotating...`);
      continue;
    }

    console.error(`❌ Key #${i + 1} failed with ${response.status}:`, lastErrText);
    throw new Error(`Gemini API error: ${response.status} - ${lastErrText}`);
  }

  throw { status: 429, message: `All ${apiKeys.length} Gemini keys rate-limited. Last error: ${lastErrText}` };
}

async function runAgentLoop(profile: any, countries: string[], apiKeys: string[]): Promise<any> {
  const profileSummary = buildProfileSummary(profile);
  const userPrompt = `Evaluate the following countries for this Bangladeshi student's study abroad feasibility.

**Countries to evaluate:** ${countries.join(", ")}

**Student Profile:**
${profileSummary}

Follow this exact workflow:
1. Call analyze_country for EACH country (you can call multiple in parallel)
2. Call evaluate_student_fit for EACH country (you can call multiple in parallel)
3. Call submit_final_evaluation with your overall recommendation

Use YOUR OWN KNOWLEDGE — provide real tuition costs, real scholarship programs, real URLs, and honest assessments.`;

  // Google native: contents array with role + parts
  const contents: any[] = [
    { role: "user", parts: [{ text: userPrompt }] },
  ];

  const countryAnalyses: Record<string, CountryAnalysis> = {};
  const studentFits: Record<string, StudentFitResult> = {};
  let overallRecommendation = "";

  for (let iteration = 0; iteration < MAX_AGENT_ITERATIONS; iteration++) {
    console.log(`Evaluation Agent iteration ${iteration + 1}/${MAX_AGENT_ITERATIONS}`);

    const response = await fetchWithKeyRotation(
      {
        systemInstruction: { parts: [{ text: AGENT_SYSTEM_PROMPT }] },
        contents,
        tools: AGENT_TOOLS,
        generationConfig: { maxOutputTokens: 8192, temperature: 0.4 },
      },
      apiKeys
    );

    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate?.content?.parts) {
      console.log("No content parts in response, ending loop");
      break;
    }

    const parts = candidate.content.parts;
    const functionCalls = parts.filter((p: any) => p.functionCall).map((p: any) => p.functionCall);

    if (functionCalls.length === 0) {
      console.log("Text-only response, prompting for tool calls");
      contents.push({ role: "model", parts });
      contents.push({ role: "user", parts: [{ text: "Please use the function tools to complete your evaluation." }] });
      continue;
    }

    console.log(`Agent calling ${functionCalls.length} function(s): ${functionCalls.map((fc: any) => fc.name).join(", ")}`);

    // Add model's function-call message
    contents.push({ role: "model", parts });

    // Build function responses
    const functionResponseParts: any[] = [];

    for (const fc of functionCalls) {
      const name = fc.name;
      const args = fc.args || {};

      if (name === "analyze_country") {
        const countryId = args.country_id;
        console.log(`AI analyzed country: ${countryId} (${args.country_name})`);

        countryAnalyses[countryId] = {
          countryData: {
            id: countryId,
            name: args.country_name || countryId,
            code: args.country_code || "XX",
            flagEmoji: args.flag_emoji || "🌍",
            region: args.region || "europe",
            tuition: {
              undergraduate: { min: args.tuition_ug_min || 0, max: args.tuition_ug_max || 0 },
              masters: { min: args.tuition_ms_min || 0, max: args.tuition_ms_max || 0 },
              phd: { min: args.tuition_phd_min || 0, max: args.tuition_phd_max || 0 },
            },
            livingCosts: { min: args.living_min || 0, max: args.living_max || 0, average: args.living_avg || 0 },
            requirements: {
              minCGPA: args.min_cgpa || 2.5, borderlineCGPA: args.borderline_cgpa || 2.2,
              requiresGRE: args.requires_gre || false, minIELTS: args.min_ielts || 6.0,
              minTOEFL: args.min_toefl || 80, acceptsWithoutEnglishTest: args.accepts_no_english_test || false,
            },
            programDuration: {
              undergraduate: args.duration_ug || 3, masters: args.duration_ms || 2, phd: args.duration_phd || 3,
            },
            officialLinks: {
              mainPortal: args.main_portal || "", scholarshipPortal: args.scholarship_portal || "", visaInfo: args.visa_info || "",
            },
            notes: args.country_notes || [],
          },
          scholarships: (args.scholarships || []).map((s: any) => ({
            id: s.id || `${countryId}-scholarship-${Math.random().toString(36).slice(2, 8)}`,
            name: s.name, countryId,
            coversTuition: s.covers_tuition || false, coversLiving: s.covers_living || false,
            monthlyStipend: s.monthly_stipend || 0,
            additionalBenefits: s.additional_benefits || [],
            eligibleDegrees: s.eligible_degrees || [],
            minCGPA: s.min_cgpa || 2.5, requiresGRE: s.requires_gre || false,
            requiresIELTS: s.requires_ielts || false, minIELTS: s.min_ielts || 0,
            competitiveness: s.competitiveness || "medium",
            annualRecipients: s.annual_recipients || 0,
            officialLink: s.official_link || "", deadline: s.deadline || "",
            specialRequirements: s.special_requirements || [],
          })),
        };

        functionResponseParts.push({
          functionResponse: {
            name,
            response: { success: true, message: `Country ${args.country_name} data recorded. Now evaluate student fit.` },
          },
        });
      } else if (name === "evaluate_student_fit") {
        const countryId = args.country_id;
        const analysis = countryAnalyses[countryId];
        console.log(`AI evaluated student fit for: ${countryId}`);

        if (!analysis) {
          functionResponseParts.push({
            functionResponse: { name, response: { error: `Must call analyze_country for ${countryId} first` } },
          });
          continue;
        }

        const degreeLevel = profile.degreeLevel;
        const tuition = analysis.countryData.tuition[degreeLevel] || { min: 0, max: 0 };
        const living = analysis.countryData.livingCosts;
        const duration = analysis.countryData.programDuration[degreeLevel] || 2;
        const totalPerYearMin = tuition.min + living.min * 12;
        const totalPerYearMax = tuition.max + living.max * 12;

        const scholarshipMatches = (args.scholarship_matches || []).map((sm: any) => {
          const scholarshipData = analysis.scholarships.find((s: any) => s.id === sm.scholarship_id);
          return {
            scholarship: scholarshipData || { id: sm.scholarship_id, name: sm.scholarship_id, countryId },
            eligibility: sm.eligibility || "borderline",
            feasibility: sm.feasibility || "medium",
            matchScore: sm.match_score || 50,
            matchReasons: sm.match_reasons || [],
            missingRequirements: sm.missing_requirements || [],
          };
        });

        const finalScholarshipMatches = scholarshipMatches.length > 0
          ? scholarshipMatches
          : analysis.scholarships.map((s: any) => ({
              scholarship: s, eligibility: "borderline" as const, feasibility: "medium" as const,
              matchScore: 50, matchReasons: [`Available for ${degreeLevel} students`], missingRequirements: [],
            }));

        studentFits[countryId] = {
          countryId,
          eligibility: {
            status: args.eligibility_status || "borderline",
            score: args.eligibility_score || 50,
            reasons: args.eligibility_reasons || [],
            recommendations: args.eligibility_recommendations || [],
          },
          costEstimate: {
            tuitionPerYear: tuition,
            livingPerYear: { min: living.min * 12, max: living.max * 12 },
            totalPerYear: { min: totalPerYearMin, max: totalPerYearMax },
            totalProgram: { min: totalPerYearMin * duration, max: totalPerYearMax * duration },
            programDuration: duration,
            affordabilityStatus: args.affordability_status || "tight",
            budgetGap: args.budget_gap || 0,
          },
          scholarshipMatches: finalScholarshipMatches,
          risks: (args.risks || []).map((r: any) => ({
            category: r.category || "academic", severity: r.severity || "medium",
            title: r.title || "", description: r.description || "", mitigation: r.mitigation || "",
          })),
          feasibilityScore: {
            overall: args.overall_score || 50,
            breakdown: {
              academic: args.academic_score || 50, financial: args.financial_score || 50,
              scholarship: args.scholarship_score || 30, risk: args.risk_score || 50,
            },
            weights: { academic: 0.35, financial: 0.25, scholarship: 0.25, risk: 0.15 },
          },
          nextSteps: (args.next_steps || []).map((ns: any) => ({
            priority: ns.priority || 1, title: ns.title || "",
            description: ns.description || "", link: ns.link, deadline: ns.deadline,
          })),
        };

        functionResponseParts.push({
          functionResponse: { name, response: { success: true, message: `Student fit for ${countryId} evaluated.` } },
        });
      } else if (name === "submit_final_evaluation") {
        console.log("Agent submitted final evaluation");
        overallRecommendation = args.overall_recommendation || "";

        functionResponseParts.push({
          functionResponse: { name, response: { success: true } },
        });

        const evaluations = Object.keys(studentFits).map(cId => {
          const fit = studentFits[cId];
          const analysis = countryAnalyses[cId];
          return {
            country: analysis?.countryData || { id: cId, name: cId },
            eligibility: fit.eligibility, costEstimate: fit.costEstimate,
            scholarshipMatches: fit.scholarshipMatches, risks: fit.risks,
            feasibilityScore: fit.feasibilityScore, nextSteps: fit.nextSteps,
          };
        });

        return { evaluations, overallRecommendation };
      }
    }

    // Send all function responses back as a single user turn
    if (functionResponseParts.length > 0) {
      contents.push({ role: "user", parts: functionResponseParts });
    }
  }

  if (Object.keys(studentFits).length > 0) {
    console.log("Building result from gathered tool data (no submit_final_evaluation call)");
    const evaluations = Object.keys(studentFits).map(cId => {
      const fit = studentFits[cId];
      const analysis = countryAnalyses[cId];
      return {
        country: analysis?.countryData || { id: cId, name: cId },
        eligibility: fit.eligibility, costEstimate: fit.costEstimate,
        scholarshipMatches: fit.scholarshipMatches, risks: fit.risks,
        feasibilityScore: fit.feasibilityScore, nextSteps: fit.nextSteps,
      };
    });

    return {
      evaluations,
      overallRecommendation: overallRecommendation || `Based on your profile, ${evaluations[0]?.country?.name || "the top country"} shows the strongest feasibility.`,
    };
  }

  throw new Error("AI agent could not complete the evaluation. Please try again.");
}

// ─────────────────────────────────────────────
// Profile Summary Builder
// ─────────────────────────────────────────────

function buildProfileSummary(profile: any): string {
  const lines: string[] = [];
  lines.push(`- **Degree Level:** ${profile.degreeLevel || "Not specified"}`);
  if (profile.currentDegree) lines.push(`- **Current Degree:** ${profile.currentDegree}`);
  if (profile.major) lines.push(`- **Major:** ${profile.major}`);
  if (profile.cgpa != null && profile.cgpa > 0) lines.push(`- **CGPA:** ${profile.cgpa} / ${profile.cgpaScale || 4}`);
  if (profile.ielts) lines.push(`- **IELTS:** ${profile.ielts}`);
  if (profile.toefl) lines.push(`- **TOEFL:** ${profile.toefl}`);
  if (profile.gre) lines.push(`- **GRE:** Verbal ${profile.gre.verbal}, Quant ${profile.gre.quantitative}, Writing ${profile.gre.writing} (Total: ${profile.gre.total})`);
  if (profile.budgetMin || profile.budgetMax) lines.push(`- **Budget:** €${profile.budgetMin?.toLocaleString() || 0} – €${profile.budgetMax?.toLocaleString() || 0} per year`);
  if (profile.hasResearchExperience) lines.push(`- **Research Experience:** Yes`);
  if (profile.hasWorkExperience) lines.push(`- **Work Experience:** Yes`);
  if (profile.publicationsCount && profile.publicationsCount > 0) lines.push(`- **Publications:** ${profile.publicationsCount}`);
  if (profile.workExperienceYears && profile.workExperienceYears > 0) lines.push(`- **Work Experience Years:** ${profile.workExperienceYears}`);
  if (profile.extracurriculars) lines.push(`- **Extracurriculars:** ${profile.extracurriculars}`);
  if (profile.internshipDetails) lines.push(`- **Internship Details:** ${profile.internshipDetails}`);
  if (profile.researchPapers) lines.push(`- **Research Papers:** ${profile.researchPapers}`);
  if (profile.researchPaperCount && profile.researchPaperCount > 0) lines.push(`- **Research Paper Count:** ${profile.researchPaperCount}`);
  if (lines.length <= 1) lines.push(`- **Note:** Limited profile data provided. Evaluate based on degree level and general eligibility.`);
  return lines.join("\n");
}

// ─────────────────────────────────────────────
// MAIN SERVER
// ─────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { profile, countries } = await req.json();

    if (!profile || !countries || !Array.isArray(countries) || countries.length === 0) {
      return new Response(
        JSON.stringify({ error: "Profile and countries array are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKeys = getApiKeys();
    console.log(`Starting Gemini agent (${apiKeys.length} key(s)) for ${countries.length} countries, ${profile.degreeLevel} student`);

    const evaluationData = await runAgentLoop(profile, countries, apiKeys);

    if (evaluationData.evaluations) {
      evaluationData.evaluations.sort(
        (a: any, b: any) => (b.feasibilityScore?.overall || 0) - (a.feasibilityScore?.overall || 0)
      );
    }

    const result = {
      profile,
      evaluations: evaluationData.evaluations || [],
      overallRecommendation: evaluationData.overallRecommendation || "",
      timestamp: new Date().toISOString(),
    };

    console.log(`Gemini agent evaluation complete: ${result.evaluations.length} countries evaluated`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("evaluate-countries agent error:", e);
    if (e.status === 429) {
      return new Response(
        JSON.stringify({ error: "All Gemini keys rate-limited. Please try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : e?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
