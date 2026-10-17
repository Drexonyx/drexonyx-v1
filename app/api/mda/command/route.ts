// POST /api/mda/command — MDA natural-language command interface.
// Auth: admin session required (same gate as all admin API routes).
// Body: { request: string, client_id?: string }
// Returns: MDACommandResponse

import { NextRequest, NextResponse } from 'next/server'
import { getAdminSessionFromRequest } from '@/lib/admin/session'
import { handleCommand, formatCommandResponse } from '../../../../master-digital-agency/command'

export const runtime = 'nodejs'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = getAdminSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const input = typeof b?.request === 'string' ? b.request.trim() : ''
  const clientId = typeof b?.client_id === 'string' ? b.client_id : undefined

  if (!input) {
    return NextResponse.json({ error: 'request field is required' }, { status: 422 })
  }

  if (input.length > 2000) {
    return NextResponse.json({ error: 'request too long (max 2000 chars)' }, { status: 422 })
  }

  const result = handleCommand(input, [], clientId)

  return NextResponse.json(result, { status: 200 })
}

// GET /api/mda/command — health check, returns interface description
export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = getAdminSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    name: 'MDA Command Interface',
    version: '1.0',
    description: 'Master Digital Agency natural-language command interface',
    usage: 'POST { "request": "<natural language agency request>" }',
    excludedCapabilities: [
      'WhatsApp API',
      'AI calling / telephony',
      'SMS',
      'Paid CRM platforms',
      'Finance / payment systems / bank integrations',
      'Fake followers / spam / unauthorized mass outreach',
      'Paid hosting as required dependency',
    ],
  })
}
