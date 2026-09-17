# RippleGuard 🌊[RippleGuard — Model the ripple. Understand the exposure. Stop it early.]

### Open Source Supply Chain Risk Analysis :

RippleGuard is a dependency ecosystem risk-analysis platform that shows how a compromised open-source dependency could potentially affect downstream components.

Instead of looking at dependencies individually, RippleGuard models them as a connected graph and simulates the possible "ripple effect" of a compromise.

## 🚀 Features :

- Upload a `package-lock.json` dependency file
- Build and visualize the dependency graph
- Identify critical dependencies
- Simulate a potential dependency compromise
- Trace potential downstream impact
- Show affected components and propagation paths
- Rank dependencies by potential exposure reduction
- Recommend high-impact intervention points

## 🛠️ Tech Stack :

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express
- **Analysis:** Python, NetworkX
- **Graph Visualization:** Cytoscape.js

## 🔄 How It Works :

```text
Upload Dependency File
        ↓
Parse Dependencies
        ↓
Build Dependency Graph
        ↓
Analyze Risk
        ↓
Simulate Compromise
        ↓
Trace Ripple Effect
        ↓
Rank Mitigation Points
        ↓
Display Results
