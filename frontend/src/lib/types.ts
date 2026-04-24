export interface HierarchyNode {
  value: string;
  children: HierarchyNode[];
}

export interface ComponentReport {
  componentId: string;
  nodes: string[];
  edges: string[];
  isCycle: boolean;
  cyclePath: string[];
  roots: string[];
  primaryRoot: string | null;
  depth: number;
  hierarchy: HierarchyNode[];
}

export interface ApiResponse {
  is_success: boolean;
  user_id: string;
  email: string;
  roll_number: string;
  hierarchies: ComponentReport[];
  invalid_entries: Array<{ index: number; value: unknown; reason: string }>;
  duplicate_edges: Array<{ edge: string; firstIndex: number; duplicateIndex: number }>;
  dropped_multi_parent_edges: Array<{
    child: string;
    keptParent: string;
    droppedParent: string;
    edge: string;
    index: number;
  }>;
  summary: {
    totalInputEntries: number;
    validEdges: number;
    invalidEntries: number;
    duplicateEdges: number;
    acceptedEdges: number;
    droppedByMultiParentRule: number;
    components: number;
    cyclicComponents: number;
    acyclicComponents: number;
  };
  _meta: {
    processing_time_ms: number;
    generated_at: string;
  };
}
