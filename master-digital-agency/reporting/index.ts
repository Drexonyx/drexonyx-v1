// MDA Agency Reporting — W10 implementation

import { ProjectState } from '../state/project'
import { ClientState } from '../state/client'
import { surfaceNextBestAction } from '../agents/core/agency-director'

export interface AgencyReport {
  generatedAt: string
  projects: ProjectSummary[]
  pendingApprovals: string[]
  productionStatus: StatusCount
  qcStatus: StatusCount
  deliveryStatus: StatusCount
  opportunities: string[]
  contentPublishingStatus: string
  portfolioOpportunities: string[]
  nextBestAction: string
  blockers: string[]
}

interface ProjectSummary {
  id: string
  name: string
  type: string
  status: string
  paymentStatus: string
  requiresOwnerApproval: boolean
}

interface StatusCount {
  pending: number
  inProgress: number
  done: number
  blocked: number
}

function countStatuses(projects: ProjectState[], statuses: { inProgress: string[]; done: string[]; blocked: string[] }): StatusCount {
  return {
    pending: projects.filter(p => p.status === 'intake' || p.status === 'qualification').length,
    inProgress: projects.filter(p => statuses.inProgress.includes(p.status)).length,
    done: projects.filter(p => statuses.done.includes(p.status)).length,
    blocked: projects.filter(p => statuses.blocked.includes(p.status)).length,
  }
}

export function generateAgencyReport(
  projects: ProjectState[],
  clients: ClientState[],
  opportunities: string[],
  contentPublishingStatus: string,
): AgencyReport {
  const pendingApprovals = projects
    .filter(p => p.requiresOwnerApproval && !p.approvedAt && p.status !== 'delivered' && p.status !== 'archived')
    .map(p => `${p.name} (${p.status})`)

  const portfolioOpportunities = projects
    .filter(p => p.status === 'delivered' && !p.portfolioLabel)
    .map(p => `${p.name} — eligible for portfolio`)

  const blockers = [
    ...pendingApprovals.map(a => `Awaiting approval: ${a}`),
    ...projects.filter(p => p.status === 'qc').map(p => `QC pending: ${p.name}`),
  ]

  return {
    generatedAt: new Date().toISOString(),
    projects: projects.map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
      status: p.status,
      paymentStatus: p.paymentStatus,
      requiresOwnerApproval: p.requiresOwnerApproval,
    })),
    pendingApprovals,
    productionStatus: countStatuses(projects, {
      inProgress: ['in-production'],
      done: ['delivered', 'archived'],
      blocked: ['awaiting-approval'],
    }),
    qcStatus: countStatuses(projects, {
      inProgress: ['qc'],
      done: ['delivered'],
      blocked: ['revision'],
    }),
    deliveryStatus: countStatuses(projects, {
      inProgress: ['awaiting-approval'],
      done: ['delivered'],
      blocked: [],
    }),
    opportunities,
    contentPublishingStatus,
    portfolioOpportunities,
    nextBestAction: surfaceNextBestAction(projects),
    blockers,
  }
}

export function formatAgencyReport(report: AgencyReport): string {
  const lines: string[] = [
    `# MASTER DIGITAL AGENCY — REPORT`,
    `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
    ``,
    `## Projects (${report.projects.length})`,
    ...report.projects.map(p => `- [${p.status.toUpperCase()}] ${p.name} (${p.type}) — Payment: ${p.paymentStatus}`),
    ``,
    `## Pending Approvals (${report.pendingApprovals.length})`,
    ...(report.pendingApprovals.length ? report.pendingApprovals.map(a => `- ${a}`) : ['None']),
    ``,
    `## Production Status`,
    `- Pending: ${report.productionStatus.pending}`,
    `- In Progress: ${report.productionStatus.inProgress}`,
    `- Done: ${report.productionStatus.done}`,
    `- Blocked: ${report.productionStatus.blocked}`,
    ``,
    `## Content / Publishing`,
    report.contentPublishingStatus || 'No active publishing campaigns.',
    ``,
    `## Portfolio Opportunities`,
    ...(report.portfolioOpportunities.length ? report.portfolioOpportunities.map(o => `- ${o}`) : ['None at this time']),
    ``,
    `## Opportunities`,
    ...(report.opportunities.length ? report.opportunities.map(o => `- ${o}`) : ['None identified yet']),
    ``,
    `## Blockers`,
    ...(report.blockers.length ? report.blockers.map(b => `- ${b}`) : ['None']),
    ``,
    `## NEXT BEST ACTION`,
    report.nextBestAction,
  ]
  return lines.join('\n')
}
