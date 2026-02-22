"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  PanOnScrollMode,
  type Node,
  type Edge,
  type NodeTypes,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Email } from "@/lib/types";
import { EmailNode, type EmailNodeData } from "./EmailNode";

const COLS = 10;
const NODE_WIDTH = 640;
const NODE_HEIGHT = 960;
const GAP_X = 24;
const GAP_Y = 40;
const STORAGE_KEY_PREFIX = "report_emails_canvas_";
const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 0.8 };

interface SavedCanvasState {
  positions: Record<string, { x: number; y: number }>;
  viewport?: Viewport;
}

function loadCanvasState(jobId: string): SavedCanvasState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + jobId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedCanvasState;
    return parsed?.positions ? parsed : null;
  } catch {
    return null;
  }
}

function saveCanvasState(jobId: string, state: SavedCanvasState): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + jobId, JSON.stringify(state));
  } catch {
    // ignore
  }
}

const nodeTypes = { email: EmailNode } as NodeTypes;

interface EmailFlowCanvasProps {
  jobId: string;
  emails: Email[];
  onEmailClick: (index: number) => void;
}

function EmailFlowCanvasInner({
  jobId,
  emails,
  onEmailClick,
}: EmailFlowCanvasProps) {
  const savedState = useMemo(
    () => loadCanvasState(jobId),
    [jobId]
  );

  const initialNodes: Node<EmailNodeData>[] = useMemo(() => {
    return emails.map((email, index) => {
      const defaultX = (index % COLS) * (NODE_WIDTH + GAP_X);
      const defaultY = Math.floor(index / COLS) * (NODE_HEIGHT + GAP_Y);
      const saved = savedState?.positions?.[email.id];
      return {
        id: email.id,
        type: "email",
        position: saved ?? { x: defaultX, y: defaultY },
        data: {
          email,
          onOpen: () => onEmailClick(index),
          width: NODE_WIDTH,
        },
        draggable: true,
        dragHandle: ".email-node-drag-handle",
      };
    });
  }, [emails, onEmailClick, savedState]);

  const initialViewport = useMemo(
    () => savedState?.viewport ?? DEFAULT_VIEWPORT,
    [savedState]
  );

  const initialEdges: Edge[] = useMemo(() => [], []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [viewport, setViewport] = useState<Viewport>(initialViewport);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveState = useCallback(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n) => {
      positions[n.id] = n.position;
    });
    saveCanvasState(jobId, { positions, viewport });
  }, [jobId, nodes, viewport]);

  useEffect(() => {
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => {
      saveDebounceRef.current = null;
      saveState();
    }, 400);
    return () => {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    };
  }, [nodes, viewport, saveState]);

  const onViewportChange = useCallback((vp: Viewport) => {
    setViewport(vp);
  }, []);

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
        onViewportChange={onViewportChange}
        viewport={viewport}
        nodeTypes={nodeTypes}
        fitView={!savedState}
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.5}
        defaultViewport={initialViewport}
        proOptions={{ hideAttribution: true }}
        zoomOnScroll={false}
        zoomOnPinch={true}
        panOnScroll={true}
        panOnScrollMode={PanOnScrollMode.Free}
        className="bg-slate-100/50"
      />
    </div>
  );
}

export function EmailFlowCanvas({
  jobId,
  emails,
  onEmailClick,
}: EmailFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <EmailFlowCanvasInner
        jobId={jobId}
        emails={emails}
        onEmailClick={onEmailClick}
      />
    </ReactFlowProvider>
  );
}
