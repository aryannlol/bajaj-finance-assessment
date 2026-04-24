import { FormEvent, useEffect, useMemo, useState } from "react";
import { TreeNodeView } from "./components/TreeNodeView";
import { ApiResponse } from "./lib/types";

const DEFAULT_INPUT = JSON.stringify(["A->B", "B->C", "X->Y", "A->B", "C->A", "B->D"], null, 2);
const EXAMPLES: Array<{ label: string; value: string }> = [
  { label: "Choose example...", value: "" },
  { label: "Simple Tree", value: JSON.stringify(["A->B", "B->C", "A->D"], null, 2) },
  { label: "Single Edge", value: JSON.stringify(["A->B"], null, 2) },
  { label: "Balanced Tree", value: JSON.stringify(["A->B", "A->C", "B->D", "B->E", "C->F", "C->G"], null, 2) },
  { label: "Deep Chain", value: JSON.stringify(["A->B", "B->C", "C->D", "D->E", "E->F"], null, 2) },
  { label: "Wide Root", value: JSON.stringify(["A->B", "A->C", "A->D", "A->E", "A->F"], null, 2) },
  { label: "Cycle Only", value: JSON.stringify(["A->B", "B->C", "C->A"], null, 2) },
  { label: "All Invalid", value: JSON.stringify(["a->B", "A-B", "A->A", 123], null, 2) },
  {
    label: "Mixed (Duplicates + Cycle + Invalid)",
    value: JSON.stringify(["A->B", "B->C", "X->Y", "A->B", "C->A", "B->D", "Q->Q", "bad-format"], null, 2)
  },
  { label: "Multi Parent Conflict", value: JSON.stringify(["A->D", "B->D", "D->E", "X->Y"], null, 2) },
  { label: "Multiple Components", value: JSON.stringify(["A->B", "C->D", "D->E", "M->N"], null, 2) },
  {
    label: "Stress Mix",
    value: JSON.stringify(
      [
        "A->B",
        "A->C",
        "B->D",
        "C->E",
        "E->F",
        "X->Y",
        "Y->Z",
        "Z->X",
        "A->B",
        "P->Q",
        "R->Q",
        "Q->S",
        "bad",
        "T->T"
      ],
      null,
      2
    )
  }
];
const API_BASE = import.meta.env.VITE_API_URL ?? "";
const LOADING_PHASES = [
  "Validating node relationships...",
  "Resolving duplicates and parent conflicts...",
  "Building graph components...",
  "Detecting cycles and calculating depth..."
];

function parseInput(input: string): unknown[] {
  const parsed = JSON.parse(input);
  if (!Array.isArray(parsed)) {
    throw new Error("Input must be a JSON array.");
  }
  return parsed;
}

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9 2a2 2 0 0 0-2 2v1H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1h2a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V4a2 2 0 0 0-2-2H9Zm0 2h6v1H9V4Zm-3 3h8v11H6V7Zm10 0h2v8h-2V7Z"
      />
    </svg>
  );
}

export default function App() {
  const [rawInput, setRawInput] = useState(DEFAULT_INPUT);
  const [selectedExample, setSelectedExample] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [themeMode, setThemeMode] = useState<"default" | "aqua">("default");
  const [copyState, setCopyState] = useState<"idle" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [loadingPhase, setLoadingPhase] = useState(LOADING_PHASES[0]);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);

  const prettyJson = useMemo(() => (result ? JSON.stringify(result, null, 2) : ""), [result]);
  const hasResult = Boolean(result);

  useEffect(() => {
    let mounted = true;
    fetch(`${API_BASE}/bfhl`)
      .then((response) => {
        if (mounted) {
          setApiOnline(response.ok);
        }
      })
      .catch(() => {
        if (mounted) {
          setApiOnline(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("theme-aqua", themeMode === "aqua");
    return () => {
      document.body.classList.remove("theme-aqua");
    };
  }, [themeMode]);

  useEffect(() => {
    if (!isSubmitting) {
      return;
    }

    let idx = 0;
    setLoadingPhase(LOADING_PHASES[idx]);
    const timer = window.setInterval(() => {
      idx = (idx + 1) % LOADING_PHASES.length;
      setLoadingPhase(LOADING_PHASES[idx]);
    }, 380);

    return () => {
      window.clearInterval(timer);
    };
  }, [isSubmitting]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const commandKey = event.ctrlKey || event.metaKey;
      if (commandKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setRawInput(DEFAULT_INPUT);
        setSelectedExample("");
        setResult(null);
        setError(null);
      }
      if (commandKey && event.key === "Enter") {
        const form = document.getElementById("bfhl-form");
        if (form instanceof HTMLFormElement) {
          form.requestSubmit();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setCopyState("idle");

    let payloadData: unknown[];
    try {
      payloadData = parseInput(rawInput);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/bfhl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: payloadData })
      });

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new Error("Server returned a non-JSON response.");
      }

      if (!response.ok) {
        const errMessage =
          typeof payload === "object" &&
          payload !== null &&
          "message" in payload &&
          typeof (payload as { message?: unknown }).message === "string"
            ? (payload as { message: string }).message
            : `Request failed with status ${response.status}.`;
        throw new Error(errMessage);
      }

      const data = payload as ApiResponse;
      if (!data || !Array.isArray(data.hierarchies) || !data.summary) {
        throw new Error("Unexpected response shape from backend.");
      }
      setResult(data);
    } catch (err) {
      if (err instanceof TypeError) {
        setError("Network error. Check backend URL/CORS/server status.");
      } else {
        setError(err instanceof Error ? err.message : "Unexpected network error.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClear() {
    setRawInput(DEFAULT_INPUT);
    setSelectedExample("");
    setResult(null);
    setError(null);
  }

  function handleExport() {
    if (!result) {
      return;
    }
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bfhl-result.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }


  function handleCleanJson() {
    try {
      const parsed = JSON.parse(rawInput);
      setRawInput(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch {
      setError("Invalid JSON. Cannot clean.");
    }
  }

  async function handleCopyJson() {
    if (!result) {
      return;
    }
    try {
      await navigator.clipboard.writeText(prettyJson);
      setCopyState("done");
    } catch {
      setCopyState("error");
    } finally {
      window.setTimeout(() => setCopyState("idle"), 1600);
    }
  }

  return (
    <div className="page-shell">
      <button
        type="button"
        className="theme-toggle"
        onClick={() => setThemeMode((prev) => (prev === "default" ? "aqua" : "default"))}
      >
        {themeMode === "default" ? "Switch Palette" : "Use Default Palette"}
      </button>
      <header className="hero">
        <div>
          <h1>Hierarchy Relationship Processor</h1>
          <p>Parse graph edges into clean, explainable tree structures with diagnostics and cycle awareness.</p>
        </div>
        <div className={apiOnline === null ? "status-chip" : apiOnline ? "status-chip online" : "status-chip offline"}>
          <span className="status-dot" />
          API {apiOnline === null ? "checking..." : apiOnline ? "online" : "offline"}
        </div>
      </header>

      <main className="workspace">
        <section className="panel input-panel">
          <h2>Input Array</h2>
          <div className="example-box">
            <p>
              Example format: <code>["A-&gt;B", "B-&gt;C", "X-&gt;Y"]</code>
            </p>
            <select
              className="example-select"
              value={selectedExample}
              onChange={(e) => {
                const chosen = e.target.value;
                setSelectedExample(chosen);
                if (chosen) {
                  setRawInput(chosen);
                }
              }}
            >
              {EXAMPLES.map((example) => (
                <option key={example.label} value={example.value}>
                  {example.label}
                </option>
              ))}
            </select>
          </div>
          <form id="bfhl-form" onSubmit={handleSubmit}>
            <textarea value={rawInput} onChange={(e) => setRawInput(e.target.value)} rows={12} />
            <div className="action-row">
              <button type="submit" className="primary-btn" disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : "Run /bfhl"}
              </button>
              <button type="button" className="secondary-btn" onClick={handleClear}>
                Clear
              </button>
              <button type="button" className="secondary-btn" onClick={handleCleanJson}>
                Clean JSON
              </button>
              <button type="button" className="secondary-btn" onClick={handleExport} disabled={!hasResult}>
                Export JSON
              </button>
            </div>
            <p className="shortcut-hint">Shortcuts: Ctrl/Cmd + Enter to run, Ctrl/Cmd + K to clear.</p>
          </form>
          {isSubmitting && <p className="loading-phase">{loadingPhase}</p>}
          {error && <p className="error">{error}</p>}
        </section>

        <section className="panel output-panel">
          <h2>Structured Result</h2>
          {!result && <p>No result yet. Submit data to render analysis.</p>}

          {result && (
            <>
              <div className="summary-grid">
                <div className="stat stat-green">
                  <span className="label">Components</span>
                  <strong>{result.summary.components}</strong>
                </div>
                <div className="stat stat-red">
                  <span className="label">Cycles</span>
                  <strong>{result.summary.cyclicComponents}</strong>
                </div>
                <div className="stat stat-blue">
                  <span className="label">Accepted Edges</span>
                  <strong>{result.summary.acceptedEdges}</strong>
                </div>
                <div className="stat stat-amber">
                  <span className="label">Processing Time</span>
                  <strong>{result._meta.processing_time_ms} ms</strong>
                </div>
              </div>

              <details className="diag-card">
                <summary>Invalid Entries ({result.invalid_entries.length})</summary>
                {result.invalid_entries.length === 0 ? (
                  <p className="empty-note">No invalid entries detected.</p>
                ) : (
                  <ul className="diag-list">
                    {result.invalid_entries.map((entry) => (
                      <li key={`${entry.index}-${String(entry.value)}`}>
                        index {entry.index}: <code>{JSON.stringify(entry.value)}</code> ({entry.reason})
                      </li>
                    ))}
                  </ul>
                )}
              </details>

              <details className="diag-card">
                <summary>Duplicate Edges ({result.duplicate_edges.length})</summary>
                {result.duplicate_edges.length === 0 ? (
                  <p className="empty-note">No duplicates found.</p>
                ) : (
                  <ul className="diag-list">
                    {result.duplicate_edges.map((edge) => (
                      <li key={`${edge.edge}-${edge.duplicateIndex}`}>
                        <code>{edge.edge}</code> first at index {edge.firstIndex}, repeated at {edge.duplicateIndex}
                      </li>
                    ))}
                  </ul>
                )}
              </details>

              <details className="diag-card">
                <summary>Multi-Parent Drops ({result.dropped_multi_parent_edges.length})</summary>
                {result.dropped_multi_parent_edges.length === 0 ? (
                  <p className="empty-note">No multi-parent conflict drops.</p>
                ) : (
                  <ul className="diag-list">
                    {result.dropped_multi_parent_edges.map((entry) => (
                      <li key={`${entry.edge}-${entry.index}`}>
                        dropped <code>{entry.edge}</code>, kept <code>{entry.keptParent}-&gt;{entry.child}</code>
                      </li>
                    ))}
                  </ul>
                )}
              </details>

              <div className="component-list">
                {result.hierarchies.map((component) => (
                  <article key={component.componentId} className={component.isCycle ? "component cycle" : "component"}>
                    <h3>{component.componentId}</h3>
                    <p>
                      Root: <b>{component.primaryRoot ?? "None"}</b> | Depth: <b>{component.depth}</b>
                    </p>
                    {component.isCycle && (
                      <p className="cycle-note">
                        Cycle detected: <code>{component.cyclePath.join(" -> ")}</code>
                      </p>
                    )}
                    <ul className="tree-root">
                      {component.hierarchy.map((node, idx) => (
                        <TreeNodeView key={node.value} node={node} depth={0} siblingIndex={idx} />
                      ))}
                    </ul>
                  </article>
                ))}
              </div>

              <div className="raw-header">
                <h3>Raw JSON</h3>
                <button type="button" className="copy-btn" onClick={handleCopyJson} disabled={!hasResult}>
                  <ClipboardIcon /> {copyState === "idle" ? "Copy JSON" : copyState === "done" ? "Copied" : "Copy failed"}
                </button>
              </div>
              <pre>{prettyJson}</pre>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
