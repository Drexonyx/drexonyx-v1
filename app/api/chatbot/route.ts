import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getClient } from '@/lib/chatbot/clients';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      system: client.systemPrompt,
      messages: messages.slice(-10),
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    return NextResponse.json({ reply: text });
  } catch (err) {
    console.error('[chatbot]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
