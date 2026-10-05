/**
 * REAL CLIENT TEST #001 — Dubai Restaurant Website
 * Runs through handleCommand() exactly as submitted. No manual routing.
 */

import { handleCommand, formatCommandResponse, type CommandResponse } from '../command'
import { AGENT_REGISTRY } from '../agents'
import { SKILL_REGISTRY } from '../skills'
import { WORKFLOWS } from '../workflows'

const CLIENT_REQUEST = `I own a restaurant in Dubai and I need a premium professional website.

The website should be mobile-friendly and should present:
- restaurant information
- menu
- food/photos
- services
- contact information
- location
- a clear customer contact / booking call-to-action

I want the design to feel premium, modern and professional.

I want the agency to handle the project from requirements through production, QC and final delivery.`

console.log('═'.repeat(70))
console.log('MASTER DIGITAL AGENCY — CLIENT TEST #001')
console.log('Dubai Restaurant Premium Website')
console.log('═'.repeat(70))
console.log('\nCLIENT REQUEST (verbatim):')
console.log(CLIENT_REQUEST.split('\n').map(l => '  ' + l).join('\n'))
console.log('\n' + '─'.repeat(70))
console.log('RUNNING handleCommand() — no manual routing...')
console.log('─'.repeat(70) + '\n')

const result = handleCommand(CLIENT_REQUEST)

if (result.excluded) {
  console.log('✗ UNEXPECTED EXCLUSION')
  console.log('  Reason:', result.reason)
  process.exit(1)
}

const r = result as CommandResponse

// ── 1. CLASSIFIED INTENT ──────────────────────────────────────────────────
console.log('1. CLASSIFIED INTENT')
console.log('   Workflow ID   :', r.classification.workflowId)
console.log('   Workflow Name :', r.classification.workflowName)
console.log('   Rationale     :', r.classification.rationale)

// ── 2. PRIMARY AGENT ──────────────────────────────────────────────────────
console.log('\n2. PRIMARY AGENT')
console.log(`   ${r.agents.primary.name} [group: ${r.agents.primary.group}]`)
console.log(`   ID: ${r.agents.primary.id}`)
const primaryDef = AGENT_REGISTRY.find(a => a.id === r.agents.primary.id)!
console.log('   Responsibilities:')
primaryDef.responsibilities.forEach(resp => console.log(`     • ${resp}`))

// ── 3. SUPPORTING AGENTS ──────────────────────────────────────────────────
console.log('\n3. SUPPORTING AGENTS')
r.agents.supporting.forEach(a => {
  const def = AGENT_REGISTRY.find(ag => ag.id === a.id)!
  console.log(`   • ${a.name} [${def.group}]`)
  console.log(`     Role: ${def.responsibilities[0]}`)
})

// ── 4. SELECTED SKILLS ────────────────────────────────────────────────────
console.log('\n4. SELECTED SKILLS')
r.skills.forEach(s => console.log(`   • ${s}`))

// ── 5. SELECTED WORKFLOW ──────────────────────────────────────────────────
console.log('\n5. SELECTED WORKFLOW')
console.log(`   ${r.workflow.id} — ${r.workflow.name}`)
console.log(`   Total steps: ${r.workflow.stepCount}`)

// ── 6. WORKFLOW STEPS ─────────────────────────────────────────────────────
console.log('\n6. WORKFLOW STEPS')
r.workflow.steps.forEach((s, i) => {
  const tags: string[] = []
  if (s.qcGate) tags.push(`[QC: ${s.qcGate}]`)
  if (s.requiresOwnerApproval) tags.push('[OWNER APPROVAL REQUIRED]')
  console.log(`   ${String(i + 1).padStart(2)}. ${s.name.padEnd(28)} → ${s.agentId}${tags.length ? '  ' + tags.join(' ') : ''}`)
})

// ── 7. PROJECT STATE ──────────────────────────────────────────────────────
console.log('\n7. PROJECT STATE')
console.log('   ID     :', r.project.id)
console.log('   Name   :', r.project.name)
console.log('   Type   :', r.project.type)
console.log('   Status :', r.project.status)

// ── 8. QC REQUIREMENTS ───────────────────────────────────────────────────
console.log('\n8. QC REQUIREMENTS')
if (r.qcRequirements.length === 0) {
  console.log('   None defined')
} else {
  r.qcRequirements.forEach(q => {
    console.log(`   Gate      : ${q.gate}`)
    console.log(`   At step   : "${q.step}"`)
    console.log(`   Dimensions: ${q.dimensions.join(', ')}`)
    console.log(`   Items     : ${q.itemCount} checks`)
    console.log('')
  })
}

// ── 9. APPROVAL REQUIREMENTS ─────────────────────────────────────────────
console.log('9. APPROVAL REQUIREMENTS')
console.log('   Requires owner approval:', r.requiresOwnerApproval ? 'YES' : 'NO')
if (r.approvalTriggers.length > 0) {
  r.approvalTriggers.forEach(t => console.log(`   • ${t}`))
} else {
  console.log('   No approval gates triggered by this request')
}

// ── 10. NEXT BEST ACTION ──────────────────────────────────────────────────
console.log('\n10. NEXT BEST ACTION')
console.log(`    ${r.nextBestAction}`)

// ── 11. AUDIT LOG ─────────────────────────────────────────────────────────
console.log('\n11. AUDIT LOG')
r.auditLog.forEach(entry => console.log(`    ${entry}`))

// ── WHY THESE SKILLS WERE SELECTED ────────────────────────────────────────
console.log('\n' + '═'.repeat(70))
console.log('WHY THESE SKILLS WERE SELECTED')
console.log('═'.repeat(70))

const skillReasons: Record<string, string> = {
  'Website Development':        'Core deliverable — client explicitly requests a full website',
  'Landing Page Development':   'Booking/contact CTA maps to a conversion-optimised landing section',
  'UI/UX':                      'Client requires premium, modern, professional design feel — UX architecture required',
  'Frontend':                   'Building the client-facing website interface',
  'Backend':                    'Menu data, contact form handling, potentially a booking system',
  'Database':                   'Storing menu items, reservations, or contact submissions',
  'API fundamentals without paid dependency assumptions': 'Contact form / booking CTA backend integration without paid third-party dependency',
  'Market Research':            'Research Dubai restaurant market — competitive positioning, what premium looks like locally',
  'Competitor Intelligence':    'Understanding premium restaurant websites in Dubai to set the design bar',
  'Trend Analysis':             'Current premium web design trends in F&B / hospitality in UAE market',
  'Fiverr Market Intelligence': 'Offer & Pricing agent pulls this skill — relevant if similar work is scoped for Fiverr',
  'YouTube/Social Analysis':    'Research competitor restaurant social presence and visual identity signals',
  'Opportunity Scoring':        'Market & Opportunity agent assesses this as a revenue opportunity — part of supporting agent skills',
  'Offer Design':               'Scoping the service offer for this client — what is included, tiered or fixed',
  'Service Packaging':          'Packaging the website deliverable clearly: pages, revisions, formats',
  'Pricing Intelligence':       'Setting a competitive price for a premium Dubai restaurant website',
  'Content Strategy':           'Client needs content across: About, Menu, Gallery, Services, Contact — requires a content plan',
  'Social Campaign Strategy':   'Part of Social Media Campaign Director skills — adjacent to the project scope',
  'Conversion Strategy':        'Booking CTA and contact section require conversion thinking',
  'Creative Strategy':          'Premium, modern, professional — the creative direction must be strategically grounded',
  'Logo Design':                'May be needed if restaurant brand identity needs to be integrated or created',
  'Brand Identity':             'Restaurant needs consistent brand expression across all website sections',
  'Social Media Design':        'Social assets may be required alongside website (profile images, link-in-bio)',
  'Advertising Creative':       'Brand & Design Production skills come as a package — ad creatives adjacent',
  'Poster Design':              'Menu boards, promotional materials adjacent to restaurant brand work',
  'Menu Design':                'Client explicitly mentions menu — digital menu design is required',
  'Presentation Design':        'Client presentation / proposal deck for approvals',
  'Digital Marketing Materials':'Any digital collateral accompanying the website',
  'Scriptwriting':              'Part of Video & Creative Production — not directly applicable here',
  'Hook Writing':               'Part of content agent — could apply to hero headline and CTA copy',
  'Caption Writing':            'Copy for food/photo captions, social content adjacent to website',
  'Content Repurposing':        'Website content may be repurposed to social assets',
  'Content Calendar':           'Social Media Campaign Director skill — not primary for this project',
  'Platform Adaptation':        'Not primary — website is the deliverable, not social publishing',
  'Publishing Workflow':        'Part of Social Media Campaign Director skills — not core here',
  'Social Analytics':           'Post-launch performance tracking — secondary at this stage',
  'Campaign Reporting':         'Analytics & Performance agent — post-launch',
  'Organic Optimization':       'SEO-level organic optimisation of the website',
  'Project Planning':           'Project Manager maps website into tasks, milestones, deliverables',
  'Client Communication':       'Professional client communication throughout the project',
  'QC':                         'QC Director runs pre-delivery checks — visual, technical, requirement, functional',
  'Delivery':                   'Final handoff, file delivery, launch coordination',
  'Case Study Creation':        'Post-delivery: restaurant website becomes a portfolio case study',
  'Portfolio Curation':         'After delivery, this becomes a portfolio entry for the agency',
  'Reporting':                  'Agency Reporting: project status, completion, revenue tracking',
}

r.skills.forEach(skill => {
  const reason = skillReasons[skill] ?? 'Part of assigned agent skill set — available for this project'
  console.log(`\n  ✓ ${skill}`)
  console.log(`    ${reason}`)
})

// ── SKILLS NOT SELECTED ───────────────────────────────────────────────────
console.log('\n' + '═'.repeat(70))
console.log('SKILLS NOT SELECTED')
console.log('═'.repeat(70))

const selectedSkillNames = new Set(r.skills)
const notSelected = SKILL_REGISTRY.filter(s => !selectedSkillNames.has(s.name))

const notSelectedReasons: Record<string, string> = {
  'Short-form Video':           'No video deliverable in client brief — video production not scoped',
  'Reels':                      'No social video requested — out of scope for this project',
  'TikTok Content':             'No TikTok deliverable — out of scope',
  'Video Editing':              'No video editing requested — out of scope',
  'Storyboarding':              'No video storyboarding needed — out of scope',
  'UGC-style Creative':         'No user-generated content requested — out of scope',
  'Web App Development':        'Client needs a website, not a web application — simpler scope',
  'Basic Mobile App Development': 'No mobile app requested — mobile-friendly website is sufficient',
  'Local/low-cost workflow automation': 'No automation workflow requested in brief',
  'Task routing':               'Internal automation — not a client deliverable',
  'Asset routing':              'Internal automation — not a client deliverable',
  'Report automation':          'Internal automation — not a client deliverable',
  'Content repurposing automation': 'Not requested in brief — future phase',
}

notSelected.forEach(skill => {
  const reason = notSelectedReasons[skill.name] ?? 'Not relevant to website production scope for this client'
  console.log(`\n  ✗ ${skill.name} [${skill.domain}]`)
  console.log(`    ${reason}`)
})

// ── AGENTS NOT SELECTED ───────────────────────────────────────────────────
console.log('\n' + '═'.repeat(70))
console.log('AGENTS NOT SELECTED')
console.log('═'.repeat(70))

const selectedAgentIds = new Set([r.agents.primary.id, ...r.agents.supporting.map(a => a.id)])
const notSelectedAgents = AGENT_REGISTRY.filter(a => !selectedAgentIds.has(a.id))

const agentNotSelectedReasons: Record<string, string> = {
  'app-digital-production':          'No web app / mobile app in scope — website only',
  'video-creative-production':       'No video deliverable in client brief',
  'social-media-campaign-director':  'No social campaign in scope — website is the sole deliverable',
  'lead-opportunity':                'Client has arrived — lead acquisition not needed for this project',
}

notSelectedAgents.forEach(a => {
  const reason = agentNotSelectedReasons[a.id] ?? 'Not required for website production scope at this stage'
  console.log(`\n  ✗ ${a.name} [${a.group}]`)
  console.log(`    ${reason}`)
})

// ── EXECUTION PLAN ────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(70))
console.log('EXECUTION PLAN — Handoff to Production Team')
console.log('═'.repeat(70))
console.log(`
PROJECT
  Name     : ${r.project.name.slice(0, 60)}
  ID       : ${r.project.id}
  Type     : ${r.project.type}
  Workflow : ${r.workflow.id} — ${r.workflow.name}
  Status   : ${r.project.status} → qualification → scoping → approved → in-production → qc → delivered

PRODUCTION SEQUENCE
`)
r.workflow.steps.forEach((s, i) => {
  const agent = AGENT_REGISTRY.find(a => a.id === s.agentId)
  const tags: string[] = []
  if (s.qcGate) tags.push(`⬛ QC GATE: ${s.qcGate}`)
  if (s.requiresOwnerApproval) tags.push(`⚠  OWNER APPROVAL`)
  console.log(`  Step ${String(i + 1).padStart(2)}: ${s.name}`)
  console.log(`          Agent   : ${agent?.name ?? s.agentId}`)
  if (tags.length) console.log(`          ${tags.join('  ')}`)
})

console.log(`
QUALITY GATES
`)
r.qcRequirements.forEach(q => {
  console.log(`  [${q.gate}]`)
  console.log(`    Step       : ${q.step}`)
  console.log(`    Dimensions : ${q.dimensions.join(', ')}`)
  console.log(`    Checks     : ${q.itemCount} items`)
  console.log(`    Gate rule  : Delivery is BLOCKED until all ${q.itemCount} checks pass`)
})

console.log(`
APPROVAL GATES
  Owner approval required: ${r.requiresOwnerApproval ? 'YES' : 'NO'}`)
r.approvalTriggers.forEach(t => console.log(`  • ${t}`))

console.log(`
NEXT ACTION
  ${r.nextBestAction}
`)

// ── VERDICT ───────────────────────────────────────────────────────────────
console.log('═'.repeat(70))
console.log('VERDICT')
console.log('═'.repeat(70))

const passes = [
  !result.excluded,
  r.classification.workflowId === 'W2',
  r.agents.primary.id === 'web-production',
  r.agents.supporting.length > 0,
  r.skills.includes('Website Development'),
  r.skills.includes('UI/UX'),
  r.skills.includes('Menu Design'),
  r.skills.includes('Frontend'),
  r.qcRequirements.length > 0,
  r.qcRequirements.some(q => q.gate === 'website-pre-delivery'),
  r.workflow.steps.some(s => s.requiresOwnerApproval),
  r.workflow.steps.some(s => s.qcGate),
  r.nextBestAction.length > 0,
  r.auditLog.length > 0,
  r.project.id.startsWith('mda-'),
]

const allPass = passes.every(Boolean)
console.log('')
passes.forEach((p, i) => console.log(`  ${p ? '✓' : '✗'} Check ${String(i + 1).padStart(2)}`))
console.log('')
console.log(allPass
  ? `  RESULT: PASS\n  ${passes.filter(Boolean).length}/${passes.length} checks passed.\n  Execution plan is ready to hand to the production team.`
  : `  RESULT: FAIL\n  ${passes.filter(Boolean).length}/${passes.length} checks passed. See failures above.`
)
console.log('')
