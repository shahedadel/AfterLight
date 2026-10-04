export type NodeStatus = 'alive' | 'dead'

export interface CommunicationNode {
  id: string
  name: string
  battery: number
  status: NodeStatus
  resources: string[]
  responsibilities: string[]
  capabilities: string[]
  queue: EmergencyMessage[]
  position: {
    x: number
    y: number
  }
}

export type LinkStatus = 'active' | 'broken'

export interface CommunicationLink {
  id: string
  source: string
  target: string
  status: LinkStatus
  cost: number
}

export type MessageSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface EmergencyMessage {
  id: string
  origin: string
  destination: string
  category: string
  text: string
  severity: MessageSeverity
  ageMinutes: number
  peopleAffected: number
  duplicate: boolean
}

export interface SimulationState {
  nodes: CommunicationNode[]
  links: CommunicationLink[]
}

export interface EventEntry {
  id: string
  timestamp: string
  type: 'info' | 'success' | 'warning' | 'critical'
  message: string
}
