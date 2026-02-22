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
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Email } from "@/lib/types";
import { EmailNode, type EmailNodeData } from "./EmailNode";

const COLS = 10;
const NODE_WIDTH = 640;
const NODE_HEIGHT_CARD = 960;
const NODE_HEIGHT_FULL = 3600;
const GAP_X = 24;
const GAP_Y = 300;
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

  const [lockDrag, setLockDrag] = useState(false);
  const [showFullEmail, setShowFullEmail] = useState(false);

  const initialNodes: Node<EmailNodeData>[] = useMemo(() => {
    const rowHeight = NODE_HEIGHT_CARD + GAP_Y;
    return emails.map((email, index) => {
      const defaultX = (index % COLS) * (NODE_WIDTH + GAP_X);
      const defaultY = Math.floor(index / COLS) * rowHeight;
      const saved = savedState?.positions?.[email.id];
      return {
        id: email.id,
        type: "email",
        position: saved ?? { x: defaultX, y: defaultY },
        data: {
          email,
          onOpen: () => onEmailClick(index),
          width: NODE_WIDTH,
          showFullEmail: false,
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
  const reactFlowRef = useRef<ReactFlowInstance<
    Node<EmailNodeData>,
    Edge
  > | null>(null);
  const prevShowFullEmailRef = useRef(showFullEmail);

  useEffect(() => {
    const rowHeightCard = NODE_HEIGHT_CARD + GAP_Y;
    const rowHeightFull = NODE_HEIGHT_FULL + GAP_Y;
    const stepX = NODE_WIDTH + GAP_X;
    const didToggle = prevShowFullEmailRef.current !== showFullEmail;
    prevShowFullEmailRef.current = showFullEmail;

    setNodes(
      initialNodes.map((n, index) => {
        const col = index % COLS;
        const row = Math.floor(index / COLS);
        const gridPositionCard = {
          x: col * stepX,
          y: row * rowHeightCard,
        };
        const gridPositionFull = {
          x: col * stepX,
          y: row * rowHeightFull,
        };
        const position = showFullEmail
          ? gridPositionFull
          : didToggle
            ? gridPositionCard
            : savedState?.positions?.[n.id] ?? gridPositionCard;
        return {
          ...n,
          position,
          draggable: !lockDrag,
          data: { ...n.data, showFullEmail },
        };
      })
    );
    setEdges(initialEdges);
  }, [
    initialNodes,
    initialEdges,
    lockDrag,
    showFullEmail,
    savedState?.positions,
    setNodes,
    setEdges,
  ]);

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

  const handleResetPositions = useCallback(() => {
    const rowHeight =
      (showFullEmail ? NODE_HEIGHT_FULL : NODE_HEIGHT_CARD) + GAP_Y;
    setNodes((prev) =>
      prev.map((node, index) => {
        const col = index % COLS;
        const row = Math.floor(index / COLS);
        return {
          ...node,
          position: {
            x: col * (NODE_WIDTH + GAP_X),
            y: row * rowHeight,
          },
        };
      })
    );
    setTimeout(() => reactFlowRef.current?.fitView({ padding: 0.2 }), 100);
  }, [showFullEmail, setNodes]);

  if (emails.length === 0) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        No emails found for this campaign.
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="flex items-center gap-4 px-1">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={lockDrag}
            onChange={(e) => setLockDrag(e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-slate-700">
            Lock drag
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showFullEmail}
            onChange={(e) => setShowFullEmail(e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-slate-700">
            Show full email
          </span>
        </label>
        <button
          type="button"
          onClick={handleResetPositions}
          className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        >
          Reset
        </button>
      </div>
      <div className="w-full h-[calc(100vh-320px)] min-h-[500px] bg-slate-100/50 rounded-lg overflow-hidden">
        <ReactFlow
        onInit={(instance) => {
          reactFlowRef.current = instance;
        }}
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
        nodesDraggable={!lockDrag}
        className="bg-slate-100/50"
        />
      </div>
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
