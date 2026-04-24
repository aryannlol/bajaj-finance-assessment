import { EdgeConflictResolver } from "../domain/graph/EdgeConflictResolver.js";
import { HierarchyGraphAnalyzer } from "../domain/graph/HierarchyGraphAnalyzer.js";
import { ProcessHierarchyResponse } from "../domain/models/types.js";
import { HierarchyEdgeParser } from "../domain/validators/HierarchyEdgeParser.js";

const identity = {
  user_id: process.env.BFHL_USER_ID ?? "aryanmandlik_01012006",
  email: process.env.BFHL_EMAIL ?? "am8866@srmist.edu.in",
  roll_number: process.env.BFHL_ROLL_NUMBER ?? "RA2311003012259"
};

export class HierarchyProcessor {
  private readonly parser = new HierarchyEdgeParser();
  private readonly resolver = new EdgeConflictResolver();
  private readonly analyzer = new HierarchyGraphAnalyzer();

  run(rawEntries: unknown[]): ProcessHierarchyResponse {
    const startedAt = Date.now();

    const { validEdges, invalidEntries } = this.parser.parseEntries(rawEntries);
    const { deduplicated, duplicates } = this.resolver.removeDuplicates(validEdges);
    const { accepted, dropped } = this.resolver.enforceSingleParent(deduplicated);
    const hierarchies = this.analyzer.analyzeComponents(accepted);

    const cyclicComponents = hierarchies.filter((component) => component.isCycle).length;

    return {
      is_success: true,
      ...identity,
      hierarchies,
      invalid_entries: invalidEntries,
      duplicate_edges: duplicates,
      dropped_multi_parent_edges: dropped,
      summary: {
        totalInputEntries: rawEntries.length,
        validEdges: validEdges.length,
        invalidEntries: invalidEntries.length,
        duplicateEdges: duplicates.length,
        acceptedEdges: accepted.length,
        droppedByMultiParentRule: dropped.length,
        components: hierarchies.length,
        cyclicComponents,
        acyclicComponents: hierarchies.length - cyclicComponents
      },
      _meta: {
        processing_time_ms: Date.now() - startedAt,
        generated_at: new Date().toISOString()
      }
    };
  }
}
