import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getClient } from '@/lib/chatbot/clients';

export const runtime = 'edge';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const MODELS = ['gemini-2.0-flash-lite', 'gemini-2.0-flash'];

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
              const chat = model.startChat({ history, generationConfig: { maxOutputTokens: 300 } });
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
