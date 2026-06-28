"use client";

import { useEffect, useState, useRef } from "react";
import { Network as NetworkIcon, Zap, Layers, Activity } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function LifeGraphPage() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<any>(null);

  useEffect(() => {
    fetchGraphData();
  }, []);

  const fetchGraphData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/graph");
      if (!res.ok) throw new Error("Failed to fetch graph data");
      const data = await res.json();
      setGraphData(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load graph data");
    } finally {
      setLoading(false);
    }
  };

  const handleClearGraph = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/graph/clear", { method: "POST" });
      if (!res.ok) throw new Error("Failed to clear graph");
      toast.success("Graph cleared successfully!");
      setGraphData({ nodes: [], links: [] });
    } catch (err) {
      console.error(err);
      toast.error("Failed to clear graph");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current || graphData.nodes.length === 0) return;

    let networkInstance: any = null;

    // Dynamically import vis-network to prevent SSR issues
    import("vis-network").then(({ Network }) => {
      if (!containerRef.current) return;

      // Map raw nodes/links to Vis-Network format
      const visNodes = graphData.nodes.map((node: any) => {
        let color = "#8892b0"; // Default muted gray
        let size = 15;

        if (node.label === "USER") {
          color = "#c678dd"; // Purple
          size = 25;
        } else if (node.label === "SKILL") {
          color = "#61afef"; // Blue
          size = 18;
        } else if (node.label === "TASK") {
          color = "#98c379"; // Green
          size = 18;
        } else if (node.label === "DOCUMENT") {
          color = "#e5c07b"; // Yellow
          size = 18;
        } else if (node.label === "PREFERS") {
          color = "#e06c75"; // Red
          size = 18;
        }

        return {
          id: node.id,
          label: node.name || node.id,
          shape: "dot",
          size: size,
          color: {
            background: color,
            border: color,
            highlight: {
              background: color,
              border: "#3f3f46", // zinc-700 border on highlight
            },
            hover: {
              background: color,
              border: "#27272a",
            }
          },
          font: {
            color: "#262626", // Neutral-800
            size: 12,
            face: "Inter, sans-serif",
            vadjust: 6, // vertical adjustment to put label below
          },
          shadow: {
            enabled: true,
            color: "rgba(0,0,0,0.1)",
            size: 5,
            x: 2,
            y: 2,
          }
        };
      });

      const visEdges = graphData.links.map((link: any) => ({
        from: link.source,
        to: link.target,
        label: link.label || "",
        font: {
          color: "#737373", // Neutral-500
          size: 10,
          align: "top",
          face: "Inter, sans-serif",
          strokeWidth: 2,
          strokeColor: "#f5f5f5", // neutral-100 bg backdrop for edge label
        },
        color: {
          color: "rgba(0, 0, 0, 0.15)",
          highlight: "#a855f7", // Purple-500 on highlight
          hover: "#a855f7",
        },
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 0.6,
          },
        },
        width: 1.5,
        smooth: {
          type: "continuous",
        }
      }));

      const data = {
        nodes: visNodes,
        edges: visEdges,
      };

      const options = {
        physics: {
          solver: "forceAtlas2Based",
          forceAtlas2Based: {
            gravitationalConstant: -100,
            centralGravity: 0.02,
            springLength: 120,
            springConstant: 0.05,
            damping: 0.4,
            avoidOverlap: 0.8,
          },
          stabilization: {
            enabled: true,
            iterations: 200,
            fit: true,
          },
        },
        interaction: {
          dragNodes: true,
          dragView: true,
          zoomView: true,
          hover: true,
          navigationButtons: false,
          keyboard: false,
        },
      };

      networkInstance = new Network(containerRef.current, data, options);
      networkRef.current = networkInstance;
    });

    return () => {
      if (networkInstance) {
        networkInstance.destroy();
      }
    };
  }, [graphData]);

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] w-full max-w-7xl mx-auto pr-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <NetworkIcon className="text-purple-500" /> Life Graph
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            An interactive visualization of your personalized knowledge graph.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex gap-4 text-xs font-mono text-muted-foreground bg-secondary/30 px-3 py-1.5 rounded-md border mr-2">
            <span className="flex items-center gap-1">
              <Layers size={14} /> Nodes: {graphData.nodes.length}
            </span>
            <span className="flex items-center gap-1">
              <Activity size={14} /> Links: {graphData.links.length}
            </span>
          </div>
          <Button
            onClick={fetchGraphData}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={loading}
          >
            <Zap size={14} /> Refresh
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                disabled={loading}
              >
                Clear Graph
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will permanently delete all nodes and relationships from your personalized knowledge graph. The system will rebuild it automatically via chat memory and nightly sync tasks.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearGraph} className="bg-destructive hover:bg-destructive/95 text-destructive-foreground">
                  Clear Graph
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Graph Container */}
      <div className="flex-1 w-full border rounded-xl overflow-hidden relative shadow-sm bg-neutral-100">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        )}

        {/* Floating Legend Overlay */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/90 border border-neutral-200 backdrop-blur-md p-3.5 rounded-lg text-xs flex flex-col gap-2.5 pointer-events-none shadow-xl text-neutral-700">
          <div className="font-semibold text-neutral-900 mb-1 border-b pb-1.5 border-neutral-200">
            Legend
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shadow-[0_0_8px_#c678dd] bg-[#c678dd]"></div>{" "}
            <span>User</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#61afef]"></div>{" "}
            <span>Skills / Tech</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#98c379]"></div>{" "}
            <span>Tasks / Goals</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#e5c07b]"></div>{" "}
            <span>Documents</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#8892b0]"></div>{" "}
            <span>Other Facts</span>
          </div>
        </div>

        {/* The Graph Canvas container */}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
