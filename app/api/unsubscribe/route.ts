// Public unsubscribe endpoint — linked from every commercial outreach email.
// CAN-SPAM / CASL compliance: processes opt-out requests by token.
// Idempotent: re-clicking the same link after opting out returns 200 OK.
// No authentication required — must be reachable by email recipients.

import { NextRequest, NextResponse } from 'next/server';
import { recordOptOut } from '@/lib/sales/queries';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get('token');

  if (!token || token.trim() === '') {
    return htmlResponse(400, 'Invalid Link', 'This unsubscribe link is not valid. Please contact us directly at info@drexonyx.com if you wish to unsubscribe.');
  }

  const result = await recordOptOut(token.trim());

  if (!result.ok) {
    return htmlResponse(404, 'Link Not Found', 'This unsubscribe link was not found. It may have expired or been used already. Contact us at info@drexonyx.com to be removed from our list.');
  }

  if (result.alreadyOptedOut) {
    return htmlResponse(200, 'Already Unsubscribed', 'You have already been removed from our mailing list. You will not receive further commercial emails from Master Digital Agency.');
  }

  return htmlResponse(200, 'Unsubscribed', 'You have been successfully removed from our mailing list. You will not receive further commercial emails from Master Digital Agency.');
}

function htmlResponse(status: number, title: string, message: string): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — Master Digital Agency</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #111827; max-width: 480px; margin: 80px auto; padding: 24px; text-align: center; }
    h1 { font-size: 1.5rem; margin: 0 0 12px; }
    p { color: #6b7280; line-height: 1.6; margin: 0; }
    a { color: #6b7280; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>${message}</p>
</body>
</html>`;
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
