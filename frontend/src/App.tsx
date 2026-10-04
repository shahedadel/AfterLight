import { useMemo, useState } from 'react'
import {
  Activity,
  BatteryWarning,
  Radio,
  RotateCcw,
  Skull,
  Zap,
} from 'lucide-react'
import { NetworkGraph } from './components/NetworkGraph'
import { createInitialSimulation } from './data/mockSimulation'
import type { EventEntry } from './types/simulation'
import './App.css'

const INITIAL_ROUTE_NODES = ['house_a', 'school', 'hospital']
const INITIAL_ROUTE_EDGES = ['house_a--school', 'school--hospital']

function currentTime() {
  return new Intl.DateTimeFormat([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date())
}

function App() {
  const [simulation, setSimulation] = useState(createInitialSimulation)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    'house_a',
  )
  const [routeNodeIds, setRouteNodeIds] = useState(INITIAL_ROUTE_NODES)
  const [routeEdgeIds, setRouteEdgeIds] = useState(INITIAL_ROUTE_EDGES)
  const [events, setEvents] = useState<EventEntry[]>([
    {
      id: crypto.randomUUID(),
      timestamp: currentTime(),
      type: 'success',
      message: 'Network initialized. Six communication nodes online.',
    },
    {
      id: crypto.randomUUID(),
      timestamp: currentTime(),
      type: 'info',
      message: 'Route established: House A → School → Hospital.',
    },
  ])

  const selectedNode = useMemo(
    () =>
      simulation.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [simulation.nodes, selectedNodeId],
  )

  const onlineCount = simulation.nodes.filter(
    (node) => node.status === 'alive',
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
    if (!selectedNode || selectedNode.status === 'dead') {
      return
    }

    setSimulation((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === selectedNode.id
          ? { ...node, status: 'dead', battery: 0 }
          : node,
      ),
    }))

    addEvent('critical', `${selectedNode.name} went offline.`)

    if (selectedNode.id === 'school') {
      setRouteNodeIds([
        'house_a',
        'house_b',
        'fire_station',
        'hospital',
      ])
      setRouteEdgeIds([
        'house_a--house_b',
        'house_b--fire_station',
        'fire_station--hospital',
      ])
      addEvent(
        'warning',
        'Primary route failed. Alternate route calculated through House B and Fire Station.',
      )
    }
  }

  function drainSelectedNode() {
    if (!selectedNode || selectedNode.status === 'dead') {
      return
    }

    const nextBattery = Math.max(0, selectedNode.battery - 10)
    const becomesDead = nextBattery === 0

    setSimulation((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === selectedNode.id
          ? {
              ...node,
              battery: nextBattery,
              status: becomesDead ? 'dead' : node.status,
            }
          : node,
      ),
    }))

    addEvent(
      becomesDead ? 'critical' : nextBattery <= 5 ? 'warning' : 'info',
      becomesDead
        ? `${selectedNode.name} exhausted its battery and went offline.`
        : `${selectedNode.name} battery drained to ${nextBattery}%.`,
    )
  }

  function resetSimulation() {
    setSimulation(createInitialSimulation())
    setSelectedNodeId('house_a')
    setRouteNodeIds(INITIAL_ROUTE_NODES)
    setRouteEdgeIds(INITIAL_ROUTE_EDGES)
    setEvents([
      {
        id: crypto.randomUUID(),
        timestamp: currentTime(),
        type: 'success',
        message: 'Simulation reset. All communication nodes restored.',
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
            <p className="eyebrow">Resilient communication system</p>
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
              <h2 id="network-heading">Communication Network</h2>
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
                    <span>Battery reserve</span>
                    <strong>{selectedNode.battery}%</strong>
                  </div>
                  <div
                    className="battery-track"
                    role="progressbar"
                    aria-label={`${selectedNode.name} battery`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={selectedNode.battery}
                  >
                    <span
                      className={
                        selectedNode.battery <= 5
                          ? 'critical'
                          : selectedNode.battery <= 25
                            ? 'warning'
                            : ''
                      }
                      style={{ width: `${selectedNode.battery}%` }}
                    />
                  </div>
                </div>

                <DetailList
                  title="Resources"
                  items={selectedNode.resources}
                />
                <DetailList
                  title="Responsibilities"
                  items={selectedNode.responsibilities}
                />
                <DetailList
                  title="Capabilities"
                  items={selectedNode.capabilities}
                />
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
                disabled={!selectedNode || selectedNode.status === 'dead'}
              >
                <Skull size={18} />
                Kill node
              </button>

              <button
                type="button"
                className="control warning"
                onClick={drainSelectedNode}
                disabled={!selectedNode || selectedNode.status === 'dead'}
              >
                <BatteryWarning size={18} />
                Drain 10%
              </button>

              <button
                type="button"
                className="control"
                onClick={() =>
                  addEvent(
                    'warning',
                    'Emergency generated: critical medical request queued.',
                  )
                }
              >
                <Zap size={18} />
                Emergency
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
