import { HierarchyNode } from "../lib/types";
import { CSSProperties } from "react";

interface Props {
  node: HierarchyNode;
  depth?: number;
  hasParent?: boolean;
  siblingIndex?: number;
}

export function TreeNodeView({ node, depth = 0, hasParent = false, siblingIndex = 0 }: Props) {
  const nodeStyle = {
    "--depth": String(depth),
    "--delay": `${depth * 90 + siblingIndex * 65}ms`
  } as CSSProperties;

  return (
    <li className={hasParent ? "tree-node has-parent" : "tree-node"} style={nodeStyle}>
      <div className="tree-label">{node.value}</div>
      {node.children.length > 0 && (
        <ul className="tree-children">
          {node.children.map((child, idx) => (
            <TreeNodeView
              key={`${node.value}-${child.value}`}
              node={child}
              depth={depth + 1}
              hasParent
              siblingIndex={idx}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
