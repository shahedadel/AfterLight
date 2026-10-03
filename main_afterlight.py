import networkx as nx
import matplotlib.pyplot as plt

G = nx.Graph()

G.add_nodes_from([
    "Hospital",
    "Fire Station",
    "Shelter",
    "School",
    "House",
    "Relay"
])

G.add_edges_from([
    ("Hospital", "Shelter"),
    ("Hospital", "Fire Station"),
    ("Shelter", "Fire Station"),
    ("Shelter", "School"),
    ("Fire Station", "House"),
    ("School", "House"),
    ("School", "Relay"),
    ("House", "Relay")
])