import { useMemo, useState } from 'react'
import {
  Activity,
  Radio,
  RotateCcw,
  Skull,
} from 'lucide-react'
import './App.css'
import { NetworkGraph } from './components/NetworkGraph'
import { createInitialSimulation } from './data/mockSimulation'
import type { CapabilityTransfer, EventEntry } from './types/simulation'
import { analyzeFailure } from './resilience'

const INITIAL_ROUTE_NODES: string[] = []
const INITIAL_ROUTE_EDGES: string[] = []

function currentTime() {
  return new Intl.DateTimeFormat([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date())
}

function findShortestPathEdges(
  startId: string,
  targetId: string,
  links: { id: string; source: string; target: string; status: string }[],
): string[] {
  const queue: Array<{ nodeId: string; path: string[] }> = [
    { nodeId: startId, path: [] },
  ]

  const visited = new Set<string>([startId])

  while (queue.length > 0) {
    const current = queue.shift()

    if (!current) break

    if (current.nodeId === targetId) {
      return current.path
    }

    const connectedLinks = links.filter(
      (link) =>
        link.status === 'active' &&
        (link.source === current.nodeId ||
          link.target === current.nodeId),
    )

    for (const link of connectedLinks) {
      const neighbor =
        link.source === current.nodeId
          ? link.target
          : link.source

      if (visited.has(neighbor)) continue

      visited.add(neighbor)

      queue.push({
        nodeId: neighbor,
        path: [...current.path, link.id],
      })
    }
  }

  return []
}


function App() {
  const [simulation, setSimulation] = useState(createInitialSimulation)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    'hospital_a',
  )
  const [routeNodeIds, setRouteNodeIds] = useState(INITIAL_ROUTE_NODES)
  const [routeEdgeIds, setRouteEdgeIds] = useState(INITIAL_ROUTE_EDGES)
  const [transfers, setTransfers] = useState<CapabilityTransfer[]>([])
  const [events, setEvents] = useState<EventEntry[]>([
    {
      id: crypto.randomUUID(),
      timestamp: currentTime(),
      type: 'success',
      message: 'Resilience network initialized. 15 infrastructure nodes online.',
    },
    {
      id: crypto.randomUUID(),
      timestamp: currentTime(),
      type: 'info',
      message: 'Afterlight is monitoring capacity, capabilities, and backup coverage.',
    },
  ])

  const selectedNode = useMemo(
    () =>
      simulation.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [simulation.nodes, selectedNodeId],
  )

  const onlineCount = simulation.nodes.filter(
    (node) => node.status === 'online',
  ).length

  function addEvent(
    type: EventEntry['type'],
    message: string,
  ) {
    setEvents((current) => [
      {
        id: crypto.randomUUID(),
        timestamp: currentTime(),
        type,
        message,
      },
      ...current,
    ].slice(0, 12))
  }

  function killSelectedNode() {
    if (!selectedNode || selectedNode.status === 'offline') {
      return
    }

    const failureResults = analyzeFailure(
    selectedNode.id,
    simulation.nodes,
    simulation.links,
    )
  
    setSimulation((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === selectedNode.id
          ? { ...node, status: 'offline' as const }
          : node,
      ),
    }))

    setTransfers(failureResults)
    const backupNodeIds = failureResults
      .map((transfer) => transfer.assignedTo)
      .filter((id): id is string => id !== null)

    setRouteNodeIds([...new Set(backupNodeIds)])

    const transferEdges = failureResults.flatMap((transfer) => {
      if (!transfer.assignedTo) {
        return []
      }

      return findShortestPathEdges(
        selectedNode.id,
        transfer.assignedTo,
        simulation.links,
      )
    })

setRouteEdgeIds([...new Set(transferEdges)])

    addEvent('critical', `${selectedNode.name} went offline. Analyzing lost capabilities...`)

    failureResults.forEach((transfer) => {
      const assignedNode = simulation.nodes.find(
        (node) => node.id === transfer.assignedTo,
      )

      if (assignedNode) {
        addEvent(
          'warning',
          `Capability "${transfer.capability}" reassigned to ${assignedNode.name}.`,
        )
      } else {
        addEvent(
          'critical',
          `${transfer.capability}: NO BACKUP AVAILABLE.`,
        )
      }
    })
  }

  function resetSimulation() {
    setSimulation(createInitialSimulation())
    setSelectedNodeId('hospital_a')
    setRouteNodeIds(INITIAL_ROUTE_NODES)
    setRouteEdgeIds(INITIAL_ROUTE_EDGES)
    setTransfers([])
    
    setEvents([
      {
        id: crypto.randomUUID(),
        timestamp: currentTime(),
        type: 'success',
        message: 'Simulation reset. All infrastructure nodes restored.',
      },
    ])
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <Radio size={24} />
          </div>
          <div>
            <p className="eyebrow">Critical infrastructure resilience</p>
            <h1>AFTERLIGHT</h1>
          </div>
        </div>

        <div className="network-summary" aria-label="Network status">
          <span
            className={`status-dot ${
              onlineCount === simulation.nodes.length ? 'healthy' : 'degraded'
            }`}
          />
          <div>
            <span className="summary-label">Network status</span>
            <strong>
              {onlineCount === simulation.nodes.length
                ? 'Operational'
                : 'Degraded'}
            </strong>
          </div>
          <div className="node-count">
            {onlineCount}/{simulation.nodes.length} online
          </div>
        </div>
      </header>

      <section className="dashboard">
        <section className="panel graph-panel" aria-labelledby="network-heading">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Live topology</p>
              <h2 id="network-heading">Critical Infrastructure Resilience Network</h2>
            </div>

            <div className="legend" aria-label="Network legend">
              <span><i className="legend-dot healthy" /> Healthy</span>
              <span><i className="legend-dot warning" /> Low power</span>
              <span><i className="legend-dot critical" /> Critical</span>
              <span><i className="legend-line" /> Active route</span>
            </div>
          </div>

          <NetworkGraph
            nodes={simulation.nodes}
            links={simulation.links}
            selectedNodeId={selectedNodeId}
            routeNodeIds={routeNodeIds}
            routeEdgeIds={routeEdgeIds}
            onSelectNode={setSelectedNodeId}
          />
        </section>

        <aside className="right-column">
          <section className="panel details-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Selected location</p>
                <h2>{selectedNode?.name ?? 'No node selected'}</h2>
              </div>
              {selectedNode && (
                <span
                  className={`status-pill ${selectedNode.status}`}
                >
                  {selectedNode.status}
                </span>
              )}
            </div>

            {selectedNode && (
              <>
              <div className="battery-block">
                <div className="battery-row">
                  <span>Capacity utilization</span>
                  <strong>
                    {selectedNode.load}/{selectedNode.capacity}
                  </strong>
                </div>

                <div
                  className="battery-track"
                  role="progressbar"
                  aria-label={`${selectedNode.name} capacity utilization`}
                  aria-valuemin={0}
                  aria-valuemax={selectedNode.capacity}
                  aria-valuenow={selectedNode.load}
                >
                  <span
                    className={
                      (selectedNode.load / selectedNode.capacity) * 100 >= 80
                        ? 'critical'
                        : (selectedNode.load / selectedNode.capacity) * 100 >= 60
                          ? 'warning'
                          : ''
                    }
                    style={{
                      width: `${Math.min(
                        100,
                        (selectedNode.load / selectedNode.capacity) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>

                <DetailList
                  title="Capabilities"
                  items={selectedNode.capabilities}
                />
                
                {selectedNode.status === 'offline' && transfers.length > 0 && transfers.length > 0 && transfers[0]?.failedNodeId === selectedNode.id && (
                  <section className="detail-list">
                    <h3>Responsibility Redistribution</h3>

                    <ul>
                      {transfers.map((transfer) => {
                        const assignedNode = simulation.nodes.find(
                          (node) => node.id === transfer.assignedTo,
                        )

                        return (
                          <li key={transfer.capability}>
                            <strong>{transfer.capability}</strong>
                            {' → '}
                            {assignedNode ? assignedNode.name : 'NO BACKUP AVAILABLE'}
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )}
              </>
            )}
          </section>

          <section className="panel controls-panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Manual intervention</p>
                <h2>Disaster Controls</h2>
              </div>
            </div>

            <div className="control-grid">
              <button
                type="button"
                className="control danger"
                onClick={killSelectedNode}
                disabled={!selectedNode || selectedNode.status === 'offline'}
              >
                <Skull size={18} />
                Simulate Failure
              </button>

              <button
                type="button"
                className="control reset"
                onClick={resetSimulation}
              >
                <RotateCcw size={18} />
                Reset
              </button>
            </div>
          </section>
        </aside>

        <section className="panel event-panel">
          <div className="panel-heading compact">
            <div>
              <p className="eyebrow">System telemetry</p>
              <h2>Live Events</h2>
            </div>
            <Activity size={20} aria-hidden="true" />
          </div>

          <ol className="event-list">
            {events.map((event) => (
              <li key={event.id} className={event.type}>
                <time>{event.timestamp}</time>
                <span className="event-indicator" aria-hidden="true" />
                <p>{event.message}</p>
              </li>
            ))}
          </ol>
        </section>
      </section>
    </main>
  )
}

interface DetailListProps {
  title: string
  items: string[]
}

function DetailList({ title, items }: DetailListProps) {
  return (
    <section className="detail-list">
      <h3>{title}</h3>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>None reported</p>
      )}
    </section>
  )
}

export default App
