import networkx as nx
import matplotlib.pyplot as plt

G = nx.Graph()

# Critical services
G.add_node("Hospital A", type="hospital", capacity=100, load=60, status="online", capabilities=["medical", "surgery", "triage", "first_aid"])
G.add_node("Hospital B", type="hospital", capacity=100, load=45, status="online", capabilities=["medical", "triage", "first_aid"])

G.add_node("Fire Station 1", type="fire_station", capacity=80, load=40, status="online", capabilities=["firefighting", "rescue", "first_aid"])
G.add_node("Fire Station 2", type="fire_station", capacity=80, load=35, status="online", capabilities=["firefighting", "rescue", "hazmat_response","first_aid"])

G.add_node("Shelter A", type="shelter", capacity=120, load=70, status="online", capabilities=["temporary_shelter", "education", "food_distribution", "first_aid"])
G.add_node("Shelter B", type="shelter", capacity=120, load=50, status="online", capabilities=["temporary_shelter", "education", "food_distribution", "first_aid"])

G.add_node("School A", type="school", capacity=60, load=30, status="online", capabilities=["education", "childcare", "temporary_shelter", "first_aid"])
G.add_node("School B", type="school", capacity=60, load=25, status="online", capabilities=["education", "childcare", "temporary_shelter", "food_distribution", "first_aid"])

# Residential areas
G.add_node("Neighborhood 1", type="residential", capacity=50, load=30, status="online", capabilities=["community_support", "basic_first_aid"])
G.add_node("Neighborhood 2", type="residential", capacity=50, load=25, status="online", capabilities=["community_support"])
G.add_node("Neighborhood 3", type="residential", capacity=50, load=35, status="online", capabilities=["community_support", "basic_first_aid"])
G.add_node("Neighborhood 4", type="residential", capacity=50, load=20, status="online", capabilities=["community_support", "supply_distribution"])

# Communication relays
G.add_node("Relay 1", type="relay", capacity=100, load=40, status="online", capabilities=["communication", "data_routing", "emergency_alerts"])
G.add_node("Relay 2", type="relay", capacity=100, load=50, status="online", capabilities=["communication", "data_routing", "emergency_alerts"])
G.add_node("Relay 3", type="relay", capacity=100, load=30, status="online", capabilities=["communication", "data_routing", "emergency_alerts"])

G.add_edges_from([

    # Critical infrastructure connections
    ("Hospital A", "Fire Station 1"),
    ("Hospital A", "Shelter A"),
    ("Hospital A", "Relay 1"),
    ("Hospital B", "Fire Station 2"),
    ("Hospital B", "Shelter B"),
    ("Hospital B", "Relay 3"),
    
    # Shelters / schools
    ("Shelter A", "School A"),
    ("Shelter A", "Relay 1"),
    ("Shelter B", "School B"),
    ("Shelter B", "Relay 3"),

    # Residential connections
    ("Neighborhood 1", "School A"),
    ("Neighborhood 1", "Relay 1"),
    ("Neighborhood 2", "Fire Station 1"),
    ("Neighborhood 2", "Relay 2"),
    ("Neighborhood 3", "School B"),
    ("Neighborhood 3", "Relay 2"),
    ("Neighborhood 4", "Fire Station 2"),
    ("Neighborhood 4", "Relay 3"),

    # Communication backbone
    ("Relay 1", "Relay 2"),
    ("Relay 2", "Relay 3"),

    # Cross-network redundancy
    ("Fire Station 1", "Relay 2"),
    ("Fire Station 2", "Relay 2"),
])


def available_capacity(node):
    capacity = G.nodes[node]["capacity"]
    load = G.nodes[node]["load"]

    return capacity - load


def find_capable_nodes(capability, failed_node):
    capable_nodes = []

    for node in G.nodes:

        # Skip the node that failed
        if node == failed_node:
            continue

        # Skip nodes that are NOT online
        if G.nodes[node]["status"] != "online":
            continue

        # Check if the node provides the needed capability
        if capability in G.nodes[node]["capabilities"]:
            capable_nodes.append(node)

    return capable_nodes

def get_candidate_info(capability, failed_node):
    candidates = find_capable_nodes(capability, failed_node)
    candidate_info = []

    for node in candidates:
        info = {
            "node": node,
            "capacity": G.nodes[node]["capacity"],
            "load": G.nodes[node]["load"],
            "available_capacity": available_capacity(node),
            "status": G.nodes[node]["status"],
            "capabilities": G.nodes[node]["capabilities"],
            "distance": nx.shortest_path_length(
                G, 
                source=failed_node, 
                target=node
            )
        }
        candidate_info.append(info)
    return candidate_info

def utilization(node):
    capacity = G.nodes[node]["capacity"]
    load = G.nodes[node]["load"]

    if capacity == 0:
        return 0

    return load / capacity
def score_candidates(capability, failed_node):
    candidates = get_candidate_info(capability, failed_node)

    for candidate in candidates:
        node = candidate["node"]

        spare_ratio = 1 - utilization(node)
        distance = candidate["distance"]

        score = (spare_ratio * 100) - (distance * 10)

        candidate["score"] = score

    candidates.sort(
        key=lambda candidate: candidate["score"],
        reverse=True
    )

    return candidates

def fail_node(node):
    # Mark the node as offline
    G.nodes[node]["status"] = "offline"

    print(f"\nALERT: {node} is OFFLINE")
    print("Searching for backup services...\n")

    # Look at every service the failed node provided
    for capability in G.nodes[node]["capabilities"]:

        candidates = score_candidates(capability, node)

        print(f"Lost capability: {capability}")

        if not candidates:
            print("  NO BACKUP AVAILABLE")
            continue

        for candidate in candidates:
            print(
                f"  {candidate['node']} "
                f"| Score: {candidate['score']:.2f} "
                f"| Available Capacity: {candidate['available_capacity']}"
            )

        print()

# Test failure
fail_node("Fire Station 2")

# Draw graph
pos = nx.spring_layout(G, seed=42)

nx.draw(
    G,
    pos,
    with_labels=True,
    node_size=1800,
    font_size=8,
    width=1.5
)

plt.show()