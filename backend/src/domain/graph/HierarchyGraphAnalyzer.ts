import { ComponentReport, HierarchyNode, ParsedEdge } from "../models/types.js";

type GraphAdjacency = Map<string, string[]>;

interface GraphBundle {
  directedChildren: GraphAdjacency;
  undirectedLinks: GraphAdjacency;
  allNodes: Set<string>;
  allEdges: ParsedEdge[];
}

interface CycleDetectionResult {
  hasCycle: boolean;
  cyclePath: string[];
}

export class HierarchyGraphAnalyzer {
  analyzeComponents(edges: ParsedEdge[]): ComponentReport[] {
    const graph = this.buildGraphs(edges);
    const components = this.findUndirectedComponents(graph.undirectedLinks, graph.allNodes);
    return components.map((nodes, idx) => this.buildComponentReport(nodes, graph, idx + 1));
  }

  private buildGraphs(edges: ParsedEdge[]): GraphBundle {
    const directedChildren = new Map<string, string[]>();
    const undirectedLinks = new Map<string, string[]>();
    const allNodes = new Set<string>();

    for (const edge of edges) {
      allNodes.add(edge.parent);
      allNodes.add(edge.child);

      this.pushMapValue(directedChildren, edge.parent, edge.child);
      if (!directedChildren.has(edge.child)) {
        directedChildren.set(edge.child, []);
      }

      this.pushMapValue(undirectedLinks, edge.parent, edge.child);
      this.pushMapValue(undirectedLinks, edge.child, edge.parent);
    }

    return { directedChildren, undirectedLinks, allNodes, allEdges: edges };
  }

  private findUndirectedComponents(undirectedLinks: GraphAdjacency, allNodes: Set<string>): string[][] {
    const visited = new Set<string>();
    const components: string[][] = [];

    for (const node of allNodes) {
      if (visited.has(node)) {
        continue;
      }

      const stack = [node];
      const component: string[] = [];
      visited.add(node);

      while (stack.length > 0) {
        const current = stack.pop()!;
        component.push(current);
        for (const neighbor of undirectedLinks.get(current) ?? []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            stack.push(neighbor);
          }
        }
      }

      components.push(component.sort());
    }

    return components.sort((a, b) => a[0].localeCompare(b[0]));
  }

  private buildComponentReport(nodes: string[], graph: GraphBundle, componentNumber: number): ComponentReport {
    const nodeSet = new Set(nodes);
    const componentEdges = graph.allEdges
      .filter((edge) => nodeSet.has(edge.parent) && nodeSet.has(edge.child))
      .map((edge) => edge.edge);

    const roots = this.findRoots(nodes, graph.allEdges);
    const cycleResult = this.detectCycle(nodes, graph.directedChildren);
    const isCycle = cycleResult.hasCycle;
    const fallbackRoot = roots[0] ?? nodes.slice().sort()[0] ?? null;

    if (isCycle) {
      const previewRoots = fallbackRoot ? [fallbackRoot] : [];
      const previewHierarchy = previewRoots.map((root) =>
        this.buildHierarchyNodeCycleAware(root, graph.directedChildren, new Set<string>())
      );
      const previewDepth = previewHierarchy.reduce(
        (maxDepth, rootNode) => Math.max(maxDepth, this.measureDepth(rootNode)),
        0
      );

      return {
        componentId: `component_${componentNumber}`,
        nodes: nodes.slice().sort(),
        edges: componentEdges,
        isCycle: true,
        cyclePath: cycleResult.cyclePath,
        roots,
        primaryRoot: fallbackRoot,
        depth: previewDepth,
        hierarchy: previewHierarchy
      };
    }

    const hierarchyRoots = roots.length > 0 ? roots : fallbackRoot ? [fallbackRoot] : [];
    const hierarchy = hierarchyRoots.map((root) => this.buildHierarchyNode(root, graph.directedChildren));
    const depth = hierarchy.reduce((maxDepth, rootNode) => Math.max(maxDepth, this.measureDepth(rootNode)), 0);

    return {
      componentId: `component_${componentNumber}`,
      nodes: nodes.slice().sort(),
      edges: componentEdges,
      isCycle: false,
      cyclePath: [],
      roots,
      primaryRoot: hierarchyRoots[0] ?? null,
      depth,
      hierarchy
    };
  }

  private findRoots(nodes: string[], edges: ParsedEdge[]): string[] {
    const nodeSet = new Set(nodes);
    const children = new Set(edges.filter((edge) => nodeSet.has(edge.child)).map((edge) => edge.child));
    return nodes.filter((node) => !children.has(node)).sort();
  }

  private detectCycle(nodes: string[], directedChildren: GraphAdjacency): CycleDetectionResult {
    const nodeSet = new Set(nodes);
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const stack: string[] = [];

    const dfs = (node: string): string[] | null => {
      if (visiting.has(node)) {
        const loopStartIndex = stack.indexOf(node);
        if (loopStartIndex >= 0) {
          return [...stack.slice(loopStartIndex), node];
        }
        return [node, node];
      }
      if (visited.has(node)) {
        return null;
      }

      visiting.add(node);
      stack.push(node);
      for (const child of directedChildren.get(node) ?? []) {
        if (!nodeSet.has(child)) {
          continue;
        }
        const detectedPath = dfs(child);
        if (detectedPath) {
          return detectedPath;
        }
      }
      visiting.delete(node);
      stack.pop();
      visited.add(node);
      return null;
    };

    for (const node of nodes) {
      if (!visited.has(node)) {
        const cyclePath = dfs(node);
        if (cyclePath) {
          return { hasCycle: true, cyclePath };
        }
      }
    }

    return { hasCycle: false, cyclePath: [] };
  }

  private buildHierarchyNode(node: string, directedChildren: GraphAdjacency): HierarchyNode {
    const children = (directedChildren.get(node) ?? [])
      .slice()
      .sort()
      .map((child) => this.buildHierarchyNode(child, directedChildren));
    return { value: node, children };
  }

  private buildHierarchyNodeCycleAware(
    node: string,
    directedChildren: GraphAdjacency,
    currentPath: Set<string>
  ): HierarchyNode {
    const pathWithCurrent = new Set(currentPath);
    pathWithCurrent.add(node);

    const children = (directedChildren.get(node) ?? []).slice().sort().map((child) => {
      if (pathWithCurrent.has(child)) {
        return { value: `${child} (cycle)`, children: [] };
      }
      return this.buildHierarchyNodeCycleAware(child, directedChildren, pathWithCurrent);
    });

    return { value: node, children };
  }

  private measureDepth(node: HierarchyNode): number {
    if (node.children.length === 0) {
      return 1;
    }
    return 1 + Math.max(...node.children.map((child) => this.measureDepth(child)));
  }

  private pushMapValue(map: Map<string, string[]>, key: string, value: string): void {
    const current = map.get(key);
    if (current) {
      current.push(value);
      return;
    }
    map.set(key, [value]);
  }
}
