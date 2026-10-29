# Smart Examination Seating

A robust, automated seating logistics platform designed for university examination offices. Smart Seating automatically processes student rosters, accommodates accessible seating requirements, and dynamically assigns seats to guarantee that no two students taking the same exam sit adjacent to one another.

This project was built to replace manual, error-prone seating allocations with a reliable, one-click engine.

## Features

- **Algorithmic Separation**: Prevents academic misconduct by enforcing strict subject separation rules across all orthogonal adjacencies.
- **Capacity & Feasibility Pre-checks**: Instantly flags if a room configuration is too dense to safely separate a given roster.
- **Accessible Seating Support**: Automatically reserves and prioritizes front-row or aisle seats for students requiring accommodations.
- **Production-Ready UI**: A clean, distraction-free interface built with Next.js and Tailwind CSS, featuring full data tables and visual room mapping.
- **Export & Print**: Instantly download CSV allocation tables or view print-friendly visual charts for invigilators.

---

## Technical Architecture

Smart Seating is structured as a decoupled application:

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS with a custom, high-contrast, linear-style design system.
- **Features**: Multi-step setup wizards, responsive data tables, and client-side room visualization grids.

### Backend (The Math Engine)
- **Framework**: FastAPI (Python)
- **Core Engine**: A discrete-mathematics-based allocation system using `NetworkX` and `SymPy`.

### How It Works (The Math Underneath)

While the product interface abstracts away the complexity, the backend engine is powered by rigorous discrete mathematics:

1. **Pigeonhole Principle (Feasibility)**: Before any allocation begins, the engine compares the maximum independent set of the seating graph against the frequency of the most common subject to guarantee a valid arrangement is mathematically possible.
2. **Rook Polynomials (Forbidden Positions)**: Accessible seating is treated as a restricted permutation problem, ensuring special-needs students are assigned optimal seats before general allocation.
3. **Graph Coloring (Conflict Resolution)**: The engine builds a conflict graph where nodes are students and edges represent shared subjects. Applying graph coloring algorithms ensures no two adjacent seats share the same color (subject).
4. **Propositional Logic (Validation)**: A rigorous post-check uses predicate logic to verify that all hard constraints (e.g., $∀u,v \in Seats: Adjacency(u,v) \implies Subject(u) \neq Subject(v)$) are strictly met.

---

## Getting Started

### Backend Setup
1. Navigate to the `backend/` directory.
2. Install dependencies: `pip install -r requirements.txt`
3. Run the API: `uvicorn main:app --reload`
*(The API will start on http://localhost:8000)*

### Frontend Setup
1. Navigate to the `frontend/` directory.
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev`
*(The web app will start on http://localhost:3000)*

## Deployment

This architecture is designed to be easily deployed:
- **Frontend**: Deploy directly to Vercel.
- **Backend**: Deploy as a web service on Render, Railway, or Fly.io.
