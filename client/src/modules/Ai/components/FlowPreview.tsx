"use client";

import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
} from "@xyflow/react";
import { Button } from "@/components/ui/button";
import "@xyflow/react/dist/style.css";
import {
  ArrowRight,
  Brain,
  CheckCircle,
  FileText,
  Play,
  RefreshCw,
  Share2,
  Sparkles,
  Workflow,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { connectorIcons } from "@/lib/static";

interface FlowPreviewProps {
  onSelectSuggestion?: (prompt: string, apps: string[]) => void;
  nodes?: any[];
  edges?: any[];
}

const recipes = [
  {
    title: "AI Model Research & Email",
    description:
      "Research OpenAI's latest models, create DOCX report, send to email",
    prompt:
      "research about open ai latest models , create docx , send to email",
    icon: FileText,
    colorClass: "text-indigo-500",
    bgClass:
      "bg-indigo-500/10 group-hover:bg-indigo-500/20 border-indigo-500/20",
    apps: ["Google Docs", "Gmail"],
  },
  {
    title: "Carbon Footprint Syndication",
    description: "Research about carbon footprints -> post to slack and reddit",
    prompt: "research about carbon footprints -> post to slack and reddit.",
    icon: Share2,
    colorClass: "text-rose-500",
    bgClass: "bg-rose-500/10 group-hover:bg-rose-500/20 border-rose-500/20",
    apps: ["Slack", "Reddit"],
  },
  {
    title: "Asana & Slack Sync",
    description: "When task is done -> update in asana -> message in slack",
    prompt: "when task is done -> update in asana -> message in slack.",
    icon: Workflow,
    colorClass: "text-emerald-500",
    bgClass:
      "bg-emerald-500/10 group-hover:bg-emerald-500/20 border-emerald-500/20",
    apps: ["Asana", "Slack"],
  },
  {
    title: "Slack & Todoist Sync",
    description: "When task completes -> update in slack -> update in todoist",
    prompt: "Task x completes, update in slack, update in todoist",
    icon: CheckCircle,
    colorClass: "text-amber-500",
    bgClass: "bg-amber-500/10 group-hover:bg-amber-500/20 border-amber-500/20",
    apps: ["Slack", "Todoist"],
  },
  {
    title: "Linear & Email Automation",
    description:
      "Task x in-progress -> Linear update -> Email -> Message in Slack",
    prompt: "task x in-progress -> linear update - email - message in slack",
    icon: Sparkles,
    colorClass: "text-blue-500",
    bgClass: "bg-blue-500/10 group-hover:bg-blue-500/20 border-blue-500/20",
    apps: ["Linear", "Gmail", "Slack"],
  },
  {
    title: "Monthly Activity Summary",
    description:
      "Summarize about my last 1 month activity -> create doc in Google Doc -> email.",
    prompt:
      "summarize about my last 1 month activity - create doc -> gogole doc - email.",
    icon: FileText,
    colorClass: "text-purple-500",
    bgClass:
      "bg-purple-500/10 group-hover:bg-purple-500/20 border-purple-500/20",
    apps: ["Google Docs", "Gmail"],
  },
];

// Helper to look up the correct connector icon
const getAppIcon = (slug: string): string => {
  const lower = slug.toLowerCase();
  if (lower.includes("gmail")) return connectorIcons["Gmail"] || "/logo.svg";
  if (lower.includes("slack")) return connectorIcons["Slack"] || "/logo.svg";
  if (lower.includes("github")) return connectorIcons["GitHub"] || "/logo.svg";
  if (lower.includes("reddit")) return connectorIcons["Reddit"] || "/logo.svg";
  if (lower.includes("calendar"))
    return connectorIcons["Calendar"] || "/logo.svg";
  if (lower.includes("linkedin"))
    return connectorIcons["LinkedIn"] || "/logo.svg";
  if (lower.includes("meet"))
    return connectorIcons["Google Meet"] || "/logo.svg";
  if (lower.includes("todoist"))
    return connectorIcons["Todoist"] || "/logo.svg";
  if (lower.includes("attio")) return connectorIcons["Attio"] || "/logo.svg";
  if (lower.includes("hacker_news") || lower.includes("hackernews"))
    return connectorIcons["Hacker News"] || "/logo.svg";
  if (lower.includes("hubspot"))
    return connectorIcons["HubSpot"] || "/logo.svg";
  if (lower.includes("jira")) return connectorIcons["Jira"] || "/logo.svg";
  if (lower.includes("linear")) return connectorIcons["Linear"] || "/logo.svg";
  if (lower.includes("notion")) return connectorIcons["Notion"] || "/logo.svg";
  if (lower.includes("outlook"))
    return connectorIcons["Outlook"] || "/logo.svg";
  if (lower.includes("typeform"))
    return connectorIcons["Typeform"] || "/logo.svg";
  if (lower.includes("ashby")) return connectorIcons["Ashby"] || "/logo.svg";
  if (lower.includes("youtube"))
    return connectorIcons["YouTube"] || "/logo.svg";
  if (lower.includes("docs") || lower.includes("google_doc"))
    return connectorIcons["Google Docs"] || "/logo.svg";
  if (lower.includes("sheets") || lower.includes("google_sheets"))
    return connectorIcons["Google Sheets"] || "/logo.svg";
  return "/logo.svg";
};

// Custom Trigger Node Component
function TriggerNode({ data }: { data: any }) {
  return (
    <div className="w-[240px] rounded-xl border border-purple-200 bg-purple-50/50 dark:border-purple-500/30 dark:bg-purple-950/20 p-4 shadow-sm backdrop-blur-xs relative group hover:border-purple-400 dark:hover:border-purple-500/60 transition-all select-none">
      <div className="flex items-center gap-2 mb-2.5 relative z-10">
        <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400">
          <Play className="h-3.5 w-3.5 fill-current" />
        </div>
        <span className="text-[9px] font-bold tracking-wider text-purple-600 dark:text-purple-400 uppercase">
          Trigger Event
        </span>
      </div>
      <h4 className="font-semibold text-sm text-foreground dark:text-neutral-100 relative z-10 truncate">
        {data.label}
      </h4>
      <p className="text-[10px] text-muted-foreground mt-1 relative z-10 leading-snug">
        Triggered dynamically via connected tasks webhook integrations.
      </p>
      <Handle
        type="source"
        position={Position.Right}
        className="w-2.5 h-2.5 bg-purple-500 border-2 border-background shadow-xs"
      />
    </div>
  );
}

// Custom AI Node Component
function AINode({ data }: { data: any }) {
  const aiConfig = data.ai_config || {};
  const nodeType = data.type || "ai_research";

  // Format visual tag
  const typeTag = nodeType.replace("ai_", "AI ").toUpperCase();

  return (
    <div className="w-[250px] rounded-xl border border-blue-200 bg-blue-50/50 dark:border-blue-500/30 dark:bg-blue-950/20 p-4 shadow-sm backdrop-blur-xs relative group hover:border-blue-400 dark:hover:border-blue-500/60 transition-all select-none">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none opacity-50" />
      <div className="flex items-center gap-2 mb-2.5 relative z-10">
        <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <span className="text-[9px] font-bold tracking-wider text-blue-600 dark:text-blue-400 uppercase">
          {typeTag}
        </span>
      </div>
      <h4 className="font-semibold text-sm text-foreground dark:text-neutral-100 relative z-10 truncate">
        {data.label}
      </h4>
      {aiConfig.prompt && (
        <p className="text-[10px] text-muted-foreground mt-2 relative z-10 p-2 rounded-lg bg-muted border border-border dark:bg-black/40 dark:border-white/5 line-clamp-3 leading-relaxed select-text font-medium">
          {aiConfig.prompt}
        </p>
      )}
      <Handle
        type="target"
        position={Position.Left}
        className="w-2.5 h-2.5 bg-blue-500 border-2 border-background shadow-xs"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-2.5 h-2.5 bg-blue-500 border-2 border-background shadow-xs"
      />
    </div>
  );
}

// Custom Composio App Node Component
function AppNode({ data }: { data: any }) {
  const composioConfig = data.composio_config || {};
  const slug = composioConfig.action_slug || "";
  const iconSrc = getAppIcon(slug);

  // Clean action and app labels
  const actionParts = slug.split("_");
  const rawAppName = actionParts[0] || "App";
  const appName = rawAppName.charAt(0).toUpperCase() + rawAppName.slice(1);
  const actionName = actionParts
    .slice(1)
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <div className="w-[260px] rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-950/20 p-4 shadow-sm backdrop-blur-xs relative group hover:border-emerald-400 dark:hover:border-emerald-500/60 transition-all select-none">
      <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none opacity-50" />
      <div className="flex items-center gap-2 mb-2 relative z-10">
        {iconSrc ? (
          <div className="relative h-7 w-7 rounded bg-muted dark:bg-black/40 p-1 border border-border dark:border-white/5 flex items-center justify-center shrink-0">
            <Image
              src={iconSrc}
              alt={appName}
              width={18}
              height={18}
              className="object-contain"
            />
          </div>
        ) : (
          <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Workflow className="h-4 w-4" />
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-[9px] font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
            Integration App
          </span>
          <span className="text-[9px] text-muted-foreground -mt-0.5">
            {appName}
          </span>
        </div>
      </div>
      <h4 className="font-semibold text-sm text-foreground dark:text-neutral-100 mt-1 relative z-10 truncate">
        {data.label}
      </h4>
      {actionName && (
        <div className="text-[10px] text-emerald-700 bg-emerald-100/80 border border-emerald-200/50 dark:text-emerald-300 dark:bg-emerald-500/15 dark:border-emerald-500/25 px-2 py-0.5 rounded mt-2 inline-block font-semibold">
          {actionName}
        </div>
      )}
      {composioConfig.params_mapping &&
        Object.keys(composioConfig.params_mapping).length > 0 && (
          <div className="mt-2.5 space-y-1 relative z-10 select-text">
            <span className="text-[8px] text-muted-foreground font-bold tracking-wider uppercase">
              PARAMETERS MAPPING
            </span>
            {Object.entries(composioConfig.params_mapping).map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between items-center text-[9px] p-1 px-1.5 rounded bg-muted border border-border dark:bg-black/30 dark:border-white/5 font-mono"
              >
                <span className="text-muted-foreground truncate max-w-[90px]">
                  {k}
                </span>
                <span
                  className="text-emerald-600 dark:text-emerald-400 truncate max-w-[120px] text-right font-medium"
                  title={String(v)}
                >
                  {String(v)}
                </span>
              </div>
            ))}
          </div>
        )}
      <Handle
        type="target"
        position={Position.Left}
        className="w-2.5 h-2.5 bg-emerald-500 border-2 border-background shadow-xs"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-2.5 h-2.5 bg-emerald-500 border-2 border-background shadow-xs"
      />
    </div>
  );
}

export default function FlowPreview({
  onSelectSuggestion,
  nodes,
  edges,
}: FlowPreviewProps) {
  const [currentRecipes, setCurrentRecipes] = useState<typeof recipes>([]);

  const handleSuggestNew = () => {
    const shuffled = [...recipes].sort(() => 0.5 - Math.random());
    setCurrentRecipes(shuffled.slice(0, 3));
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
  useEffect(() => {
    handleSuggestNew();
  }, []);

  // Register custom node layouts in React Flow
  const customNodeTypes = useMemo(
    () => ({
      task_trigger: TriggerNode,
      ai_summarize: AINode,
      ai_classify: AINode,
      ai_extract: AINode,
      ai_research: AINode,
      composio_app: AppNode,
    }),
    [],
  );

  // Position nodes horizontally if they are stacking at default coordinate (100, 100)
  const renderedNodes = useMemo(() => {
    if (!nodes) return [];
    return nodes.map((node, index) => {
      const isDefault = node.position?.x === 100 && node.position?.y === 100;
      if (isDefault) {
        return {
          ...node,
          position: { x: index * 280 + 40, y: 200 },
        };
      }
      return node;
    });
  }, [nodes]);

  const hasWorkflow = renderedNodes.length > 0;

  return (
    <div className="w-full h-full relative flex items-center justify-center p-0">
      {/* Background canvas */}
      <div className="absolute inset-0 z-0 bg-background">
        <ReactFlow
          nodes={renderedNodes}
          edges={edges || []}
          nodeTypes={customNodeTypes}
          proOptions={{ hideAttribution: true }}
          fitView={hasWorkflow}
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background
            gap={22}
            size={1}
            color="var(--border)"
            className="opacity-60"
          />
          {hasWorkflow && (
            <>
              <Controls className="!bg-background !border-border !text-foreground [&_button]:!border-border [&_button]:!bg-background hover:[&_button]:!bg-muted [&_svg]:!fill-foreground dark:!bg-zinc-900 dark:!border-zinc-800 dark:!text-white dark:[&_button]:!border-zinc-800 dark:[&_button]:!bg-zinc-900 dark:hover:[&_button]:!bg-zinc-800 dark:[&_svg]:!fill-white" />
              <MiniMap
                className="!bg-background/90 !border-border dark:!bg-zinc-900/90 dark:!border-zinc-800"
                maskColor="rgba(0, 0, 0, 0.05)"
                nodeColor={(node) => {
                  if (node.type === "task_trigger") return "#8b5cf6";
                  if (node.type?.startsWith("ai_")) return "#3b82f6";
                  if (node.type === "composio_app") return "#10b981";
                  return "#4b5563";
                }}
              />
            </>
          )}
        </ReactFlow>
      </div>

      {/* Suggestion Recipes Glassmorphic Card (Shown only if no workflow is currently loaded) */}
      {!hasWorkflow && (
        <div className="relative z-10 max-w-md w-full border border-border/40 shadow rounded-lg p-5 bg-neutral-50 select-none mx-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8  flex items-center justify-center shrink-0">
                <Workflow className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  Select a Workflow Recipe
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                  Choose a prompt template below to let the AI agent build your
                  automation graph.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end mb-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSuggestNew}
              className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-3 w-3" />
              Suggest New
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            {currentRecipes.map((recipe) => (
              <button
                key={recipe.title}
                type="button"
                onClick={() => onSelectSuggestion?.(recipe.prompt, recipe.apps)}
                className="flex items-center text-left p-3 rounded-md border border-border bg-background hover:scale-[1.01] hover:-translate-y-0.5 shadow transition-all duration-300 group cursor-pointer w-full dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:bg-zinc-800/50 dark:hover:border-zinc-700"
              >
                <div
                  className={`p-2.5 rounded-lg border ${recipe.bgClass} mr-3.5 transition-colors duration-300 shrink-0`}
                >
                  <recipe.icon className={`h-4.5 w-4.5 ${recipe.colorClass}`} />
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors duration-300 truncate">
                    {recipe.title}
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[280px]">
                    {recipe.description}
                  </p>
                </div>
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 shrink-0 dark:bg-zinc-800/80">
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors dark:text-zinc-400 dark:group-hover:text-neutral-100" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
