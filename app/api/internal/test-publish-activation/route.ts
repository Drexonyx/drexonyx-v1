// TEMPORARY: Single-use Facebook publish test activation route.
// DELETE this file after the controlled test is complete.
//
// Auth: Authorization: Bearer {TEST_ACTIVATION_TOKEN}
// Executes: QC → CAS SCHEDULED→PUBLISHING → facebook.page.publish → CAS PUBLISHING→PUBLISHED
// Social schema is not tracked by Drizzle — all social.posts queries use raw SQL.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/index';
import { auditEvents } from '@/db/schema/system';
import { sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { facebookPagePublishSkill } from '@/lib/skills/facebook/page-publish';
import { qcFacebookPolicyCheckSkill } from '@/lib/skills/qc/facebook-policy-check';
import type { SkillContext } from '@/lib/skills/interface';
import type { FacebookPageTarget, FacebookContentType, FacebookPublishMode } from '@/lib/skills/facebook/page-publish';

const TEST_POST_ID = '8c8cb876-97ac-4160-b9f1-892b5c2d8786';

type SocialPost = {
  id: string;
  organization_id: string;
  page_target: string;
  content_type: string;
  caption: string;
  headline: string | null;
  media_url: string | null;
  publish_mode: string;
  campaign_id: string;
  status: string;
};

async function writeAudit(
  organizationId: string,
  postId: string,
  action: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await db.insert(auditEvents).values({
    id: uuidv7(),
    organization_id: organizationId,
    entity_type: 'SOCIAL_POST',
    entity_id: postId,
    actor_id: null,
    actor_role: 'AGENT',
    action,
    payload,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Auth
  const token = process.env.TEST_ACTIVATION_TOKEN?.trim();
  const authHeader = request.headers.get('authorization');
  if (!token || authHeader !== `Bearer ${token}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Fetch the test post — must be SCHEDULED
  const rows = await db.execute(
    sql`SELECT id, organization_id, page_target, content_type, caption, headline, media_url, publish_mode, campaign_id, status
        FROM social.posts WHERE id = ${TEST_POST_ID} LIMIT 1`,
  );
  const post = (rows as unknown as SocialPost[])[0];
  if (!post) {
    return NextResponse.json({ error: 'Test post not found' }, { status: 404 });
  }
  if (post.status !== 'SCHEDULED') {
    return NextResponse.json({ error: `Post status is '${post.status}', expected 'SCHEDULED'` }, { status: 409 });
  }

  const orgId = post.organization_id;
  const ctx: SkillContext = {
    organizationId: orgId,
    actorId: 'test-activation',
    actorType: 'AGENT',
    actorRole: 'ADMIN_OPERATIONS',
  };

  // 3. CAS SCHEDULED → PUBLISHING
  const casPublishing = await db.execute(
    sql`UPDATE social.posts SET status='PUBLISHING', updated_at=NOW()
        WHERE id = ${TEST_POST_ID} AND status = 'SCHEDULED'
        RETURNING id`,
  );
  if ((casPublishing as unknown as { id: string }[]).length === 0) {
    return NextResponse.json({ error: 'CAS conflict: post no longer SCHEDULED' }, { status: 409 });
  }

  const setFailed = async (reason: string) => {
    await db.execute(
      sql`UPDATE social.posts
          SET status='FAILED', failure_reason=${reason}, updated_at=NOW()
          WHERE id = ${TEST_POST_ID}`,
    );
    await writeAudit(orgId, TEST_POST_ID, 'SOCIAL_POST_FAILED', { reason });
  };

  // 4. QC check
  const qcResult = await qcFacebookPolicyCheckSkill.execute(
    {
      text: post.caption,
      ...(post.headline ? { headline: post.headline } : {}),
      placement: 'feed',
    },
    ctx,
  );
  if (!qcResult.ok) {
    await setFailed(`[QC_ERROR] ${qcResult.error}`);
    return NextResponse.json({ ok: false, error: `QC error: ${qcResult.error}` }, { status: 500 });
  }
  if (qcResult.output.verdict === 'FAIL') {
    const reason = `[QC_FAIL] ${qcResult.output.findings.join('; ')}`;
    await setFailed(reason);
    return NextResponse.json({ ok: false, error: reason }, { status: 422 });
  }

  // 5. Publish
  const publishResult = await facebookPagePublishSkill.execute(
    {
      pageTarget: post.page_target as FacebookPageTarget,
      contentType: post.content_type as FacebookContentType,
      message: post.caption,
      ...(post.media_url ? { mediaUrl: post.media_url } : {}),
      publishMode: post.publish_mode as FacebookPublishMode,
      campaignId: post.campaign_id,
    },
    ctx,
  );
  if (!publishResult.ok) {
    await setFailed(publishResult.error);
    return NextResponse.json({ ok: false, error: publishResult.error }, { status: 500 });
  }

  const { postId, pageId, publishMode } = publishResult.output;

  // 6. CAS PUBLISHING → PUBLISHED
  await db.execute(
    sql`UPDATE social.posts
        SET status='PUBLISHED', fb_post_id=${postId}, fb_page_id=${pageId},
            published_at=NOW(), failure_reason=NULL, updated_at=NOW()
        WHERE id = ${TEST_POST_ID}`,
  );
  await writeAudit(orgId, TEST_POST_ID, 'SOCIAL_POST_PUBLISHED', {
    fb_post_id: postId,
    fb_page_id: pageId,
    publish_mode: publishMode,
  });

  return NextResponse.json({ ok: true, postId, pageId, publishMode });
}
