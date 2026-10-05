/**
 * 12-scenario operational re-test via command interface.
 * Same scenarios as operational-acceptance.ts, now exercised through handleCommand().
 */

import { handleCommand, formatCommandResponse } from '../command'

function check(label: string, condition: boolean) {
  console.log(`  ${condition ? '✓' : '✗'} ${label}`)
  if (!condition) process.exitCode = 1
}

function section(n: number, title: string) {
  console.log('\n' + '─'.repeat(60))
  console.log(`CMD-TEST ${n}: ${title}`)
  console.log('─'.repeat(60))
}

// ── 1 WEBSITE ──────────────────────────────────────────────────────────────
section(1, 'Website — Dubai restaurant')
{
  const r = handleCommand('A restaurant in Dubai wants a premium website.')
  check('Not excluded', !r.excluded)
  if (!r.excluded) {
    check('Workflow W2', r.classification.workflowId === 'W2')
    check('Primary: Web Production', r.agents.primary.id === 'web-production')
    check('Project created (intake)', r.project.status === 'intake')
    check('Website Development skill', r.skills.includes('Website Development'))
    check('QC requirements present', r.qcRequirements.length > 0)
    check('Owner approval gate in workflow', r.workflow.steps.some(s => s.requiresOwnerApproval))
    check('NBA present', r.nextBestAction.length > 0)
    check('Audit log populated', r.auditLog.length > 0)
    console.log(`  NBA: ${r.nextBestAction}`)
  }
}

// ── 2 LOGO/BRANDING ────────────────────────────────────────────────────────
section(2, 'Logo / Branding — beauty salon')
{
  const r = handleCommand('A new beauty salon needs a logo and complete visual identity.')
  check('Not excluded', !r.excluded)
  if (!r.excluded) {
    check('Workflow W3', r.classification.workflowId === 'W3')
    check('Brand & Design Production', r.agents.primary.id === 'brand-design-production')
    check('Logo Design skill', r.skills.includes('Logo Design'))
    check('Brand Identity skill', r.skills.includes('Brand Identity'))
    check('Design QC gate', r.qcRequirements.some(q => q.gate === 'design-pre-delivery'))
  }
}

// ── 3 VIDEO ────────────────────────────────────────────────────────────────
section(3, 'Video — Instagram promotional videos')
{
  const r = handleCommand('A business needs 5 short promotional videos for Instagram.')
  check('Not excluded', !r.excluded)
  if (!r.excluded) {
    check('Workflow W4', r.classification.workflowId === 'W4')
    check('Video & Creative Production', r.agents.primary.id === 'video-creative-production')
    check('Scriptwriting skill', r.skills.includes('Scriptwriting'))
    check('Short-form Video skill', r.skills.includes('Short-form Video'))
    check('Video QC gate', r.qcRequirements.some(q => q.gate === 'video-pre-delivery'))
    check('Platform Adaptation skill', r.skills.includes('Platform Adaptation'))
  }
}

// ── 4 SOCIAL CAMPAIGN ──────────────────────────────────────────────────────
section(4, 'Social campaign — 30-day restaurant')
{
  const r = handleCommand('A restaurant needs a 30-day social media content campaign.')
  check('Not excluded', !r.excluded)
  if (!r.excluded) {
    check('Workflow W5', r.classification.workflowId === 'W5')
    check('Social Media Campaign Director', r.agents.primary.id === 'social-media-campaign-director')
    check('Content Calendar skill', r.skills.includes('Content Calendar'))
    check('Publishing Workflow skill', r.skills.includes('Publishing Workflow'))
    check('Campaign Reporting skill', r.skills.includes('Campaign Reporting'))
    check('Social QC gate', r.qcRequirements.some(q => q.gate === 'social-pre-publish'))
    check('Owner approval before publish', r.approvalTriggers.length > 0)
  }
}

// ── 5 MARKET RESEARCH / FIVERR ────────────────────────────────────────────
section(5, 'Market research + Fiverr opportunities')
{
  const r = handleCommand('Research the current demand for website services on Fiverr and identify promising opportunities.')
  check('Not excluded', !r.excluded)
  if (!r.excluded) {
    check('Workflow W8', r.classification.workflowId === 'W8')
    check('Fiverr Market Intelligence skill', r.skills.includes('Fiverr Market Intelligence'))
    check('Opportunity Scoring skill', r.skills.includes('Opportunity Scoring'))
    check('Research Intelligence in supporting', r.agents.supporting.some(a => a.id === 'research-intelligence'))
    console.log(`  Primary agent: ${r.agents.primary.name}`)
    console.log(`  Supporting: ${r.agents.supporting.map(a => a.name).join(', ')}`)
  }
}

// ── 6 MIXED PROJECT ────────────────────────────────────────────────────────
section(6, 'Mixed project — decomposed via sub-requests')
{
  const subRequests = [
    'build a website for a Dubai business',
    'design a brand identity and logo',
    'create a 30-day social media campaign',
    'produce a short promotional video',
  ]
  const results = subRequests.map(req => handleCommand(req))
  const workflows = results.map(r => (!r.excluded ? r.classification.workflowId : 'EXCLUDED'))
  const agents = results.map(r => (!r.excluded ? r.agents.primary.id : 'none'))

  check('All 4 sub-requests classified', results.every(r => !r.excluded))
  check('W2 for website', workflows.includes('W2'))
  check('W3 for branding', workflows.includes('W3'))
  check('W5 for social', workflows.includes('W5'))
  check('W4 for video', workflows.includes('W4'))
  check('No duplicate primary agents', new Set(agents).size === agents.length)
  console.log(`  Workflows: ${workflows.join(', ')}`)
  console.log(`  Agents: ${agents.join(', ')}`)
}

// ── 7 PORTFOLIO ────────────────────────────────────────────────────────────
section(7, 'Portfolio workflow')
{
  const r = handleCommand('Add a completed restaurant brand concept to the agency portfolio as a case study.')
  check('Not excluded', !r.excluded)
  if (!r.excluded) {
    check('Workflow W9', r.classification.workflowId === 'W9')
    check('Delivery & Client Success', r.agents.primary.id === 'delivery-client-success')
    check('Portfolio QC gate', r.qcRequirements.some(q => q.gate === 'portfolio-entry'))
    check('Owner approval for permission check', r.approvalTriggers.length > 0)
  }
}

// ── 8 QC FAILURE ──────────────────────────────────────────────────────────
section(8, 'QC gate structure verification via command')
{
  const r = handleCommand('Build a website for a hotel in Dubai.')
  check('Not excluded', !r.excluded)
  if (!r.excluded) {
    const qcGate = r.qcRequirements.find(q => q.gate === 'website-pre-delivery')
    check('website-pre-delivery QC gate present', qcGate !== undefined)
    if (qcGate) {
      check('Visual QC dimension present', qcGate.dimensions.includes('visual'))
      check('Technical QC dimension present', qcGate.dimensions.includes('technical'))
      check('Requirement QC dimension present', qcGate.dimensions.includes('requirement'))
      check('9 QC items defined', qcGate.itemCount === 9)
      console.log(`  QC at step: "${qcGate.step}"`)
      console.log(`  Dimensions: ${qcGate.dimensions.join(', ')}`)
    }
  }
}

// ── 9 EXCLUDED: WhatsApp API + AI calling ─────────────────────────────────
section(9, 'Excluded — WhatsApp API + AI calling')
{
  const r = handleCommand('Set up WhatsApp API automation with AI calling.')
  check('Excluded: true', r.excluded === true)
  if (r.excluded) {
    check('Reason references WhatsApp API', r.reason.includes('WhatsApp API'))
    check('requiresOwnerApproval: true', r.requiresOwnerApproval === true)
    check('nextBestAction present', r.nextBestAction.length > 0)
    check('Audit log shows EXCLUDED', r.auditLog.some(l => l.includes('EXCLUDED')))
    console.log(`  Reason: ${r.reason}`)
  }
}

// ── 10 FINANCIAL REQUEST ──────────────────────────────────────────────────
section(10, 'Excluded — bank account / payment management')
{
  const r = handleCommand('Connect the agency to my bank account and automatically manage payments.')
  check('Excluded: true', r.excluded === true)
  if (r.excluded) {
    check('Reason references Finance', r.reason.includes('Finance'))
    check('requiresOwnerApproval: true', r.requiresOwnerApproval === true)
    console.log(`  Reason: ${r.reason}`)
  }
}

// ── 11 PAID INFRASTRUCTURE ────────────────────────────────────────────────
section(11, 'Excluded / Approval — paid CRM')
{
  const r = handleCommand('Buy a paid CRM and connect it to the agency.')
  // "paid CRM" matches exclusion pattern
  check('Excluded: true', r.excluded === true)
  if (r.excluded) {
    check('Reason references CRM', r.reason.toLowerCase().includes('crm'))
    check('requiresOwnerApproval: true', r.requiresOwnerApproval === true)
    console.log(`  Reason: ${r.reason}`)
  }
}

// ── 12 AGENCY REPORT ──────────────────────────────────────────────────────
section(12, 'Agency Report command')
{
  const r = handleCommand('Generate a complete agency report with current status and recommendations.')
  check('Not excluded', !r.excluded)
  if (!r.excluded) {
    check('Workflow W10', r.classification.workflowId === 'W10')
    check('Agency Reporting agent', r.agents.primary.id === 'agency-reporting')
    check('Reporting skill', r.skills.includes('Reporting'))
    check('NBA present', r.nextBestAction.length > 0)
    console.log(`  NBA: ${r.nextBestAction}`)
  }
}

// ── FORMAT TEST ────────────────────────────────────────────────────────────
section(13, 'formatCommandResponse smoke test')
{
  const r1 = handleCommand('Build a landing page for a Dubai cafe.')
  const text1 = formatCommandResponse(r1)
  check('Normal response: contains AGENCY DIRECTOR RESPONSE', text1.includes('AGENCY DIRECTOR RESPONSE'))
  check('Normal response: contains NEXT BEST ACTION', text1.includes('NEXT BEST ACTION'))
  check('Normal response: contains QC REQUIREMENTS', text1.includes('QC REQUIREMENTS'))

  const r2 = handleCommand('Set up WhatsApp API automation.')
  const text2 = formatCommandResponse(r2)
  check('Excluded response: contains EXCLUDED REQUEST', text2.includes('EXCLUDED REQUEST'))
  check('Excluded response: contains owner approval', text2.includes('owner approval'))
}

// ── FINAL ──────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(60))
console.log('COMMAND INTERFACE — SCENARIO RESULTS')
console.log('═'.repeat(60))
if (process.exitCode === 1) {
  console.log('STATUS: FAIL — one or more checks failed above')
} else {
  console.log('STATUS: PASS — all command interface scenarios verified')
}
console.log('')
