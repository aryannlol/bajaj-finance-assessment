# SRM Full Stack Challenge: Hierarchy Processor

This project implements a full-stack solution for `POST /bfhl` using a domain-first TypeScript architecture.

## Architecture

```
backend/
  src/
    domain/
      validators/HierarchyEdgeParser.ts
      graph/EdgeConflictResolver.ts
      graph/HierarchyGraphAnalyzer.ts
      models/types.ts
    application/HierarchyProcessor.ts
    infrastructure/api/routes.ts
    server.ts
frontend/
  src/
    App.tsx
    components/TreeNodeView.tsx
    lib/types.ts
```

## Processing Pipeline

1. Validation and normalization
2. Duplicate edge elimination (first occurrence wins)
3. Multi-parent conflict resolution (first parent wins)
4. Graph component detection
5. Per-component cycle detection
6. Tree rendering and depth computation (node count on longest path)

## Why DFS for cycle detection

DFS with `visiting` and `visited` sets gives a clear and deterministic back-edge signal for directed cycle detection. It keeps implementation concise while preserving `O(V + E)` complexity per component.

## Identity Fields

Set these environment variables before running backend:

- `BFHL_USER_ID`
- `BFHL_EMAIL`
- `BFHL_ROLL_NUMBER`

Current fallback defaults are already set for:
- user_id: `aryanmandlik_01012006`
- email: `am8866@srmist.edu.in`
- roll_number: `RA2311003012259`

## Run

```bash
npm install
npm run dev:backend
npm run dev:frontend
```

Backend runs on `http://localhost:3000` by default, frontend expects `VITE_API_URL` or uses that local URL.

## Tests

```bash
npm run test --workspace backend
```

The tests cover validation, duplicates, multi-parent edge dropping, cycles, and depth logic.
