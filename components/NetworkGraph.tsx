import { useEffect, useRef } from 'react'
import cytoscape, {
  type Core,
  type ElementDefinition,
  type StylesheetStyle,
} from 'cytoscape'
import type {
  InfrastructureLink,
  InfrastructureNode,
} from '../types/simulation'

interface NetworkGraphProps {
  nodes: InfrastructureNode[]
  links: InfrastructureLink[]
  selectedNodeId: string | null
  routeNodeIds: string[]
  routeEdgeIds: string[]
  onSelectNode: (nodeId: string) => void
}

const graphStyles: StylesheetStyle[] = [
  {
    selector: 'node',
    style: {
      width: 76,
      height: 76,
      label: 'data(label)',
      color: '#f8fafc',
      'font-family': 'Inter, system-ui, sans-serif',
      'font-size': 12,
      'font-weight': 700,
      'text-valign': 'center',
      'text-halign': 'center',
      'text-wrap': 'wrap',
      'text-max-width': '68px',
      'background-color': '#22c55e',
      'border-color': '#86efac',
      'border-width': 3,
      'overlay-opacity': 0,
    },
  },
  {
    selector: 'node.warning',
    style: {
      'background-color': '#d97706',
      'border-color': '#fbbf24',
    },
  },
  {
    selector: 'node.critical',
    style: {
      'background-color': '#b91c1c',
      'border-color': '#f87171',
      'border-width': 5,
    },
  },
  {
    selector: 'node.offline',
    style: {
      'background-color': '#334155',
      'border-color': '#64748b',
      'border-style': 'dashed',
      color: '#cbd5e1',
      opacity: 0.72,
    },
  },
  {
    selector: 'node.route',
    style: {
      'border-color': '#22d3ee',
      'border-width': 7,
    },
  },
  {
    selector: 'node.selected',
    style: {
      'border-color': '#ffffff',
      'border-width': 7,
    },
  },
  {
    selector: 'edge',
    style: {
      width: 4,
      'line-color': '#475569',
      'curve-style': 'straight',
      opacity: 0.9,
      'overlay-opacity': 0,
    },
  },
  {
    selector: 'edge.route',
    style: {
      width: 8,
      'line-color': '#22d3ee',
      opacity: 1,
    },
  },
  {
    selector: 'edge.broken',
    style: {
      'line-color': '#ef4444',
      'line-style': 'dashed',
      opacity: 0.38,
    },
  },
]

export function NetworkGraph({
  nodes,
  links,
  selectedNodeId,
  routeNodeIds,
  routeEdgeIds,
  onSelectNode,
}: NetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const cytoscapeRef = useRef<Core | null>(null)
  const selectionHandlerRef = useRef(onSelectNode)

  useEffect(() => {
    selectionHandlerRef.current = onSelectNode
  }, [onSelectNode])

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: graphStyles,
      layout: {
        name: 'preset',
        fit: true,
        padding: 55,
      },
      minZoom: 0.55,
      maxZoom: 2.2,
      wheelSensitivity: 0.18,
      userPanningEnabled: true,
      userZoomingEnabled: true,
      boxSelectionEnabled: false,
      autoungrabify: true,
    })

    cy.on('tap', 'node', (event) => {
      selectionHandlerRef.current(event.target.id())
    })

    cytoscapeRef.current = cy

    return () => {
      cy.destroy()
      cytoscapeRef.current = null
    }
  }, [])

  useEffect(() => {
    const cy = cytoscapeRef.current

    if (!cy) {
      return
    }

    const elements: ElementDefinition[] = [
      ...nodes.map((node) => ({
        group: 'nodes' as const,
        data: {
          id: node.id,
          label:
            node.status === 'offline'
              ? `${node.name}\nOFFLINE`
              : `${node.name}\n${node.load}/${node.capacity}`,
          capacity: node.capacity,
          load: node.load,
          status: node.status,
          type: node.type,
        },
        position: node.position,
      })),
      ...links.map((link) => ({
        group: 'edges' as const,
        data: {
          id: link.id,
          source: link.source,
          target: link.target,
          status: link.status,
          cost: link.cost,
        },
      })),
    ]

    const incomingIds = new Set(
      elements.map((element) => String(element.data?.id)),
    )

    cy.batch(() => {
      cy.elements().forEach((element) => {
        if (!incomingIds.has(element.id())) {
          element.remove()
        }
      })

      elements.forEach((definition) => {
        const id = String(definition.data?.id)
        const existing = cy.getElementById(id)

        if (existing.length === 0) {
          cy.add(definition)
        } else {
          existing.data(definition.data)

          if (definition.group === 'nodes' && definition.position) {
            existing.position(definition.position)
          }
        }
      })

      cy.elements().removeClass(
        'warning critical offline route selected broken',
      )

      cy.nodes().forEach((node) => {
        const status = node.data('status') as string
        const capacity = Number(node.data('capacity'))
        const load = Number(node.data('load'))

        const utilization = capacity > 0 ? (load / capacity) * 100 : 0
        
        if (status === 'offline') {
          node.addClass('offline')
        } else if (utilization >= 80) {
          node.addClass('critical')
        } else if (utilization >= 60) {
          node.addClass('warning')
        }
        
      })

      cy.edges().forEach((edge) => {
        if (edge.data('status') === 'broken') {
          edge.addClass('broken')
        }
      })

      routeNodeIds.forEach((nodeId) => {
        cy.getElementById(nodeId).addClass('route')
      })

      routeEdgeIds.forEach((edgeId) => {
        cy.getElementById(edgeId).addClass('route')
      })

      if (selectedNodeId) {
        cy.getElementById(selectedNodeId).addClass('selected')
      }
    })

    cy.layout({
      name: 'preset',
      fit: true,
      padding: 55,
      animate: false,
    }).run()
  }, [nodes, links, selectedNodeId, routeNodeIds, routeEdgeIds])

  return (
    <div
      ref={containerRef}
      className="network-graph"
      role="img"
      aria-label="Afterlight communication network showing community locations and active communication links"
    />
  )
}
