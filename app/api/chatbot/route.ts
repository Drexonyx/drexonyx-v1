import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getClient } from '@/lib/chatbot/clients';

export const runtime = 'edge';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-lite',
      systemInstruction: client.systemPrompt,
    });

    const recent = messages.slice(-8) as { role: string; content: string }[];
    const history = recent.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));
    const lastMsg = recent[recent.length - 1];

    const chat = model.startChat({ history, generationConfig: { maxOutputTokens: 300 } });
    const result = await chat.sendMessageStream(lastMsg.content);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) controller.enqueue(encoder.encode(text));
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
