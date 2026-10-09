// MDA QC Gate System

export type QCDimension =
  | 'visual'      // layout, spacing, typography, branding consistency
  | 'textual'     // spelling, grammar, tone, accuracy
  | 'technical'   // links, functionality, responsiveness, performance
  | 'requirement' // all brief requirements met
  | 'functional'  // interactive elements work as expected

export type QCGateStatus = 'pending' | 'pass' | 'fail' | 'skipped'

export interface QCItem {
  dimension: QCDimension
  check: string
  status: QCGateStatus
  failureReason?: string
}

export interface QCGate {
  projectId: string
  workflowStep: string
  items: QCItem[]
  overallStatus: QCGateStatus
  reviewedAt?: string
  reviewedBy?: string
}

// QC gate definitions per workflow step
export const QC_GATES: Record<string, QCItem[]> = {
  'website-pre-delivery': [
    { dimension: 'visual', check: 'Layout renders correctly on desktop and mobile', status: 'pending' },
    { dimension: 'visual', check: 'Typography is consistent and readable', status: 'pending' },
    { dimension: 'visual', check: 'Brand colors and assets applied correctly', status: 'pending' },
    { dimension: 'technical', check: 'All navigation links work', status: 'pending' },
    { dimension: 'technical', check: 'Contact forms submit without errors', status: 'pending' },
    { dimension: 'technical', check: 'Page loads without console errors', status: 'pending' },
    { dimension: 'technical', check: 'Responsive on phone width (≤400px)', status: 'pending' },
    { dimension: 'requirement', check: 'All sections from brief are present', status: 'pending' },
    { dimension: 'requirement', check: 'Client-provided copy/assets used correctly', status: 'pending' },
  ],
  'design-pre-delivery': [
    { dimension: 'visual', check: 'Composition is balanced and professional', status: 'pending' },
    { dimension: 'visual', check: 'Colors match brand guidelines', status: 'pending' },
    { dimension: 'textual', check: 'All text is spelled correctly', status: 'pending' },
    { dimension: 'textual', check: 'Contact info and details are accurate', status: 'pending' },
    { dimension: 'requirement', check: 'All deliverables from brief produced', status: 'pending' },
  ],
  'video-pre-delivery': [
    { dimension: 'visual', check: 'Video plays without artifacts', status: 'pending' },
    { dimension: 'technical', check: 'Audio is clear and properly leveled', status: 'pending' },
    { dimension: 'textual', check: 'Captions/titles are spelled correctly', status: 'pending' },
    { dimension: 'requirement', check: 'Duration matches brief specification', status: 'pending' },
    { dimension: 'requirement', check: 'Platform aspect ratio correct', status: 'pending' },
  ],
  'social-pre-publish': [
    { dimension: 'textual', check: 'Caption is spelled correctly and on-brand', status: 'pending' },
    { dimension: 'requirement', check: 'Hashtags relevant and within platform limits', status: 'pending' },
    { dimension: 'visual', check: 'Creative asset meets platform spec', status: 'pending' },
    { dimension: 'requirement', check: 'Publishing time aligns with content calendar', status: 'pending' },
  ],
  'portfolio-entry': [
    { dimension: 'requirement', check: 'Project label is accurate (Client Work / Concept / Speculative)', status: 'pending' },
    { dimension: 'textual', check: 'Case study text is factual — no fabricated results', status: 'pending' },
    { dimension: 'visual', check: 'Portfolio visuals are high quality', status: 'pending' },
  ],
}

export function createQCGate(projectId: string, workflowStep: string): QCGate {
  const templateItems = QC_GATES[workflowStep] ?? []
  return {
    projectId,
    workflowStep,
    items: templateItems.map(item => ({ ...item })),
    overallStatus: 'pending',
  }
}

export function evaluateQCGate(gate: QCGate): QCGate {
  const hasFail = gate.items.some(i => i.status === 'fail')
  const allDone = gate.items.every(i => i.status !== 'pending')
  return {
    ...gate,
    overallStatus: hasFail ? 'fail' : allDone ? 'pass' : 'pending',
    reviewedAt: new Date().toISOString(),
  }
}
