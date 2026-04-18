import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Google's NATIVE Gemini endpoint (not OpenAI-compat)
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function getGeminiKeys(): string[] {
  const keyNames = ["GEMINI_KEY_5", "GEMINI_KEY_6", "GEMINI_KEY_7", "GEMINI_KEY_8", "GEMINI_KEY_9"];
  const keys: string[] = [];
  for (const name of keyNames) {
    const val = Deno.env.get(name);
    if (val) keys.push(val);
  }
  // shuffle so load spreads across keys
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  return keys;
}

// ─────────────────────────────────────────────
// OpenAI ⇄ Gemini-native format adapters
// Keeps the rest of the file (which speaks OpenAI shape) unchanged.
// ─────────────────────────────────────────────

function openaiToolsToNative(openaiTools: any[] | undefined): any[] | undefined {
  if (!openaiTools || openaiTools.length === 0) return undefined;
  const declarations = openaiTools
    .filter((t: any) => t?.type === "function" && t.function)
    .map((t: any) => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    }));
  return declarations.length > 0 ? [{ functionDeclarations: declarations }] : undefined;
}

function openaiMessagesToNative(messages: any[]): { systemInstruction?: any; contents: any[] } {
  let systemInstruction: any | undefined;
  const contents: any[] = [];

  const systemTexts = messages
    .filter((m) => m.role === "system" && typeof m.content === "string")
    .map((m) => m.content);
  if (systemTexts.length > 0) {
    systemInstruction = { parts: [{ text: systemTexts.join("\n\n") }] };
  }

  for (const m of messages) {
    if (m.role === "system") continue;

    if (m.role === "user") {
      const text = typeof m.content === "string" ? m.content : JSON.stringify(m.content ?? "");
      contents.push({ role: "user", parts: [{ text }] });
      continue;
    }

    if (m.role === "assistant") {
      const parts: any[] = [];
      if (typeof m.content === "string" && m.content.trim()) {
        parts.push({ text: m.content });
      }
      if (Array.isArray(m.tool_calls)) {
        for (const tc of m.tool_calls) {
          let args: any = {};
          try {
            args = typeof tc.function?.arguments === "string"
              ? JSON.parse(tc.function.arguments || "{}")
              : (tc.function?.arguments ?? {});
          } catch {
            args = {};
          }
          parts.push({ functionCall: { name: tc.function?.name, args } });
        }
      }
      if (parts.length === 0) parts.push({ text: "" });
      contents.push({ role: "model", parts });
      continue;
    }

    if (m.role === "tool") {
      let response: any;
      try {
        response = typeof m.content === "string" ? JSON.parse(m.content) : m.content;
      } catch {
        response = { result: m.content };
      }
      // Gemini-native requires the function name on the response — look it up by tool_call_id.
      let name = "tool";
      for (let i = messages.indexOf(m) - 1; i >= 0; i--) {
        const prev = messages[i];
        if (prev.role === "assistant" && Array.isArray(prev.tool_calls)) {
          const match = prev.tool_calls.find((tc: any) => tc.id === m.tool_call_id);
          if (match?.function?.name) { name = match.function.name; break; }
        }
      }
      contents.push({
        role: "user",
        parts: [{
          functionResponse: {
            name,
            response: typeof response === "object" && response !== null ? response : { result: response },
          },
        }],
      });
      continue;
    }
  }

  return { systemInstruction, contents };
}

function nativeResponseToOpenAI(nativeData: any): any {
  const candidate = nativeData?.candidates?.[0];
  const parts: any[] = candidate?.content?.parts || [];

  const textParts = parts.filter((p) => typeof p?.text === "string").map((p) => p.text);
  const fnCallParts = parts.filter((p) => p?.functionCall);

  const tool_calls = fnCallParts.length > 0
    ? fnCallParts.map((p, i) => ({
        id: `call_${Date.now()}_${i}`,
        type: "function",
        function: {
          name: p.functionCall.name,
          arguments: JSON.stringify(p.functionCall.args ?? {}),
        },
      }))
    : undefined;

  return {
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: textParts.join("") || "",
          ...(tool_calls ? { tool_calls } : {}),
        },
        finish_reason: tool_calls ? "tool_calls" : "stop",
      },
    ],
  };
}

/**
 * Calls Gemini's NATIVE endpoint, rotating through GEMINI_KEY_N secrets on rate-limit / server errors.
 * Accepts an OpenAI-shaped body ({ messages, tools, model? }) and returns a Response whose JSON
 * mimics OpenAI's chat-completions shape so the rest of the file works unchanged.
 */
async function fetchAI(body: any): Promise<Response> {
  const keys = getGeminiKeys();
  if (keys.length === 0) {
    throw { status: 500, message: "No GEMINI_KEY_N secrets are configured" };
  }

  const { systemInstruction, contents } = openaiMessagesToNative(body.messages || []);
  const nativeBody: any = {
    contents,
    generationConfig: { maxOutputTokens: 8192, temperature: 0.4 },
  };
  if (systemInstruction) nativeBody.systemInstruction = systemInstruction;
  const nativeTools = openaiToolsToNative(body.tools);
  if (nativeTools) nativeBody.tools = nativeTools;

  let lastStatus = 500;
  let lastText = "All Gemini keys failed";
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    try {
      const resp = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nativeBody),
      });
      if (resp.ok) {
        console.log(`Gemini key #${i + 1}/${keys.length} succeeded (native)`);
        const nativeData = await resp.json();
        const openaiShaped = nativeResponseToOpenAI(nativeData);
        return new Response(JSON.stringify(openaiShaped), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      lastStatus = resp.status;
      lastText = await resp.text().catch(() => "");
      console.warn(`Gemini key #${i + 1} returned ${resp.status}`);
      if (![401, 403, 429, 500, 502, 503, 504].includes(resp.status)) break;
    } catch (e) {
      console.warn(`Gemini key #${i + 1} threw:`, e);
      lastText = e instanceof Error ? e.message : String(e);
    }
  }
  throw { status: lastStatus, message: lastText };
}

function extractErrorMessage(raw: unknown): string {
  if (!raw) return "";
  if (typeof raw !== "string") {
    if (typeof raw === "object" && raw && "message" in raw && typeof (raw as { message?: unknown }).message === "string") {
      return (raw as { message: string }).message;
    }
    return String(raw);
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0];
      if (first?.error?.message) return first.error.message;
      if (typeof first?.error === "string") return first.error;
      if (typeof first?.message === "string") return first.message;
    }
    if (parsed?.error?.message) return parsed.error.message;
    if (typeof parsed?.error === "string") return parsed.error;
    if (typeof parsed?.message === "string") return parsed.message;
  } catch {
    // keep raw text
  }

  return raw;
}

function createErrorResponse(
  err: { status?: number; message?: unknown } | unknown,
  overrides?: { status?: number; error?: string; fallback?: boolean },
): Response {
  const rawStatus = Number((err as { status?: number } | undefined)?.status);
  const derivedStatus = Number.isFinite(rawStatus) ? rawStatus : 503;
  const status = overrides?.status
    ?? (derivedStatus === 500 ? 503 : derivedStatus >= 400 && derivedStatus < 600 ? derivedStatus : 503);
  const fallback = overrides?.fallback ?? ([401, 403, 429, 500, 502, 503, 504].includes(derivedStatus) || status >= 500);
  const error = overrides?.error
    ?? extractErrorMessage((err as { message?: unknown } | undefined)?.message)
    ?? (status === 429
      ? "Rate limits exceeded, please try again later."
      : status === 402
        ? "AI credits exhausted."
        : fallback
          ? "AI service unavailable. Please try again."
          : "Request failed.");

  return new Response(JSON.stringify({ error, fallback }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─────────────────────────────────────────────
// Off-topic Detection
// ─────────────────────────────────────────────
function isHardOffTopic(message: string): boolean {
  const lower = message.toLowerCase().trim();
  return /\b(olympic|olympics|cricket|football|soccer|nba|movie|movies|film|music|song|celebrity|election|war|recipe|cooking|crypto|bitcoin|stock|cat|cats|dog|dogs|pet|pets|weather|joke|jokes|game|games|gaming|dating|relationship|girlfriend|boyfriend|love|romance)\b/i.test(lower);
}

function isOffTopic(message: string, mode: "default" | "advisor" = "default"): boolean {
  const lower = message.toLowerCase().trim();
  if (/^(hi|hello|hey|thanks|thank you)[!. ]*$/i.test(lower)) return false;
  if (isHardOffTopic(lower)) return true;
  if (mode === "advisor") return false;

  const studyKeywords = [
    'university','universities','college','study','studies','student','students',
    'admission','admit','apply','application','enroll','enrollment',
    'visa','immigration','migrate','embassy','consulate','passport',
    'scholarship','funding','tuition','fees','cost','budget','expense','afford',
    'cgpa','gpa','gre','ielts','toefl','sat','gmat','duolingo',
    'masters','master','bachelor','phd','doctorate','undergraduate','postgraduate','degree',
    'abroad','overseas','international',
    'major','program','course','faculty','professor','research',
    'campus','dorm','accommodation','housing','living cost','rent',
    'part-time','work permit','post-study','career','employment',
    'blocked account','bank statement','financial','fund',
    'sop','lor','resume','cv','transcript','document','checklist',
    'deadline','intake','semester','session',
    'germany','canada','usa','uk','australia','sweden','finland','denmark',
    'norway','netherlands','france','italy','spain','japan','korea',
    'ireland','switzerland','austria','belgium','portugal','poland',
    'czechia','hungary','estonia','malaysia','singapore','new zealand',
    'china','turkey','russia','saudi','uae','dubai','europe','european',
    'bangladesh','bangladeshi','dhaka','vfs',
    'health insurance','insurance',
    'ranking','ranked','qs','times higher',
    'ielts score','band','waiver',
    'education','academic','profile','eligib','requi',
    'english','language','proficiency','medium of instruction',
    'stipend','assistantship',
    'schengen','residence permit','permit',
    'country','countries','recommend','suggest','best','compare',
  ];

  const escapeRegExp = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hasStudyKeyword = studyKeywords.some((kw) => {
    const pattern = kw.includes(' ') ? new RegExp(escapeRegExp(kw), 'i') : new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'i');
    return pattern.test(lower);
  });
  return !hasStudyKeyword;
}

const OFF_TOPIC_RESPONSE = `I'm here to help you with studying abroad! 🎓

I can assist with:
• **Universities & Programs** — finding the right fit for your profile
• **Visa Processes** — step-by-step guidance for any country
• **Scholarships** — current funding opportunities
• **Admission Requirements** — CGPA, IELTS, GRE expectations
• **Cost & Budget** — tuition fees and living expenses
• **Career Prospects** — post-study work permits and job opportunities

What would you like to know about studying abroad?`;

// ─────────────────────────────────────────────
// AGENT TOOLS
// ─────────────────────────────────────────────
function toolSearchCountries(args: any): any {
  const { degree_level, cgpa, cgpa_scale, budget_max, major, extracurriculars, internship_details, work_experience_years, research_papers, research_paper_count, publications_count } = args;
  return {
    search_executed: true,
    criteria: { degree_level, cgpa, cgpa_scale, budget_max, major, extracurriculars, internship_details, work_experience_years, research_papers, research_paper_count, publications_count },
    instruction: "Based on these student criteria, rank the top 8-10 study-abroad countries from your knowledge. For each country include: name, flag emoji, tuition range, living cost range, minimum CGPA/IELTS expectations, whether PhD is funded, post-study work visa duration, top scholarships, a fit score (0-100), and a fit label (excellent/good/moderate/weak). Consider the student's degree level, CGPA, budget, and field.",
  };
}
function toolGetCountryDetails(args: any): any {
  const { country_id } = args;
  return {
    lookup_executed: true,
    query: { country_id },
    instruction: `Provide detailed study-abroad information for "${country_id}" from your knowledge: tuition range for international students, living costs, minimum academic requirements (CGPA, IELTS, GRE), whether PhD positions are funded/salaried, post-study work visa options, top scholarships available, and any important notes for Bangladeshi students.`,
  };
}
function toolFindScholarships(args: any): any {
  const { country_id, degree_level, min_cgpa } = args;
  return {
    search_executed: true,
    criteria: { country_id: country_id || "all", degree_level: degree_level || "any", min_cgpa: min_cgpa || "any" },
    instruction: `List real scholarships from your knowledge matching these criteria. For each scholarship include: name, country, whether it covers tuition and/or living, stipend amount, eligible degree levels, minimum CGPA if any, competitiveness (high/medium/low), typical deadline month, and official website URL. Include at least 5-10 results.`,
  };
}
function toolEvaluateProfile(args: any): any {
  const { country_id, cgpa, cgpa_scale, ielts, toefl, degree_level, budget_per_year, extracurriculars, internship_details, work_experience_years, research_papers, research_paper_count, publications_count } = args;
  return {
    evaluation_requested: true,
    criteria: { country_id, cgpa, cgpa_scale, ielts, toefl, degree_level, budget_per_year, extracurriculars, internship_details, work_experience_years, research_papers, research_paper_count, publications_count },
    instruction: `Evaluate this student's profile against "${country_id}" requirements using your knowledge. Check: CGPA adequacy, English proficiency, budget sufficiency, and degree-specific factors. Provide a feasibility score (0-100), feasibility level (high/medium/low), detailed checks for each criterion, available scholarships, and post-study work options.`,
  };
}
function toolCompareCountries(args: any): any {
  const { country_ids } = args;
  return {
    comparison_requested: true,
    countries_to_compare: country_ids,
    instruction: `Compare these countries side-by-side for studying abroad: ${country_ids.join(", ")}. Cover: tuition fees, living costs, minimum academic requirements, PhD funding, post-study work visa, top scholarships, and key notes.`,
  };
}
function executeTool(name: string, args: any): any {
  switch (name) {
    case "search_countries": return toolSearchCountries(args);
    case "get_country_details": return toolGetCountryDetails(args);
    case "find_scholarships": return toolFindScholarships(args);
    case "evaluate_profile": return toolEvaluateProfile(args);
    case "compare_countries": return toolCompareCountries(args);
    default: return { error: `Unknown tool: ${name}` };
  }
}

const AGENT_TOOLS = [
  { type: "function", function: { name: "search_countries", description: "Search and rank study-abroad destination countries based on a student's academic profile, budget, preferences, and degree-specific factors.", parameters: { type: "object", properties: { degree_level: { type: "string", enum: ["undergraduate", "masters", "phd"] }, cgpa: { type: "number" }, cgpa_scale: { type: "number" }, budget_max: { type: "number" }, major: { type: "string" }, extracurriculars: { type: "string" }, internship_details: { type: "string" }, work_experience_years: { type: "number" }, research_papers: { type: "string" }, research_paper_count: { type: "number" }, publications_count: { type: "number" } }, required: ["degree_level", "cgpa", "cgpa_scale"] } } },
  { type: "function", function: { name: "get_country_details", description: "Get detailed information about a specific country including tuition, living costs, requirements, scholarships, and post-study work options.", parameters: { type: "object", properties: { country_id: { type: "string" } }, required: ["country_id"] } } },
  { type: "function", function: { name: "find_scholarships", description: "Search for scholarships matching criteria.", parameters: { type: "object", properties: { country_id: { type: "string" }, degree_level: { type: "string", enum: ["undergraduate", "masters", "phd"] }, min_cgpa: { type: "number" } } } } },
  { type: "function", function: { name: "evaluate_profile", description: "Evaluate a student's academic profile against a specific country's requirements.", parameters: { type: "object", properties: { country_id: { type: "string" }, cgpa: { type: "number" }, cgpa_scale: { type: "number" }, ielts: { type: "number" }, toefl: { type: "number" }, degree_level: { type: "string", enum: ["undergraduate", "masters", "phd"] }, budget_per_year: { type: "number" }, extracurriculars: { type: "string" }, internship_details: { type: "string" }, work_experience_years: { type: "number" }, research_papers: { type: "string" }, research_paper_count: { type: "number" }, publications_count: { type: "number" } }, required: ["country_id", "cgpa", "cgpa_scale", "degree_level"] } } },
  { type: "function", function: { name: "compare_countries", description: "Compare multiple countries side-by-side on tuition, living costs, requirements, scholarships, and post-study work options.", parameters: { type: "object", properties: { country_ids: { type: "array", items: { type: "string" } } }, required: ["country_ids"] } } },
];

// ─────────────────────────────────────────────
// Agent System Prompts
// ─────────────────────────────────────────────
const AGENT_SYSTEM_PROMPT = `You are Study Compass — an AI AGENT that helps Bangladeshi students with studying abroad.

## YOU ARE A REAL AI AGENT
You have access to tools. You MUST use them to gather data before answering. Do NOT guess or make up information.
- When a user asks about countries → call search_countries or get_country_details
- When a user asks about scholarships → call find_scholarships
- When a user asks to evaluate their profile → call evaluate_profile
- When a user asks to compare countries → call compare_countries
- You can call MULTIPLE tools in sequence to build a comprehensive answer
- After getting tool results, synthesize them into a helpful, structured response

## SCOPE RESTRICTION
You are STRICTLY limited to study-abroad topics. REFUSE anything else.
If off-topic, respond: "I'm here to help you with studying abroad! 🎓 What would you like to know about universities, visas, scholarships, or admissions?"

## RESPONSE STYLE
- Clear, structured, use markdown (headers, bullets, bold, tables)
- Cite specific data from tool results
- Mention deadlines for scholarships
- Flag financial risks (e.g., "Germany requires blocked account of €11,208")
- Understand Bangladeshi student challenges
- Warm, encouraging, but honest

## ANTI-HALLUCINATION
- ALWAYS use tools to get data. Do not fabricate numbers.
- If tools don't have the answer, say so and suggest alternatives.
- For real-time info, note that data may need verification.`;

const COUNTRY_ADVISOR_SYSTEM = `You are the Country Advisor agent within Study Compass. You help students choose the best study-abroad destinations WORLDWIDE.

## YOU ARE A REAL AI AGENT — USE YOUR TOOLS
- Call search_countries when recommending destinations
- Call evaluate_profile to assess fit for specific countries
- Call find_scholarships to find funding opportunities
- Call compare_countries when the student wants side-by-side comparison
- Call get_country_details when asked about a specific country
- You may call multiple tools in sequence

## SCOPE — ANY STUDY-ABROAD DESTINATION WORLDWIDE
You can discuss ANY country a student might want to study in: Australia, Canada, USA, UK, Germany, Finland, Sweden, Netherlands, Japan, South Korea, Singapore, New Zealand, Ireland, France, Italy, Spain, Switzerland, Norway, Denmark, Austria, Belgium, Poland, Czechia, Hungary, Malaysia, China, UAE, Turkey — anywhere.
- NEVER refuse a country because it's "not in a list". There is no list restriction.
- If the student picks a country the wizard didn't auto-suggest, help them evaluate it anyway.
- If the student didn't like the auto-selected countries, suggest better-fitting alternatives from anywhere in the world.

## CONVERSATIONAL FOLLOW-UPS
The student is mid-conversation. Treat short messages like "tell me more", "what about it", "I wanna know", "compare them" as natural follow-ups to your previous answer — do NOT refuse them as off-topic.

## CONTEXT
You are embedded in the country selection step of a profile wizard. Help them pick the best countries for their goals, profile, and budget.

## RESPONSE STYLE
- Concise, actionable advice
- Reference specific tool data when available
- For listed/known country IDs (germany, finland, sweden, etc.), suggest by exact lowercase ID so the UI can auto-select
- For other countries (australia, canada, japan, etc.), just discuss them naturally`;

// ─────────────────────────────────────────────
// AGENT LOOP — ReAct-style with OpenAI format
// ─────────────────────────────────────────────
const MAX_AGENT_ITERATIONS = 3;

async function runAgentLoop(systemPrompt: string, messages: any[]): Promise<string> {
  const currentMessages: any[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  for (let iteration = 0; iteration < MAX_AGENT_ITERATIONS; iteration++) {
    const isLastIteration = iteration === MAX_AGENT_ITERATIONS - 1;
    console.log(`Agent iteration ${iteration + 1}/${MAX_AGENT_ITERATIONS}${isLastIteration ? " (final, no tools)" : ""}`);

    const body: any = {
      model: "google/gemini-2.5-flash",
      messages: currentMessages,
    };
    if (!isLastIteration) body.tools = AGENT_TOOLS;

    const response = await fetchAI(body);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Agent iteration ${iteration + 1} error:`, response.status, errText);
      throw { status: response.status, message: errText };
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    if (!choice?.message) {
      console.log("No message in response, ending loop");
      break;
    }

    const message = choice.message;
    const toolCalls = message.tool_calls;

    if (toolCalls && toolCalls.length > 0 && !isLastIteration) {
      console.log(`Agent calling ${toolCalls.length} tool(s): ${toolCalls.map((tc: any) => tc.function.name).join(", ")}`);
      currentMessages.push(message);

      for (const tc of toolCalls) {
        const args = JSON.parse(tc.function.arguments || "{}");
        const result = executeTool(tc.function.name, args);
        console.log(`Tool ${tc.function.name} returned ${JSON.stringify(result).length} chars`);
        currentMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
      continue;
    }

    if (message.content && message.content.trim()) return message.content;

    if (!isLastIteration) {
      console.log("Empty content — forcing summary pass");
      currentMessages.push({
        role: "user",
        content: "Based on the information you've gathered, please now write your final answer to my question in clear markdown. Do not call any more tools.",
      });
      continue;
    }
    break;
  }

  return "I wasn't able to generate a response. Please try again.";
}

// ─────────────────────────────────────────────
// SSE Stream helpers
// ─────────────────────────────────────────────
function createSSEStream(text: string): ReadableStream {
  const encoder = new TextEncoder();
  const chunkSize = 20;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) chunks.push(text.slice(i, i + chunkSize));

  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        const chunk = { choices: [{ delta: { content: chunks[index] }, index: 0 }] };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        index++;
      } else {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });
}

// ─────────────────────────────────────────────
// MAIN SERVER
// ─────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, mode } = await req.json();

    // ── VISA MODE ──
    if (mode === "visa") {
      const visaSystemPrompt = `You are a visa expert AI agent. Provide current visa requirements for 2025-2026.

## VERIFIED OFFICIAL VISA PORTAL URLs:
- Germany: https://www.auswaertiges-amt.de/en/visa-service
- Finland: https://migri.fi/en/residence-permit-for-studies
- Sweden: https://www.migrationsverket.se/English/Private-individuals/Studying-in-Sweden.html
- Netherlands: https://ind.nl/en/residence-permits/study
- Italy: https://vistoperitalia.esteri.it/home/en
- Denmark: https://nyidanmark.dk/en-GB/You-want-to-apply/Study
- Norway: https://udi.no/en/want-to-apply/studies/
- Austria: https://www.bmi.gv.at/301/allgemeines.aspx
- Belgium: https://dofi.ibz.be/en
- Switzerland: https://www.sem.admin.ch/sem/en/home.html
- France: https://france-visas.gouv.fr/
- Spain: https://www.exteriores.gob.es/en/ServiciosAlCiudadano/Paginas/Visados.aspx
- Ireland: https://www.irishimmigration.ie/
- Poland: https://www.gov.pl/web/diplomacy/visas
- Czechia: https://www.mvcr.cz/mvcren/article/third-country-nationals-long-term-visa.aspx
- Hungary: https://konzuliszolgalat.kormany.hu/en
- USA: https://travel.state.gov/content/travel/en/us-visas/study.html
- UK: https://www.gov.uk/student-visa
- Canada: https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada.html
- Australia: https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500
- Japan: https://www.mofa.go.jp/j_info/visit/visa/index.html
- South Korea: https://www.visa.go.kr/

Return ONLY valid JSON (no markdown, no code fences):
{
  "country": "Country Name",
  "flag": "🇩🇰",
  "visaType": "Student Visa Type D",
  "processingTime": "6-12 weeks",
  "cost": "€75",
  "financialProof": "€10,000/year",
  "steps": ["Step 1...", "Step 2..."],
  "documents": ["Document 1...", "Document 2..."],
  "tips": ["Tip 1...", "Tip 2..."],
  "officialLink": "USE VERIFIED URL FROM ABOVE",
  "postStudyWorkPermit": "Description",
  "healthInsurance": "Requirements",
  "embassyInfo": "Embassy/consulate info for Bangladeshi applicants",
  "sources": [{"title": "Source Name", "url": "https://..."}]
}
Provide accurate 2025-2026 information for Bangladeshi student visa applicants.`;

      const response = await fetchAI({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: visaSystemPrompt }, ...messages],
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: "AI unavailable" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const visaData = await response.json();
      const content = visaData.choices?.[0]?.message?.content || "";

      try {
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned);
        parsed.lastVerified = new Date().toISOString();
        return new Response(JSON.stringify({ visa: parsed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch {
        return new Response(JSON.stringify({ visa: null, raw: content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ── COUNTRY GUIDE MODE ──
    if (mode === "country-guide") {
      const guideSystemPrompt = `You are a student living guide expert. Provide current information about student life in the requested country for 2025-2026.

Return ONLY valid JSON (no markdown, no code fences):
{
  "country": "Country Name",
  "flag": "🇩🇪",
  "housing": {"summary": "...", "options": ["..."], "tips": ["..."]},
  "partTimeJobs": {"summary": "...", "rules": ["..."], "commonJobs": ["..."], "tips": ["..."]},
  "costOfLiving": {"summary": "...", "breakdown": {"rent": "€300-600/mo", "food": "€200-300/mo", "transport": "€30-80/mo", "internet_phone": "€20-40/mo", "health_insurance": "€80-120/mo", "misc": "€100-200/mo"}},
  "transport": {"summary": "...", "options": ["..."]},
  "healthcare": {"summary": "...", "details": ["..."]},
  "studentLife": {"summary": "...", "highlights": ["..."]},
  "safety": {"summary": "...", "tips": ["..."]},
  "sources": [{"title": "Source Name", "url": "https://..."}]
}
Provide accurate 2025-2026 information specifically useful for Bangladeshi students studying abroad.`;

      const response = await fetchAI({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: guideSystemPrompt }, ...messages],
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: "AI unavailable" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const guideData = await response.json();
      const content = guideData.choices?.[0]?.message?.content || "";

      try {
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned);
        parsed.lastVerified = new Date().toISOString();
        return new Response(JSON.stringify({ guide: parsed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch {
        return new Response(JSON.stringify({ guide: null, raw: content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ── SUGGEST-COUNTRIES MODE ──
    if (mode === "suggest-countries") {
      const profileData = messages[0] || {};
      const profileContent = profileData.content || (() => {
        const p = profileData;
        const parts = [`Suggest the best study abroad countries for my profile:`];
        if (p.degreeLevel) parts.push(`Degree: ${p.degreeLevel}`);
        if (p.major) parts.push(`Major: ${p.major}`);
        if (p.cgpa) parts.push(`CGPA: ${p.cgpa}/${p.cgpaScale || 4}`);
        if (p.ielts) parts.push(`IELTS: ${p.ielts}`);
        if (p.toefl) parts.push(`TOEFL: ${p.toefl}`);
        if (p.budgetMin || p.budgetMax) parts.push(`Budget: €${p.budgetMin || 0} - €${p.budgetMax || 'unlimited'}/year`);
        if (p.extracurriculars) parts.push(`Extracurriculars: ${p.extracurriculars}`);
        if (p.internshipDetails) parts.push(`Internships: ${p.internshipDetails}`);
        if (p.workExperienceYears) parts.push(`Work experience: ${p.workExperienceYears} years`);
        if (p.researchPaperCount) parts.push(`Research papers: ${p.researchPaperCount}`);
        if (p.publicationsCount) parts.push(`Publications: ${p.publicationsCount}`);
        return parts.join('\n');
      })();

      const suggestSystemPrompt = `${COUNTRY_ADVISOR_SYSTEM}

CRITICAL INSTRUCTIONS:
- You MUST generate country suggestions based on whatever profile information is provided.
- NEVER ask the student for more information. Work with what you have.
- If IELTS/TOEFL/GRE scores are not provided, assume the student will take them later — still recommend countries.
- If extracurriculars or work experience are not mentioned, ignore those factors.
- If budget is not provided, recommend a mix of affordable and premium options.
- ALWAYS return 5-10 country suggestions no matter what.

After analyzing the student's profile using your tools, you MUST return your final answer as a JSON array inside a \`\`\`json code fence. Each item must have:
- "countryId": lowercase country ID (e.g. "germany", "finland", "sweden")
- "rank": number (1 = best)
- "reason": 1-2 sentence explanation of why this country fits
- "fitScore": one of "excellent", "good", "moderate", "weak"

Example format:
\`\`\`json
[
  {"countryId": "germany", "rank": 1, "reason": "Free tuition and strong engineering programs.", "fitScore": "excellent"},
  {"countryId": "finland", "rank": 2, "reason": "Good scholarship options for your profile.", "fitScore": "good"}
]
\`\`\`

Return 5-10 countries ranked by fit.`;

      const agentResult = await runAgentLoop(suggestSystemPrompt, [{ role: "user", content: profileContent }]);

      let suggestions: any[] = [];
      try {
        const jsonMatch = agentResult.match(/```json\s*([\s\S]*?)```/);
        if (jsonMatch) {
          suggestions = JSON.parse(jsonMatch[1].trim());
        } else {
          const cleaned = agentResult.replace(/```\w*\n?/g, '').trim();
          const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
          if (arrayMatch) suggestions = JSON.parse(arrayMatch[0]);
        }
      } catch (parseErr) {
        console.error("Failed to parse agent suggestions:", parseErr);
      }

      suggestions = suggestions
        .filter((s: any) => s.countryId && s.reason)
        .map((s: any, i: number) => ({
          countryId: s.countryId.toLowerCase().replace(/\s+/g, '-'),
          rank: s.rank || i + 1,
          reason: s.reason,
          fitScore: ['excellent', 'good', 'moderate', 'weak'].includes(s.fitScore) ? s.fitScore : 'moderate',
        }));

      return new Response(
        JSON.stringify({ suggestions: suggestions.slice(0, 10), agentAnalysis: agentResult }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ADVISOR MODE ──
    if (mode === "advisor") {
      const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
      if (lastUserMsg && isOffTopic(lastUserMsg.content, "advisor")) {
        return new Response(createSSEStream(OFF_TOPIC_RESPONSE), { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
      }
      // Merge any caller-provided system messages (e.g. student profile context) into the advisor system prompt
      const callerSystemMessages = messages.filter((m: any) => m.role === "system").map((m: any) => m.content).join("\n\n");
      const nonSystemMessages = messages.filter((m: any) => m.role !== "system");
      const mergedSystem = callerSystemMessages
        ? `${COUNTRY_ADVISOR_SYSTEM}\n\n## STUDENT CONTEXT (USE THIS — do NOT ask for info already provided here)\n${callerSystemMessages}`
        : COUNTRY_ADVISOR_SYSTEM;
      try {
        const agentResult = await runAgentLoop(mergedSystem, nonSystemMessages);
        return new Response(createSSEStream(agentResult), { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
      } catch (err: any) {
        console.error("Advisor mode exception:", err);
        return createErrorResponse(err, {
          error: err?.status === 402
            ? "AI credits exhausted. Please add credits in Settings → Workspace → Usage."
            : err?.status === 429
              ? "Rate limits exceeded, please try again later."
              : undefined,
          fallback: err?.status !== 402,
        });
      }
    }

    // ── DEFAULT CHAT MODE ──
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    if (lastUserMsg && isOffTopic(lastUserMsg.content)) {
      return new Response(createSSEStream(OFF_TOPIC_RESPONSE), { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    // Merge caller-provided system messages into the agent system prompt
    const callerSystemDefault = messages.filter((m: any) => m.role === "system").map((m: any) => m.content).join("\n\n");
    const nonSystemDefault = messages.filter((m: any) => m.role !== "system");
    const mergedSystemDefault = callerSystemDefault
      ? `${AGENT_SYSTEM_PROMPT}\n\n## STUDENT CONTEXT (USE THIS — do NOT ask for info already provided here)\n${callerSystemDefault}`
      : AGENT_SYSTEM_PROMPT;

    try {
      const agentResult = await runAgentLoop(mergedSystemDefault, nonSystemDefault);
      return new Response(createSSEStream(agentResult), { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    } catch (err: any) {
      return createErrorResponse(err, {
        error: err?.status === 402
          ? "AI credits exhausted. Please add funds."
          : err?.status === 429
            ? "Rate limit exceeded. Please try again shortly."
            : undefined,
        fallback: err?.status !== 402,
      });
    }

  } catch (e) {
    console.error("agent error:", e);
    return createErrorResponse(e);
  }
});
