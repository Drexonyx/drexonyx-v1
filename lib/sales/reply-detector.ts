// Sales reply detection — Gmail API foundation layer.
//
// Polls Gmail threads to detect replies to sent outreach messages.
// Requires GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN.
// When credentials are absent, returns a graceful not-configured result.

export interface DetectedReply {
  outreachMessageId: string;
  gmailMessageId: string;
  receivedAt: Date;
}

export interface ReplyDetectionResult {
  configured: boolean;
  checked: number;
  repliesFound: DetectedReply[];
  errors: number;
}

export async function detectReplies(
  outreachRows: Array<{ id: string; external_thread_id: string | null }>,
): Promise<ReplyDetectionResult> {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return { configured: false, checked: 0, repliesFound: [], errors: 0 };
  }

  const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);
  if (!accessToken) {
    return { configured: true, checked: 0, repliesFound: [], errors: 1 };
  }

  const rowsWithThread = outreachRows.filter((r) => r.external_thread_id !== null);
  const repliesFound: DetectedReply[] = [];
  let errors = 0;

  for (const row of rowsWithThread) {
    try {
      const result = await checkThreadForReply(accessToken, row.external_thread_id!);
      if (result.hasReply && result.latestMessageId) {
        repliesFound.push({
          outreachMessageId: row.id,
          gmailMessageId: result.latestMessageId,
          receivedAt: result.receivedAt ?? new Date(),
        });
      }
    } catch {
      errors++;
    }
  }

  return {
    configured: true,
    checked: rowsWithThread.length,
    repliesFound,
    errors,
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function getAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<string | null> {
  try {
    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as Record<string, unknown>;
    return typeof data.access_token === 'string' ? data.access_token : null;
  } catch {
    return null;
  }
}

interface ThreadCheckResult {
  hasReply: boolean;
  latestMessageId: string | null;
  receivedAt: Date | null;
}

async function checkThreadForReply(
  accessToken: string,
  threadId: string,
): Promise<ThreadCheckResult> {
  try {
    const resp = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}?fields=messages(id,internalDate)`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!resp.ok) return { hasReply: false, latestMessageId: null, receivedAt: null };

    const data = (await resp.json()) as {
      messages?: Array<{ id: string; internalDate?: string }>;
    };
    const messages = data.messages ?? [];

    // A reply exists when there is more than one message in the thread
    if (messages.length <= 1) {
      return { hasReply: false, latestMessageId: null, receivedAt: null };
    }

    const latest = messages[messages.length - 1];
    const receivedAt = latest.internalDate
      ? new Date(Number(latest.internalDate))
      : new Date();

    return { hasReply: true, latestMessageId: latest.id, receivedAt };
  } catch {
    return { hasReply: false, latestMessageId: null, receivedAt: null };
  }
}
