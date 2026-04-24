import { DuplicateEntry, MultiParentDrop, ParsedEdge } from "../models/types.js";

export class EdgeConflictResolver {
  removeDuplicates(edges: ParsedEdge[]): { deduplicated: ParsedEdge[]; duplicates: DuplicateEntry[] } {
    const seen = new Map<string, number>();
    const deduplicated: ParsedEdge[] = [];
    const duplicates: DuplicateEntry[] = [];

    for (const edge of edges) {
      const firstIndex = seen.get(edge.edge);
      if (firstIndex === undefined) {
        seen.set(edge.edge, edge.sourceIndex);
        deduplicated.push(edge);
      } else {
        duplicates.push({
          edge: edge.edge,
          firstIndex,
          duplicateIndex: edge.sourceIndex
        });
      }
    }

    return { deduplicated, duplicates };
  }

  enforceSingleParent(edges: ParsedEdge[]): { accepted: ParsedEdge[]; dropped: MultiParentDrop[] } {
    const childToParent = new Map<string, string>();
    const accepted: ParsedEdge[] = [];
    const dropped: MultiParentDrop[] = [];

    for (const edge of edges) {
      const existingParent = childToParent.get(edge.child);
      if (!existingParent) {
        childToParent.set(edge.child, edge.parent);
        accepted.push(edge);
        continue;
      }

      if (existingParent !== edge.parent) {
        dropped.push({
          child: edge.child,
          keptParent: existingParent,
          droppedParent: edge.parent,
          edge: edge.edge,
          index: edge.sourceIndex
        });
      }
    }

    return { accepted, dropped };
  }
}

