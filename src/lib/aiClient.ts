/**
 * Hybrid AI Client — routes to local Ollama on localhost, cloud edge functions otherwise.
 * Production (Vercel/Lovable) is completely unaffected.
 */

type Message = { role: 'user' | 'assistant' | 'system'; content: string };

const OLLAMA_URL = 'http://localhost:11434/api/chat';
const OLLAMA_MODEL = 'llama3.1:8b';

export function isLocal(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

// ─── Streaming ───────────────────────────────────────────────

interface StreamAIOptions {
  messages: Message[];
  systemPrompt?: string;
  edgeFunctionPath: string; // e.g. 'chat', 'professor-search', 'paper-analysis'
  mode?: string; // optional mode flag forwarded to edge function (e.g. 'advisor')
  extraBody?: Record<string, unknown>; // any extra fields to merge into the request body
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}

export async function streamAI({
  messages,
  systemPrompt,
  edgeFunctionPath,
  mode,
  extraBody,
  onDelta,
  onDone,
  onError,
}: StreamAIOptions) {
  if (isLocal()) {
    return streamOllama({ messages, systemPrompt, onDelta, onDone, onError });
  }
  return streamEdgeFunction({ messages, edgeFunctionPath, mode, extraBody, onDelta, onDone, onError });
}

// ─── Non-streaming (for simple requests like export-refine) ──

interface CallAIOptions {
  messages: Message[];
  systemPrompt?: string;
  edgeFunctionPath: string;
}

export async function callAI({ messages, systemPrompt, edgeFunctionPath }: CallAIOptions): Promise<string> {
  if (isLocal()) {
    return callOllama({ messages, systemPrompt });
  }
  return callEdgeFunction({ messages, edgeFunctionPath });
}

// ─── Structured invoke (replaces supabase.functions.invoke for AI calls) ──

interface InvokeAIOptions {
  edgeFunctionPath: string;
  body: Record<string, unknown>;
  systemPrompt?: string;
}

/**
 * Drop-in replacement for supabase.functions.invoke() on AI edge functions.
 * On localhost → calls Ollama with a system prompt that asks for JSON.
 * In production → calls the edge function exactly as before.
 */
export async function invokeAI({ edgeFunctionPath, body, systemPrompt }: InvokeAIOptions): Promise<{ data: any; error: any }> {
  if (isLocal()) {
    try {
      const messages: Message[] = (body.messages as Message[]) || [{ role: 'user', content: JSON.stringify(body) }];
      const prompt = systemPrompt || `You are an AI assistant. The user request has mode="${body.mode || 'default'}". Respond with valid JSON only, no markdown.`;
      const raw = await callOllama({ messages, systemPrompt: prompt });
      // Try to parse JSON from the response
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { data: JSON.parse(jsonMatch[0]), error: null };
      }
      return { data: raw, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }

  // Production: call edge function via fetch (same as supabase.functions.invoke)
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${edgeFunctionPath}`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      return { data: null, error: new Error(errData.error || `Error ${resp.status}`) };
    }
    const data = await resp.json();
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}

// ─── Ollama (local) ──────────────────────────────────────────

async function streamOllama({
  messages,
  systemPrompt,
  onDelta,
  onDone,
  onError,
}: Omit<StreamAIOptions, 'edgeFunctionPath'>) {
  try {
    const ollamaMessages = buildOllamaMessages(messages, systemPrompt);
    const resp = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, messages: ollamaMessages, stream: true }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      onError(`Ollama error ${resp.status}: ${text || 'Is Ollama running?'}`);
      return;
    }

    if (!resp.body) { onError('No response body from Ollama'); return; }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Ollama streams NDJSON (one JSON object per line)
      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        try {
          const parsed = JSON.parse(line);
          const content = parsed.message?.content;
          if (content) onDelta(content);
          if (parsed.done) { onDone(); return; }
        } catch {
          // partial JSON, put back
          buffer = line + '\n' + buffer;
          break;
        }
      }
    }
    onDone();
  } catch (err) {
    onError(err instanceof Error ? err.message : 'Failed to connect to Ollama. Is it running?');
  }
}

async function callOllama({ messages, systemPrompt }: { messages: Message[]; systemPrompt?: string }): Promise<string> {
  const ollamaMessages = buildOllamaMessages(messages, systemPrompt);
  const resp = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OLLAMA_MODEL, messages: ollamaMessages, stream: false }),
  });
  if (!resp.ok) throw new Error(`Ollama error ${resp.status}`);
  const data = await resp.json();
  return data.message?.content || '';
}

function buildOllamaMessages(messages: Message[], systemPrompt?: string): Message[] {
  const result: Message[] = [];
  if (systemPrompt) {
    result.push({ role: 'system', content: systemPrompt });
  }
  result.push(...messages);
  return result;
}

// ─── Cloud edge functions ────────────────────────────────────

async function streamEdgeFunction({
  messages,
  edgeFunctionPath,
  mode,
  extraBody,
  onDelta,
  onDone,
  onError,
}: Omit<StreamAIOptions, 'systemPrompt'>) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${edgeFunctionPath}`;

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, ...(mode ? { mode } : {}), ...(extraBody || {}) }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      let message = `Error ${resp.status}`;

      try {
        const parsed = JSON.parse(text);
        message = parsed.error || message;
      } catch {
        if (text) message = text;
      }

      onError(message);
      onDone();
      return;
    }

    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream')) {
      const text = await resp.text().catch(() => '');
      let message = text || 'Unexpected response from server';

      try {
        const parsed = JSON.parse(text);
        message = parsed.error || message;
      } catch {
        // keep plain text response
      }

      onError(message);
      onDone();
      return;
    }

    if (!resp.body) {
      onError('No response body');
      onDone();
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let gotAnyContent = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (!line.startsWith('data: ')) continue;

        const json = line.slice(6).trim();
        if (json === '[DONE]') {
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(json);
          const streamError = parsed.error;
          if (streamError) {
            onError(typeof streamError === 'string' ? streamError : streamError.message || 'Stream error');
            onDone();
            return;
          }

          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            gotAnyContent = true;
            onDelta(content);
          }
        } catch {
          buffer = line + '\n' + buffer;
          break;
        }
      }
    }

    if (!gotAnyContent) {
      onError('Empty response from AI. Please try again.');
    }
    onDone();
  } catch (err) {
    onError(err instanceof Error ? err.message : 'Network error. Please try again.');
    onDone();
  }
}

async function callEdgeFunction({ messages, edgeFunctionPath }: Omit<CallAIOptions, 'systemPrompt'>): Promise<string> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${edgeFunctionPath}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });
  if (!resp.ok) throw new Error(`Edge function error ${resp.status}`);
  const data = await resp.json();
  // Edge functions may return different shapes; try common patterns
  return data.selectedFields ? JSON.stringify(data) : (data.choices?.[0]?.message?.content || JSON.stringify(data));
}
