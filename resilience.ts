import type {
  CandidateResult,
  CapabilityTransfer,
  InfrastructureLink,
  InfrastructureNode,
} from './types/simulation'

function getNeighbors(
  nodeId: string,
  links: InfrastructureLink[],
): string[] {
  const neighbors: string[] = []

  for (const link of links) {
    if (link.status === 'broken') {
      continue
    }

    if (link.source === nodeId) {
      neighbors.push(link.target)
    } else if (link.target === nodeId) {
      neighbors.push(link.source)
    }
  }

  return neighbors
}

export function shortestPathDistance(
  startNodeId: string,
  targetNodeId: string,
  links: InfrastructureLink[],
): number {
  if (startNodeId === targetNodeId) {
    return 0
  }

  const visited = new Set<string>()
  const queue: Array<{ nodeId: string; distance: number }> = [
    { nodeId: startNodeId, distance: 0 },
  ]

  visited.add(startNodeId)

  while (queue.length > 0) {
    const current = queue.shift()

    if (!current) {
      break
    }

    const neighbors = getNeighbors(current.nodeId, links)

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) {
        continue
      }

      const newDistance = current.distance + 1

      if (neighbor === targetNodeId) {
        return newDistance
      }

      visited.add(neighbor)

      queue.push({
        nodeId: neighbor,
        distance: newDistance,
      })
    }
  }

  return Infinity
}

export function scoreCandidates(
  capability: string,
  failedNodeId: string,
  nodes: InfrastructureNode[],
  links: InfrastructureLink[],
): CandidateResult[] {
  const candidates = nodes
    .filter(
      (node) =>
        node.id !== failedNodeId &&
        node.status === 'online' &&
        node.capabilities.includes(capability),
    )
    .map((node) => {
      const availableCapacity = node.capacity - node.load

      const utilization =
        node.capacity > 0 ? node.load / node.capacity : 1

      const spareRatio = 1 - utilization

      const distance = shortestPathDistance(
        failedNodeId,
        node.id,
        links,
      )

      const score =
        distance === Infinity
          ? -Infinity
          : spareRatio * 100 - distance * 10

      return {
        nodeId: node.id,
        nodeName: node.name,
        availableCapacity,
        distance,
        score,
      }
    })
    .filter((candidate) => candidate.distance !== Infinity)
    .sort((a, b) => b.score - a.score)

  return candidates
}

export function analyzeFailure(
  failedNodeId: string,
  nodes: InfrastructureNode[],
  links: InfrastructureLink[],
): CapabilityTransfer[] {
  const failedNode = nodes.find(
    (node) => node.id === failedNodeId,
  )

  if (!failedNode) {
    return []
  }

  return failedNode.capabilities.map((capability) => {
    const candidates = scoreCandidates(
      capability,
      failedNodeId,
      nodes,
      links,
    )

    return {
      capability,
      failedNodeId,
      candidates,
      assignedTo:
        candidates.length > 0 ? candidates[0].nodeId : null,
    }
  })
}