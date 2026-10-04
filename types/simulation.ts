export type NodeStatus = 'online' | 'offline'

export type NodeType =
  | 'hospital'
  | 'fire_station'
  | 'shelter'
  | 'school'
  | 'residential'
  | 'relay'

export interface InfrastructureNode {
  id: string
  name: string
  type: NodeType

  capacity: number
  load: number
  status: NodeStatus

  capabilities: string[]

  position: {
    x: number
    y: number
  }
}

export type LinkStatus = 'active' | 'broken'

export interface InfrastructureLink {
  id: string
  source: string
  target: string
  status: LinkStatus
  cost: number
}

export interface SimulationState {
  nodes: InfrastructureNode[]
  links: InfrastructureLink[]
}

export interface CandidateResult {
  nodeId: string
  nodeName: string
  availableCapacity: number
  distance: number
  score: number
}

export interface CapabilityTransfer {
  capability: string
  failedNodeId: string
  candidates: CandidateResult[]
  assignedTo: string | null
}

export interface EventEntry {
  id: string
  timestamp: string
  type: 'info' | 'success' | 'warning' | 'critical'
  message: string
}