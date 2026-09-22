// DR 0126: facebook.page.publish — skill unit tests.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { facebookPagePublishSkill } from '../skills/facebook/page-publish';
import type { SkillContext } from '../skills/interface';
import type { FacebookPagePublishInput } from '../skills/facebook/page-publish';

const CTX: SkillContext = {
  organizationId: 'org-001',
  actorId: 'user-001',
  actorType: 'USER',
  actorRole: 'OWNER',
};

const R2_ACCOUNT_ID = 'test-account-id';
const R2_ORIGIN = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const MEDIA_URL = `${R2_ORIGIN}/assets/test-image.jpg`;
const PAGE_ID_1 = '111222333444555';
const PAGE_ID_2 = '555444333222111';

const BASE_TEXT: FacebookPagePublishInput = {
  pageTarget: 'PAGE_1',
  contentType: 'TEXT',
  message: 'Check out our latest collection!',
  publishMode: 'IMMEDIATE',
  campaignId: 'camp-001',
};

// ─── fetch mock ───────────────────────────────────────────────────────────────

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockClear();
  vi.stubEnv('META_PAGE_ACCESS_TOKEN', 'test-token-abc');
  vi.stubEnv('META_PAGE_ID_1', PAGE_ID_1);
  vi.stubEnv('META_PAGE_ID_2', PAGE_ID_2);
  vi.stubEnv('R2_ACCOUNT_ID', R2_ACCOUNT_ID);
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ id: 'post-789' }),
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// ─── Skill metadata ────────────────────────────────────────────────────────────

describe('facebook.page.publish — metadata', () => {
  it('has correct id, version, family', () => {
    expect(facebookPagePublishSkill.id).toBe('facebook.page.publish');
    expect(facebookPagePublishSkill.version).toBe('1.0.0');
    expect(facebookPagePublishSkill.family).toBe('SOCIAL');
  });
});

// ─── Credential checks ─────────────────────────────────────────────────────────

describe('facebook.page.publish — credential checks', () => {
  it('fails with MISSING_CREDENTIAL when META_PAGE_ACCESS_TOKEN is absent', async () => {
    vi.stubEnv('META_PAGE_ACCESS_TOKEN', '');
    const result = await facebookPagePublishSkill.execute(BASE_TEXT, CTX);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('MISSING_CREDENTIAL');
      expect(result.isTransient).toBe(false);
    }
  });

  it('fails with MISSING_CREDENTIAL when both page ID env vars are absent', async () => {
    vi.stubEnv('META_PAGE_ID_1', '');
    vi.stubEnv('META_PAGE_ID_2', '');
    const result = await facebookPagePublishSkill.execute(BASE_TEXT, CTX);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('MISSING_CREDENTIAL');
  });

  it('succeeds when only META_PAGE_ID_1 is set and pageTarget is PAGE_1', async () => {
    vi.stubEnv('META_PAGE_ID_2', '');
    const result = await facebookPagePublishSkill.execute(BASE_TEXT, CTX);
    expect(result.ok).toBe(true);
  });

  it('fails with UNAUTHORIZED_PAGE when only META_PAGE_ID_1 is set but pageTarget is PAGE_2', async () => {
    vi.stubEnv('META_PAGE_ID_2', '');
    const result = await facebookPagePublishSkill.execute({ ...BASE_TEXT, pageTarget: 'PAGE_2' }, CTX);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('UNAUTHORIZED_PAGE');
  });
});

// ─── Page allowlist ────────────────────────────────────────────────────────────

describe('facebook.page.publish — page allowlist', () => {
  it('resolves PAGE_1 to META_PAGE_ID_1', async () => {
    const result = await facebookPagePublishSkill.execute(BASE_TEXT, CTX);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output.pageId).toBe(PAGE_ID_1);
  });

  it('resolves PAGE_2 to META_PAGE_ID_2', async () => {
    const result = await facebookPagePublishSkill.execute({ ...BASE_TEXT, pageTarget: 'PAGE_2' }, CTX);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output.pageId).toBe(PAGE_ID_2);
  });
});

// ─── Text post ────────────────────────────────────────────────────────────────

describe('facebook.page.publish — TEXT immediate', () => {
  it('succeeds and returns postId', async () => {
    const result = await facebookPagePublishSkill.execute(BASE_TEXT, CTX);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.postId).toBe('post-789');
      expect(result.output.publishMode).toBe('IMMEDIATE');
      expect(result.output.scheduledAt).toBeUndefined();
    }
  });

  it('calls /{pageId}/feed endpoint', async () => {
    await facebookPagePublishSkill.execute(BASE_TEXT, CTX);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain(`/${PAGE_ID_1}/feed`);
  });

  it('sets published:true for IMMEDIATE mode', async () => {
    await facebookPagePublishSkill.execute(BASE_TEXT, CTX);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.published).toBe(true);
  });

  it('does NOT log or include token in request body', async () => {
    await facebookPagePublishSkill.execute(BASE_TEXT, CTX);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(JSON.stringify(body)).not.toContain('test-token-abc');
  });

  it('sends token in Authorization header, not in body', async () => {
    await facebookPagePublishSkill.execute(BASE_TEXT, CTX);
    const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-token-abc');
  });
});

// ─── Image post ───────────────────────────────────────────────────────────────

describe('facebook.page.publish — IMAGE', () => {
  const imageInput: FacebookPagePublishInput = {
    ...BASE_TEXT,
    contentType: 'IMAGE',
    mediaUrl: MEDIA_URL,
  };

  it('succeeds with valid R2 mediaUrl', async () => {
    const result = await facebookPagePublishSkill.execute(imageInput, CTX);
    expect(result.ok).toBe(true);
  });

  it('calls /{pageId}/photos endpoint', async () => {
    await facebookPagePublishSkill.execute(imageInput, CTX);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain(`/${PAGE_ID_1}/photos`);
  });

  it('passes url and caption in body', async () => {
    await facebookPagePublishSkill.execute(imageInput, CTX);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.url).toBe(MEDIA_URL);
    expect(body.caption).toBe(imageInput.message);
  });

  it('fails MEDIA_REQUIRED when mediaUrl is absent', async () => {
    const result = await facebookPagePublishSkill.execute({ ...imageInput, mediaUrl: undefined }, CTX);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('MEDIA_REQUIRED');
  });

  it('fails MEDIA_URL_DOMAIN_REJECTED for non-R2 URL', async () => {
    const result = await facebookPagePublishSkill.execute(
      { ...imageInput, mediaUrl: 'https://evil.example.com/image.jpg' },
      CTX,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('MEDIA_URL_DOMAIN_REJECTED');
  });

  it('fails MEDIA_URL_DOMAIN_REJECTED for invalid URL string', async () => {
    const result = await facebookPagePublishSkill.execute(
      { ...imageInput, mediaUrl: 'not-a-url' },
      CTX,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('MEDIA_URL_DOMAIN_REJECTED');
  });

  it('fails MISSING_CREDENTIAL when R2_ACCOUNT_ID and R2_ENDPOINT are both absent', async () => {
    vi.stubEnv('R2_ACCOUNT_ID', '');
    vi.stubEnv('R2_ENDPOINT', '');
    const result = await facebookPagePublishSkill.execute(imageInput, CTX);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('MISSING_CREDENTIAL');
  });

  it('accepts R2_ENDPOINT override for media URL validation', async () => {
    const customEndpoint = 'https://custom.r2.example.com';
    vi.stubEnv('R2_ENDPOINT', customEndpoint);
    vi.stubEnv('R2_ACCOUNT_ID', '');
    const customMediaUrl = `${customEndpoint}/assets/image.jpg`;
    const result = await facebookPagePublishSkill.execute(
      { ...imageInput, mediaUrl: customMediaUrl },
      CTX,
    );
    expect(result.ok).toBe(true);
  });
});

// ─── Video post ───────────────────────────────────────────────────────────────

describe('facebook.page.publish — VIDEO', () => {
  const videoInput: FacebookPagePublishInput = {
    ...BASE_TEXT,
    contentType: 'VIDEO',
    mediaUrl: `${R2_ORIGIN}/assets/test-video.mp4`,
  };

  it('calls /{pageId}/videos endpoint', async () => {
    await facebookPagePublishSkill.execute(videoInput, CTX);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain(`/${PAGE_ID_1}/videos`);
  });

  it('passes file_url and description in body', async () => {
    await facebookPagePublishSkill.execute(videoInput, CTX);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.file_url).toBe(videoInput.mediaUrl);
    expect(body.description).toBe(videoInput.message);
  });
});

// ─── Scheduled mode ───────────────────────────────────────────────────────────

describe('facebook.page.publish — SCHEDULED mode', () => {
  const futureTs = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min from now

  it('succeeds with valid scheduledAt', async () => {
    const result = await facebookPagePublishSkill.execute(
      { ...BASE_TEXT, publishMode: 'SCHEDULED', scheduledAt: futureTs },
      CTX,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.output.publishMode).toBe('SCHEDULED');
      expect(result.output.scheduledAt).toBe(futureTs);
    }
  });

  it('sets published:false and scheduled_publish_time for SCHEDULED mode', async () => {
    await facebookPagePublishSkill.execute(
      { ...BASE_TEXT, publishMode: 'SCHEDULED', scheduledAt: futureTs },
      CTX,
    );
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.published).toBe(false);
    expect(typeof body.scheduled_publish_time).toBe('number');
  });

  it('fails SCHEDULE_TIME_REQUIRED when scheduledAt is absent', async () => {
    const result = await facebookPagePublishSkill.execute(
      { ...BASE_TEXT, publishMode: 'SCHEDULED' },
      CTX,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('SCHEDULE_TIME_REQUIRED');
  });

  it('fails SCHEDULE_WINDOW_VIOLATED when scheduledAt is invalid ISO 8601', async () => {
    const result = await facebookPagePublishSkill.execute(
      { ...BASE_TEXT, publishMode: 'SCHEDULED', scheduledAt: 'not-a-date' },
      CTX,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('SCHEDULE_WINDOW_VIOLATED');
  });

  it('fails SCHEDULE_WINDOW_VIOLATED when scheduledAt is less than 10 minutes in the future', async () => {
    const tooSoon = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min
    const result = await facebookPagePublishSkill.execute(
      { ...BASE_TEXT, publishMode: 'SCHEDULED', scheduledAt: tooSoon },
      CTX,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('SCHEDULE_WINDOW_VIOLATED');
  });

  it('fails SCHEDULE_WINDOW_VIOLATED when scheduledAt is more than 75 days in the future', async () => {
    const tooFar = new Date(Date.now() + 76 * 24 * 60 * 60 * 1000).toISOString(); // 76 days
    const result = await facebookPagePublishSkill.execute(
      { ...BASE_TEXT, publishMode: 'SCHEDULED', scheduledAt: tooFar },
      CTX,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('SCHEDULE_WINDOW_VIOLATED');
  });

  it('accepts scheduledAt exactly at 10 minutes boundary', async () => {
    const tenMin = new Date(Date.now() + 10 * 60 * 1000 + 5000).toISOString(); // +5s safety
    const result = await facebookPagePublishSkill.execute(
      { ...BASE_TEXT, publishMode: 'SCHEDULED', scheduledAt: tenMin },
      CTX,
    );
    expect(result.ok).toBe(true);
  });
});

// ─── Graph API error handling ──────────────────────────────────────────────────

describe('facebook.page.publish — Graph API errors', () => {
  it('returns GRAPH_API_ERROR for 4xx responses (isTransient false)', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: { code: 100, message: 'Invalid parameter', error_subcode: 1234 },
      }),
    });
    const result = await facebookPagePublishSkill.execute(BASE_TEXT, CTX);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('GRAPH_API_ERROR');
      expect(result.isTransient).toBe(false);
    }
  });

  it('returns GRAPH_API_ERROR with isTransient:true for 5xx responses', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: { code: 1, message: 'Server error' } }),
    });
    const result = await facebookPagePublishSkill.execute(BASE_TEXT, CTX);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('GRAPH_API_ERROR');
      expect(result.isTransient).toBe(true);
    }
  });

  it('returns GRAPH_API_ERROR with isTransient:true on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    const result = await facebookPagePublishSkill.execute(BASE_TEXT, CTX);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.isTransient).toBe(true);
    }
  });

  it('error message never includes the access token', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: { code: 200, message: 'Permission denied' } }),
    });
    const result = await facebookPagePublishSkill.execute(BASE_TEXT, CTX);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toContain('test-token-abc');
    }
  });
});

// ─── Output shape ──────────────────────────────────────────────────────────────

describe('facebook.page.publish — output shape', () => {
  it('successful immediate post has postId, pageId, publishMode', async () => {
    const result = await facebookPagePublishSkill.execute(BASE_TEXT, CTX);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.output.postId).toBe('string');
      expect(result.output.pageId).toBe(PAGE_ID_1);
      expect(result.output.publishMode).toBe('IMMEDIATE');
    }
  });

  it('successful immediate post does NOT have scheduledAt in output', async () => {
    const result = await facebookPagePublishSkill.execute(BASE_TEXT, CTX);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output.scheduledAt).toBeUndefined();
  });
});
