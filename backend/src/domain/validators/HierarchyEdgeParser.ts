import { InvalidEntry, ParsedEdge } from "../models/types.js";

const EDGE_PATTERN = /^([A-Z]+)->([A-Z]+)$/;

export class HierarchyEdgeParser {
  parseEntries(rawEntries: unknown[]): { validEdges: ParsedEdge[]; invalidEntries: InvalidEntry[] } {
    const validEdges: ParsedEdge[] = [];
    const invalidEntries: InvalidEntry[] = [];

    rawEntries.forEach((entry, index) => {
      if (typeof entry !== "string") {
        invalidEntries.push({ index, value: entry, reason: "not_string" });
        return;
      }

      const normalized = entry.trim();
      const match = EDGE_PATTERN.exec(normalized);
      if (!match) {
        invalidEntries.push({ index, value: entry, reason: "invalid_format" });
        return;
      }

      const parent = match[1];
      const child = match[2];
      if (parent === child) {
        invalidEntries.push({ index, value: entry, reason: "self_loop" });
        return;
      }

      validEdges.push({
        edge: `${parent}->${child}`,
        parent,
        child,
        sourceIndex: index,
        sourceValue: entry
      });
    });

    return { validEdges, invalidEntries };
  }
}

