"use client";

import {
  Background,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const initialNodes: any[] = [];
const initialEdges: any[] = [];

export default function FlowPreview() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1.5} color="var(--border)" />
        <Controls className="!bg-background !border-border !shadow-sm [&_button]:!bg-background [&_button]:!border-border [&_button]:!text-foreground [&_button:hover]:!bg-muted" />
      </ReactFlow>
    </div>
  );
}
