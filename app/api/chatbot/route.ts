import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getClient } from '@/lib/chatbot/clients';

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
      model: 'gemini-3.8-flash',
      systemInstruction: client.systemPrompt,
    });

    const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history });
    const lastMsg = messages[messages.length - 1].content;
    const result = await chat.sendMessage(lastMsg);
    const reply = result.response.text();

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('[chatbot]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
