import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getClient } from '@/lib/chatbot/clients';
// DR 0122: Register Social Seller Bot merchants as a module-load side effect.
import '@/lib/chatbot/social-seller';

export const runtime = 'edge';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];

// In-memory sliding window rate limiter (per Edge instance).
// Limits: 20 requests / 60 s per (IP × clientId).
// Note: each Edge isolate has its own map; this is per-instance protection.
// For distributed limiting, replace with Upstash Redis.
const rlMap = new Map<string, number[]>();
const RL_WINDOW_MS = 60_000;
const RL_MAX = 20;

function checkRateLimit(key: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const cutoff = now - RL_WINDOW_MS;
  const hits = (rlMap.get(key) ?? []).filter(t => t > cutoff);
  if (hits.length >= RL_MAX) {
    const retryAfter = Math.ceil((hits[0] + RL_WINDOW_MS - now) / 1000);
    return { ok: false, retryAfter };
  }
  hits.push(now);
  rlMap.set(key, hits);
  return { ok: true, retryAfter: 0 };
}

export async function POST(req: NextRequest) {
  try {
    const { messages, clientId = 'demo' } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 });
    }

    const client = getClient(clientId);
    if (!client) {
      return NextResponse.json({ error: 'Unknown client' }, { status: 404 });
    }

    // Subscription guard — reject if explicitly inactive or past expiry date
    const now = new Date();
    if (client.active === false || (client.expiresAt != null && client.expiresAt < now)) {
      return NextResponse.json({ error: 'Subscription inactive' }, { status: 403 });
    }

    // Rate limiting: 20 requests per minute per IP per client
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
    const rl = checkRateLimit(`${ip}:${clientId}`);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
      );
    }

    const recent = messages.slice(-8) as { role: string; content: string }[];
    const historyRaw = recent.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));
    const firstUser = historyRaw.findIndex(m => m.role === 'user');
    const history = firstUser >= 0 ? historyRaw.slice(firstUser) : [];
    const lastMsg = recent[recent.length - 1];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let sent = false;
        try {
          for (const modelName of MODELS) {
            try {
              const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: client.systemPrompt,
              });
              const chat = model.startChat({ history, generationConfig: { maxOutputTokens: 600 } });
              const result = await chat.sendMessageStream(lastMsg.content);
              for await (const chunk of result.stream) {
                const text = chunk.text();
                if (text) { controller.enqueue(encoder.encode(text)); sent = true; }
              }
              return;
            } catch (err: unknown) {
              const e = err as { status?: number; message?: string };
              const retired = e?.status === 404 || String(e?.message).includes('no longer available');
              if (retired && modelName !== MODELS[MODELS.length - 1]) {
                console.warn(`[chatbot] ${modelName} retired, switching to fallback`);
                continue;
              }
              throw err;
            }
          }
        } catch (err) {
          console.error('[chatbot]', err);
          if (!sent) {
            controller.enqueue(encoder.encode('عذراً، هناك انقطاع مؤقت في الخدمة. يرجى المحاولة خلال لحظات.'));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    console.error('[chatbot]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
