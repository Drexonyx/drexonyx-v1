// MDA Client State

export type ClientStatus = 'prospect' | 'qualified' | 'active' | 'inactive' | 'archived'
export type ClientSource = 'fiverr' | 'direct' | 'referral' | 'social' | 'other'

export interface ClientState {
  id: string
  name: string
  contactEmail?: string
  contactPhone?: string
  source: ClientSource
  status: ClientStatus
  projectIds: string[]
  createdAt: string
  updatedAt: string
  notes: string
}

export function createClient(partial: Pick<ClientState, 'name' | 'source'> & Partial<ClientState>): ClientState {
  const now = new Date().toISOString()
  return {
    id: `client-${Date.now()}`,
    status: 'prospect',
    projectIds: [],
    createdAt: now,
    updatedAt: now,
    notes: '',
    ...partial,
  }
}
