import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─────────────────────────────────────────────
// Gemini API Key Rotation
// ─────────────────────────────────────────────
function getAllGeminiKeys(): string[] {
  const keyNames = ["GEMINI_KEY_5", "GEMINI_KEY_6", "GEMINI_KEY_7", "GEMINI_KEY_8", "GEMINI_KEY_9"];
  const keys: string[] = [];
  for (const name of keyNames) {
    const val = Deno.env.get(name);
    if (val) keys.push(val);
  }
  return keys;
}

function getRandomGeminiKey(): string {
  const keys = getAllGeminiKeys();
  if (keys.length === 0) throw new Error("No Gemini API keys configured");
  return keys[Math.floor(Math.random() * keys.length)];
}

// ─────────────────────────────────────────────
// Off-topic Detection
// ─────────────────────────────────────────────
function isOffTopic(message: string): boolean {
  const lower = message.toLowerCase().trim();
  if (/^(hi|hello|hey|thanks|thank you)[!. ]*$/i.test(lower)) return false;
  if (/\b(olympic|olympics|cricket|football|soccer|nba|movie|movies|music|celebrity|election|war|recipe|cooking|crypto|stock)\b/i.test(lower)) return true;

  const academicKeywords = [
    'professor','supervisor','faculty','advisor','adviser','phd','doctorate',
    'research','lab','laboratory','publication','paper','thesis','dissertation',
    'university','college','department','school','institute',
    'major','field','computer science','data science','machine learning','AI','artificial intelligence',
    'engineering','mathematics','physics','chemistry','biology','economics',
    'email','cold email','contact','reach out','apply','application',
    'funding','grant','assistantship','stipend','scholarship',
    'position','opening','vacancy','admit','admission',
    'student','candidate','postdoc','postdoctoral',
    'mit','stanford','harvard','oxford','cambridge','eth','epfl',
    'tampere','aalto','tu munich','tu delft','kth',
    'find','search','recommend','suggest','compare','list','show',
    'who','which','best','top','good','suitable',
    'supervision','mentor','guide','group','team',
    'google scholar','researchgate','dblp','h-index','citation',
    'npl','nlp','cv','robotics','systems','network','security','database',
    'software','hardware','embedded','iot','cloud','distributed',
  ];

  const escapeRegExp = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hasKeyword = academicKeywords.some((kw) => {
    const pattern = kw.includes(' ') ? new RegExp(escapeRegExp(kw), 'i') : new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'i');
    return pattern.test(lower);
  });

  return !hasKeyword;
}

const OFF_TOPIC_RESPONSE = `I'm here to help you find PhD supervisors and professors! 🎓

I can assist with:
• **Finding professors** — by university, field, or research interest
• **Comparing supervisors** — across universities or research groups
• **Cold email tips** — how to approach potential supervisors
• **Research group info** — lab focus, funding, recent publications
• **Application advice** — for PhD positions and research roles

What would you like to know?`;

// ─────────────────────────────────────────────
// AGENT TOOLS
// ─────────────────────────────────────────────

// Tool: search_professors — AI uses this to structure its professor search
function toolSearchProfessors(args: any): any {
  const { university, field, research_interests, country } = args;
  // This tool returns the structured query back — the AI agent will use its own knowledge
  // to populate professor data based on these criteria
  return {
    search_executed: true,
    criteria: {
      university: university || "Any",
      field: field || "Not specified",
      research_interests: research_interests || "General",
      country: country || "Any",
    },
    instruction: "Based on these search criteria, provide professor recommendations from your knowledge. Include real, active professors with accurate details. Format each professor with: name, title, department, university, research areas, email (if publicly known), profile URL, recent work, and funding availability.",
  };
}

// Tool: get_professor_profile — deep dive on a specific professor
function toolGetProfessorProfile(args: any): any {
  const { professor_name, university } = args;
  return {
    lookup_executed: true,
    query: { professor_name, university: university || "Not specified" },
    instruction: "Provide detailed information about this professor from your knowledge: full bio, research group details, recent publications, current PhD students, lab culture, funding status, and how to contact them.",
  };
}

// Tool: compare_professors — side-by-side comparison
function toolCompareProfessors(args: any): any {
  const { professors } = args;
  return {
    comparison_requested: true,
    professors_to_compare: professors,
    instruction: "Compare these professors side-by-side covering: research focus, h-index/citations (approximate), lab size, funding availability, supervision style, and which student profiles each is best suited for.",
  };
}

// Tool: draft_cold_email — help write an email to a professor
function toolDraftColdEmail(args: any): any {
  const { professor_name, university, student_background, research_interest } = args;
  return {
    draft_requested: true,
    context: {
      professor: professor_name,
      university: university || "Not specified",
      student_background: student_background || "Not provided",
      research_interest: research_interest || "Not specified",
    },
    instruction: "Draft a professional, concise cold email for a PhD position inquiry. Include: subject line, greeting, brief self-introduction, specific mention of professor's work, research interest alignment, and polite closing. Keep it under 200 words.",
  };
}

// Tool: search_research_groups — find labs/groups in a field
function toolSearchResearchGroups(args: any): any {
  const { field, country, focus_area } = args;
  return {
    search_executed: true,
    criteria: {
      field: field || "Not specified",
      country: country || "Any",
      focus_area: focus_area || "General",
    },
    instruction: "List notable research groups/labs in this field and region. Include: group name, lead professor(s), university, key research themes, and notable achievements.",
  };
}

// Tool execution dispatcher
function executeTool(name: string, args: any): any {
  switch (name) {
    case "search_professors": return toolSearchProfessors(args);
    case "get_professor_profile": return toolGetProfessorProfile(args);
    case "compare_professors": return toolCompareProfessors(args);
    case "draft_cold_email": return toolDraftColdEmail(args);
    case "search_research_groups": return toolSearchResearchGroups(args);
    default: return { error: `Unknown tool: ${name}` };
  }
}

// Gemini function declarations
const AGENT_TOOL_DECLARATIONS = [
  {
    name: "search_professors",
    description: "Search for PhD supervisors/professors at a specific university or in a specific field. Returns structured criteria for the agent to populate with real professor data.",
    parameters: {
      type: "object",
      properties: {
        university: { type: "string", description: "University name (e.g., 'MIT', 'Tampere University')" },
        field: { type: "string", description: "Academic field or major (e.g., 'Computer Science', 'Machine Learning')" },
        research_interests: { type: "string", description: "Specific research interests (e.g., 'NLP, deep learning')" },
        country: { type: "string", description: "Country to search in (optional)" },
      },
    },
  },
  {
    name: "get_professor_profile",
    description: "Get detailed profile information about a specific professor including their research group, publications, and PhD supervision details.",
    parameters: {
      type: "object",
      properties: {
        professor_name: { type: "string", description: "Full name of the professor" },
        university: { type: "string", description: "University name (optional, helps disambiguation)" },
      },
      required: ["professor_name"],
    },
  },
  {
    name: "compare_professors",
    description: "Compare multiple professors side-by-side on research focus, funding, supervision style, and suitability for different student profiles.",
    parameters: {
      type: "object",
      properties: {
        professors: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              university: { type: "string" },
            },
          },
          description: "List of professors to compare (2-5)",
        },
      },
      required: ["professors"],
    },
  },
  {
    name: "draft_cold_email",
    description: "Generate a professional cold email template for contacting a professor about PhD positions.",
    parameters: {
      type: "object",
      properties: {
        professor_name: { type: "string", description: "Professor's name" },
        university: { type: "string", description: "University name" },
        student_background: { type: "string", description: "Brief student background (degree, CGPA, skills)" },
        research_interest: { type: "string", description: "Student's research interests" },
      },
      required: ["professor_name"],
    },
  },
  {
    name: "search_research_groups",
    description: "Search for research groups/labs in a specific field, optionally filtered by country or focus area.",
    parameters: {
      type: "object",
      properties: {
        field: { type: "string", description: "Academic field (e.g., 'Computer Science')" },
        country: { type: "string", description: "Country filter (optional)" },
        focus_area: { type: "string", description: "Specific focus area (e.g., 'Reinforcement Learning')" },
      },
      required: ["field"],
    },
  },
];

// ─────────────────────────────────────────────
// Agent System Prompt
// ─────────────────────────────────────────────

const AGENT_SYSTEM_PROMPT = `You are the PhD Supervisor Finder — a specialized AI AGENT that helps students find professors and research supervisors for PhD positions worldwide.

## YOU ARE A REAL AI AGENT
You have access to tools. You MUST use them to structure your search before answering.
- When a user asks about professors → call search_professors
- When a user asks about a specific professor → call get_professor_profile  
- When a user wants to compare → call compare_professors
- When a user wants help writing an email → call draft_cold_email
- When a user asks about research groups/labs → call search_research_groups
- You can call MULTIPLE tools in sequence for comprehensive answers

## RESPONSE GUIDELINES
For professor recommendations, format each one clearly:

**Professor Name** — Title, Department
- 🏛️ University Name
- 🔬 **Research Areas:** area1, area2, area3
- 📧 **Email:** email@university.edu (or "Not publicly available")
- 🔗 **Profile:** [University Page](url) | [Google Scholar](url)
- 📄 **Recent Work:** Brief description of notable recent research
- ✅ **Why a good fit:** Explanation of alignment with student's interests  
- 💰 **Funding:** Likely has funding / May have funding / Unknown

## SCOPE RESTRICTION
You are STRICTLY limited to academic/professor/PhD topics. REFUSE anything else.
If off-topic: "I'm here to help you find PhD supervisors! 🎓 What would you like to know?"

## IMPORTANT RULES
- Only recommend REAL, active professors you are confident about
- If uncertain about a professor's current status, explicitly note that
- Always add a disclaimer: "Please verify details through official university websites"
- Understand that students may be from developing countries with limited access to info
- Be warm, encouraging, but honest about competitiveness`;

// ─────────────────────────────────────────────
// Gemini Native API Helpers
// ─────────────────────────────────────────────

function convertToGeminiFormat(messages: any[]) {
  const contents: any[] = [];
  let systemInstruction: any = null;

  for (const msg of messages) {
    if (msg.role === "system") {
      systemInstruction = { parts: [{ text: msg.content }] };
    } else if (msg.role === "user") {
      contents.push({ role: "user", parts: [{ text: msg.content }] });
    } else if (msg.role === "assistant" || msg.role === "model") {
      contents.push({ role: "model", parts: [{ text: msg.content }] });
    }
  }

  return { contents, systemInstruction };
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 1): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url, options);
    if (response.status === 429 && attempt < maxRetries - 1) {
      let waitMs = Math.pow(2, attempt) * 3000 + Math.random() * 1000;
      try {
        const clone = response.clone();
        const errBody = await clone.json();
        const retryInfo = errBody.error?.details?.find((d: any) => d["@type"]?.includes("RetryInfo"));
        if (retryInfo?.retryDelay) {
          const seconds = parseInt(retryInfo.retryDelay);
          if (!isNaN(seconds)) waitMs = (seconds + 2) * 1000;
        }
      } catch { /* use default wait */ }
      console.log(`Rate limited, waiting ${Math.round(waitMs)}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
      continue;
    }
    return response;
  }
  throw new Error("Max retries exceeded");
}

// ─────────────────────────────────────────────
// AGENT LOOP — ReAct-style
// ─────────────────────────────────────────────

const MAX_AGENT_ITERATIONS = 3;

async function runAgentLoop(systemPrompt: string, messages: any[], apiKey: string): Promise<string> {
  const { contents, systemInstruction } = convertToGeminiFormat([
    { role: "system", content: systemPrompt },
    ...messages,
  ]);

  const geminiTools = [{
    function_declarations: AGENT_TOOL_DECLARATIONS,
  }];

  let currentContents = [...contents];
  let finalResponse = "";

  for (let iteration = 0; iteration < MAX_AGENT_ITERATIONS; iteration++) {
    console.log(`Professor Agent iteration ${iteration + 1}/${MAX_AGENT_ITERATIONS}`);

    const body: any = {
      contents: currentContents,
      tools: geminiTools,
    };
    if (systemInstruction) body.system_instruction = systemInstruction;

    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Agent iteration ${iteration + 1} error:`, response.status, errText);
      throw { status: response.status, message: errText };
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate?.content?.parts) {
      console.log("No parts in response, ending loop");
      break;
    }

    const parts = candidate.content.parts;
    const functionCalls = parts.filter((p: any) => p.functionCall);
    const textParts = parts.filter((p: any) => p.text);

    if (functionCalls.length > 0) {
      console.log(`Agent calling ${functionCalls.length} tool(s): ${functionCalls.map((fc: any) => fc.functionCall.name).join(", ")}`);

      currentContents.push({ role: "model", parts });

      const functionResponseParts: any[] = [];
      for (const fc of functionCalls) {
        const { name, args } = fc.functionCall;
        const result = executeTool(name, args || {});
        console.log(`Tool ${name} executed`);
        functionResponseParts.push({
          functionResponse: {
            name,
            response: { result },
          },
        });
      }

      currentContents.push({ role: "user", parts: functionResponseParts });
      continue;
    }

    if (textParts.length > 0) {
      finalResponse = textParts.map((p: any) => p.text).join("");
    }
    break;
  }

  return finalResponse || "I wasn't able to generate a response. Please try again.";
}

// ─────────────────────────────────────────────
// SSE Stream from text
// ─────────────────────────────────────────────

function createSSEStream(text: string): ReadableStream {
  const encoder = new TextEncoder();
  const chunkSize = 20;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiKey = getRandomGeminiKey();

    // Off-topic check
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    if (lastUserMsg && isOffTopic(lastUserMsg.content)) {
      // Allow refine requests even if they look off-topic
      const isRefine = /\b(refine|improve|rewrite|make.*(precise|clearer|better)|polish)\b.*\b(prompt|query|question|search|request|this)\b/i.test(lastUserMsg.content)
        || /\b(refine|improve|rewrite|polish)\b.*\b(this|my|the)\b/i.test(lastUserMsg.content);
      if (!isRefine) {
        const stream = createSSEStream(OFF_TOPIC_RESPONSE);
        return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
      }
    }

    // ── Prompt Refinement shortcut ──
    if (lastUserMsg) {
      const isRefineRequest = /\b(refine|improve|rewrite|make.*(precise|clearer|better)|polish)\b.*\b(prompt|query|question|search|request|this)\b/i.test(lastUserMsg.content)
        || /\b(refine|improve|rewrite|polish)\b.*\b(this|my|the)\b/i.test(lastUserMsg.content);

      if (isRefineRequest) {
        // Find the previous user message to refine
        const userMessages = messages.filter((m: any) => m.role === "user");
        const previousUserMsg = userMessages.length >= 2 ? userMessages[userMessages.length - 2] : null;

        if (previousUserMsg) {
          const refineSystemPrompt = `You are a prompt engineer specializing in academic search queries. The user wants to search for PhD supervisors/professors. Take their original query and rewrite it into a precise, structured professor search prompt.

Rules:
- Output ONLY the refined prompt text, nothing else
- Start with "[REFINED PROMPT]" marker
- Make it specific: include research areas, geographic preferences, degree level
- Add structure: specify what information is needed (research focus, funding, publications, contact info)
- Keep it concise but comprehensive
- Preserve the user's original intent`;

          const { contents, systemInstruction } = convertToGeminiFormat([
            { role: "system", content: refineSystemPrompt },
            { role: "user", content: `Original query: "${previousUserMsg.content}"\n\nRewrite this into a precise, structured professor search prompt.` },
          ]);

          const body: any = { contents };
          if (systemInstruction) body.system_instruction = systemInstruction;

          const response = await fetchWithRetry(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`,
            { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
          );

          if (response.ok) {
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't refine that prompt. Please try rephrasing your request.";
            const stream = createSSEStream(text);
            return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
          }
        } else {
          const stream = createSSEStream("[REFINED PROMPT] I don't see a previous query to refine. Please type your professor search query first, then ask me to refine it.");
          return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
        }
      }
    }

    // Run the agent loop
    try {
      const agentResult = await runAgentLoop(AGENT_SYSTEM_PROMPT, messages, geminiKey);
      const stream = createSSEStream(agentResult);
      return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    } catch (err: any) {
      if (err.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw err;
    }

  } catch (e) {
    console.error("professor-search agent error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
