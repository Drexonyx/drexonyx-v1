// DR 0072: Uniform V1 skill invocation boundary.
// DR 0075: Human RBAC matrix enforced here. CLIENT denied all skills.
//          AGENT Option B via Phase 09 Service Token; allowlist = utility.prompt.optimize + qc.asset.metadata.

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db/index';
import { skillOutputs } from '@/db/schema/production';
import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { validateServiceToken } from '@/lib/agent/service-tokens';
import { SKILL_REGISTRY } from '@/lib/skills/registry';
import { isHumanAuthorized, isAgentAuthorized } from '@/lib/skills/authority';
import type { SkillId, SkillContext } from '@/lib/skills/interface';

type ActorKind = 'USER' | 'AGENT';

interface HumanBody {
  entityType: string;
  entityId: string;
  input: unknown;
}

interface AgentBody {
  organizationId: string;
  productionJobId: string;
  entityType: string;
  entityId: string;
  input: unknown;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ skillId: string }> },
): Promise<NextResponse> {
  const { skillId: rawSkillId } = await params;

  // Step 1 + 2: Authenticate and resolve actor
  const authHeader = request.headers.get('authorization');
  const isBearerPresent = authHeader?.startsWith('Bearer ');

  let actorId: string;
  let actorType: ActorKind;
  let actorRole: string;
  let organizationId: string;

  if (isBearerPresent) {
    // Agent path — Phase 09 Service Token
    const rawToken = authHeader!.slice(7);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const b = body as Record<string, unknown>;
    if (
      typeof b.organizationId !== 'string' ||
      typeof b.productionJobId !== 'string' ||
      typeof b.entityType !== 'string' ||
      typeof b.entityId !== 'string' ||
      b.input === undefined
    ) {
      return NextResponse.json(
        { error: 'organizationId, productionJobId, entityType, entityId, input are required for agent callers' },
        { status: 400 },
      );
    }

    const agentBody = body as AgentBody;
    const validation = await validateServiceToken({
      rawToken,
      expectedOrganizationId: agentBody.organizationId,
      expectedProductionJobId: agentBody.productionJobId,
    });

    if (!validation.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 3 (agent): allowlist check
    if (!isAgentAuthorized(rawSkillId as SkillId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    actorId = agentBody.productionJobId;
    actorType = 'AGENT';
    actorRole = 'AGENT';
    organizationId = validation.organizationId;

    return executeSkill({
      rawSkillId,
      organizationId,
      actorId,
      actorType,
      actorRole,
      entityType: agentBody.entityType,
      entityId: agentBody.entityId,
      input: agentBody.input,
    });
  }

  // Human path — Auth.js JWT session
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId, organizationId: sessionOrganizationId, role } = session.user;

  // CLIENT has no skill invocation (DR 0075)
  if (role === 'CLIENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Step 3 (human): RBAC matrix check
  if (!isHumanAuthorized(rawSkillId as SkillId, role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  if (
    typeof b.entityType !== 'string' ||
    typeof b.entityId !== 'string' ||
    b.input === undefined
  ) {
    return NextResponse.json(
      { error: 'entityType, entityId, input are required' },
      { status: 400 },
    );
  }

  const humanBody = body as HumanBody;

  return executeSkill({
    rawSkillId,
    organizationId: sessionOrganizationId,
    actorId: userId,
    actorType: 'USER',
    actorRole: role,
    entityType: humanBody.entityType,
    entityId: humanBody.entityId,
    input: humanBody.input,
  });
}

async function executeSkill(params: {
  rawSkillId: string;
  organizationId: string;
  actorId: string;
  actorType: ActorKind;
  actorRole: string;
  entityType: string;
  entityId: string;
  input: unknown;
}): Promise<NextResponse> {
  const { rawSkillId, organizationId, actorId, actorType, actorRole, entityType, entityId, input } = params;

  // Step 4: Registry lookup
  const skill = SKILL_REGISTRY[rawSkillId as SkillId];
  if (!skill) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
  }

  // Step 5: Input validation — reject non-objects
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return NextResponse.json({ error: 'input must be a non-null object' }, { status: 400 });
  }

  // Step 6: Create PENDING record
  const outputId = uuidv7();
  await db.insert(skillOutputs).values({
    id: outputId,
    organization_id: organizationId,
    skill_id: skill.id,
    skill_version: skill.version,
    entity_type: entityType,
    entity_id: entityId,
    actor_id: actorId,
    actor_type: actorType,
    actor_role: actorRole,
    status: 'PENDING',
  });

  // Step 7: Update to RUNNING and execute
  await db
    .update(skillOutputs)
    .set({ status: 'RUNNING', updated_at: new Date() })
    .where(eq(skillOutputs.id, outputId));

  const context: SkillContext = { organizationId, actorId, actorType, actorRole };
  const result = await skill.execute(input, context);

  // Step 8: Persist outcome
  if (result.ok) {
    await db
      .update(skillOutputs)
      .set({ status: 'SUCCEEDED', output: result.output as Record<string, unknown>, updated_at: new Date() })
      .where(eq(skillOutputs.id, outputId));

    return NextResponse.json({ outputId, status: 'SUCCEEDED', output: result.output });
  }

  // FAILED
  await db
    .update(skillOutputs)
    .set({
      status: 'FAILED',
      error: result.error,
      updated_at: new Date(),
    })
    .where(eq(skillOutputs.id, outputId));

  const statusCode = result.isTransient ? 503 : 422;
  return NextResponse.json({ outputId, status: 'FAILED', error: result.error }, { status: statusCode });
}
