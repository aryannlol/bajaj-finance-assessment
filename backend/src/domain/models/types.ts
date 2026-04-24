export type EdgeString = `${string}->${string}`;

export interface ParsedEdge {
  edge: EdgeString;
  parent: string;
  child: string;
  sourceIndex: number;
  sourceValue: string;
}

export interface InvalidEntry {
  index: number;
  value: unknown;
  reason: "not_string" | "invalid_format" | "self_loop";
}

export interface DuplicateEntry {
  edge: EdgeString;
  firstIndex: number;
  duplicateIndex: number;
}

export interface MultiParentDrop {
  child: string;
  keptParent: string;
  droppedParent: string;
  edge: EdgeString;
  index: number;
}

export interface HierarchyNode {
  value: string;
  children: HierarchyNode[];
}

export interface ComponentReport {
  componentId: string;
  nodes: string[];
  edges: EdgeString[];
  isCycle: boolean;
  cyclePath: string[];
  roots: string[];
  primaryRoot: string | null;
  depth: number;
  hierarchy: HierarchyNode[];
}

export interface ProcessSummary {
  totalInputEntries: number;
  validEdges: number;
  invalidEntries: number;
  duplicateEdges: number;
  acceptedEdges: number;
  droppedByMultiParentRule: number;
  components: number;
  cyclicComponents: number;
  acyclicComponents: number;
}

export interface ProcessHierarchyResponse {
  is_success: boolean;
  user_id: string;
  email: string;
  roll_number: string;
  hierarchies: ComponentReport[];
  invalid_entries: InvalidEntry[];
  duplicate_edges: DuplicateEntry[];
  dropped_multi_parent_edges: MultiParentDrop[];
  summary: ProcessSummary;
  _meta: {
    processing_time_ms: number;
    generated_at: string;
  };
}
