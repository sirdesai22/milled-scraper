"use client";

import { useEffect, useMemo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Email } from "@/lib/types";
import { EmailNode, type EmailNodeData } from "./EmailNode";

const NODE_WIDTH = 420;
const NODE_HEIGHT = 720;
const GAP_X = 40;
const GAP_Y = 40;

const nodeTypes = { email: EmailNode } as NodeTypes;

interface EmailFlowCanvasProps {
  emails: Email[];
  onEmailClick: (index: number) => void;
}

function EmailFlowCanvasInner({ emails, onEmailClick }: EmailFlowCanvasProps) {
  const initialNodes: Node<EmailNodeData>[] = useMemo(() => {
    return emails.map((email, index) => {
      const col = index % 10;
      const row = Math.floor(index / 10);
      return {
        id: email.id,
        type: "email",
        position: {
          x: col * (NODE_WIDTH + GAP_X),
          y: row * (NODE_HEIGHT + GAP_Y),
        },
        data: {
          email,
          onOpen: () => onEmailClick(index),
        },
        draggable: true,
        dragHandle: ".email-node-drag-handle",
      };
    });
  }, [emails, onEmailClick]);

  const initialEdges: Edge[] = useMemo(() => [], []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  if (emails.length === 0) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        No emails found for this campaign.
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-280px)] min-h-[500px] bg-slate-100/50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        proOptions={{ hideAttribution: true }}
        className="bg-slate-100/50"
      />
    </div>
  );
}

export function EmailFlowCanvas(props: EmailFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <EmailFlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
