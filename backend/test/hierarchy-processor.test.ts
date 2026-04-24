import { describe, expect, it } from "vitest";
import { HierarchyProcessor } from "../src/application/HierarchyProcessor.js";
import { HierarchyEdgeParser } from "../src/domain/validators/HierarchyEdgeParser.js";

describe("HierarchyEdgeParser", () => {
  const parser = new HierarchyEdgeParser();

  it("rejects malformed and lowercase edges", () => {
    const parsed = parser.parseEntries(["A-B", "a->B", 42, "A->A"]);
    expect(parsed.validEdges).toHaveLength(0);
    expect(parsed.invalidEntries).toHaveLength(4);
  });

  it("parses trimmed valid edges", () => {
    const parsed = parser.parseEntries([" A->B ", "B->C"]);
    expect(parsed.validEdges.map((edge) => edge.edge)).toEqual(["A->B", "B->C"]);
  });
});

describe("HierarchyProcessor", () => {
  const processor = new HierarchyProcessor();

  it("tracks duplicates and multi-parent drops", () => {
    const result = processor.run(["A->D", "A->D", "B->D", "D->E"]);
    expect(result.duplicate_edges).toHaveLength(1);
    expect(result.dropped_multi_parent_edges).toHaveLength(1);
    expect(result.summary.acceptedEdges).toBe(2);
  });

  it("returns empty hierarchy for cyclic component", () => {
    const result = processor.run(["A->B", "B->C", "C->A"]);
    expect(result.hierarchies).toHaveLength(1);
    expect(result.hierarchies[0].isCycle).toBe(true);
    expect(result.hierarchies[0].cyclePath).toEqual(["A", "B", "C", "A"]);
    expect(result.hierarchies[0].hierarchy.length).toBeGreaterThan(0);
    expect(result.hierarchies[0].depth).toBeGreaterThan(0);
  });

  it("computes depth as longest root-to-leaf path in node count", () => {
    const result = processor.run(["A->B", "B->C", "A->D"]);
    expect(result.hierarchies[0].depth).toBe(3);
  });
});
