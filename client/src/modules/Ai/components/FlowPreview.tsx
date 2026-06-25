"use client";

import {
  Background,
  BaseEdge,
  getStraightPath,
  Handle,
  Position,
  ReactFlow,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Check,
  CheckCircle,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Settings,
  Settings2,
  Share2,
  Sparkles,
  Workflow,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { connectorIcons } from "@/lib/static";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface FlowPreviewProps {
  onSelectSuggestion?: (prompt: string, apps: string[]) => void;
  onEditWorkflow?: (text: string) => void;
  nodes?: any[];
  edges?: any[];
  onChangeNodes?: (nodes: any[]) => void;
  activeTab?: "editor" | "runs";
  isRunning?: boolean;
  nodeStatuses?: Record<string, "pending" | "running" | "success" | "failed">;
}

const AI_MODELS = [
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "claude-3-haiku", label: "Claude 3 Haiku" },
];

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
      "Summarize about my last 1 month activity -> create doc -> email.",
    prompt:
      "summarize about my last 1 month activity - create doc -> google doc - email.",
    icon: FileText,
    colorClass: "text-purple-500",
    bgClass:
      "bg-purple-500/10 group-hover:bg-purple-500/20 border-purple-500/20",
    apps: ["Google Docs", "Gmail"],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Shared Popover Wrapper ───────────────────────────────────────────────────

function PopoverWrapper({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        overlayRef.current &&
        !overlayRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    const t = setTimeout(
      () => document.addEventListener("mousedown", handleClick),
      50,
    );
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/25 backdrop-blur-[2px]">
      <div
        ref={overlayRef}
        className="bg-white border border-neutral-200 rounded-2xl shadow-2xl w-[560px] max-w-[95vw] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {children}
      </div>
    </div>
  );
}

// ─── AI Node Popover ─────────────────────────────────────────────────────────

function AINodePopover({
  data,
  nodeType,
  onClose,
  onSave,
}: {
  data: any;
  nodeType: string;
  onClose: () => void;
  onSave: (newData: any, newType: string) => void;
}) {
  const aiConfig = data.ai_config || {};
  const [prompt, setPrompt] = useState<string>(aiConfig.prompt || "");
  const [model, setModel] = useState<string>(
    aiConfig.model || "gemini-2.0-flash",
  );
  const [extra, setExtra] = useState<string>(aiConfig.extra_instructions || "");
  const [role, setRole] = useState<string>(nodeType.replace("ai_", ""));

  const handleSave = () => {
    onSave(
      {
        ...data,
        ai_config: {
          ...aiConfig,
          prompt,
          model,
          extra_instructions: extra,
        },
      },
      `ai_${role}`,
    );
  };

  return (
    <PopoverWrapper onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Image
              src="/logo.svg"
              alt="AI"
              width={16}
              height={16}
              className="object-contain"
            />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-neutral-900">
              {data.label || "AI Agent Node"}
            </h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              AI Node Configuration
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-5">
        {/* Role/Type selection */}
        <div>
          <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            AI Node Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all cursor-pointer"
          >
            <option value="research">Research</option>
            <option value="summarize">Summarize</option>
            <option value="classify">Classify</option>
            <option value="extract">Extract</option>
          </select>
        </div>

        {/* Prompt */}
        <div>
          <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            placeholder="Give the model detailed instructions. Insert relevant data for context."
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-800 placeholder:text-neutral-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all leading-relaxed"
          />
        </div>

        {/* Model */}
        <div>
          <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            Model
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all cursor-pointer"
          >
            {AI_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Extra instructions */}
        <div>
          <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            Additional Instructions
            <span className="ml-1.5 text-neutral-400 normal-case font-normal">
              (optional)
            </span>
          </label>
          <textarea
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            rows={2.5}
            placeholder="Anything else you want to specify for this AI step…"
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-800 placeholder:text-neutral-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all leading-relaxed"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-neutral-100 bg-neutral-50">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm text-neutral-600 font-medium hover:bg-neutral-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          Save
        </button>
      </div>
    </PopoverWrapper>
  );
}

// ─── App Node Popover ─────────────────────────────────────────────────────────

function AppNodePopover({
  data,
  onClose,
  onSave,
}: {
  data: any;
  onClose: () => void;
  onSave: (newData: any) => void;
}) {
  const composioConfig = data.composio_config || {};
  const slug = composioConfig.action_slug || "";
  const iconSrc = getAppIcon(slug);
  const actionParts = slug.split("_");
  const rawAppName = actionParts[0] || "App";
  const appName = rawAppName.charAt(0).toUpperCase() + rawAppName.slice(1);

  const initialParams = composioConfig.params_mapping || {};
  const [params, setParams] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(initialParams).map(([k, v]) => [k, String(v)]),
    ),
  );

  const handleSave = () => {
    onSave({
      ...data,
      composio_config: {
        ...composioConfig,
        params_mapping: params,
      },
    });
  };

  return (
    <PopoverWrapper onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center">
            <Image
              src={iconSrc}
              alt={appName}
              width={20}
              height={20}
              className="object-contain"
            />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-neutral-900">
              {data.label}
            </h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Integration · {appName}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="px-6 py-5 max-h-[60vh] overflow-y-auto space-y-4">
        {Object.keys(params).length > 0 ? (
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-3">
              Parameters Mapping
            </label>
            <div className="space-y-3">
              {Object.entries(params).map(([key, val]) => (
                <div key={key}>
                  <label className="block text-[11px] text-neutral-500 mb-1 font-medium capitalize">
                    {key.replace(/_/g, " ")}
                  </label>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) =>
                      setParams((p) => ({ ...p, [key]: e.target.value }))
                    }
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all font-mono"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-sm text-neutral-400">
            No parameters to configure for this integration.
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-neutral-100 bg-neutral-50">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm text-neutral-600 font-medium hover:bg-neutral-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          Save
        </button>
      </div>
    </PopoverWrapper>
  );
}

// ─── Trigger Node ─────────────────────────────────────────────────────────────

function TriggerNode({ data }: { data: any }) {
  const isFirst = data._isFirst !== false;
  if (isFirst) {
    return (
      <div className="w-[450px] rounded-xl border-2 border-blue-500 bg-blue-600 shadow-lg shadow-blue-500/25 px-4 py-3.5 select-none cursor-default">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-white/20 flex items-center justify-center">
              <Image
                src="/logo.svg"
                alt="Aria"
                width={14}
                height={14}
                className="object-contain"
              />
            </div>
            <span className="text-[9px] font-bold tracking-widest text-blue-100 uppercase">
              Start
            </span>
          </div>
          {data.isRunsTab && data.isSimulationActive && (
            <div className="h-6 w-6 flex items-center justify-center shrink-0">
              {data.status === "running" && (
                <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
              )}
              {data.status === "success" && (
                <Check className="h-3.5 w-3.5 text-white font-bold" />
              )}
              {data.status === "failed" && (
                <X className="h-3.5 w-3.5 text-red-205 font-bold" />
              )}
              {data.status === "pending" && (
                <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
              )}
            </div>
          )}
        </div>
        <h4 className="font-semibold text-sm text-white leading-snug truncate">
          {data.label || "Trigger"}
        </h4>
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-2 !h-2 !bg-blue-200 !border-2 !border-blue-600"
        />
      </div>
    );
  }

  return (
    <div className="w-[450px] rounded-md border border-neutral-200 bg-neutral-50 shadow-sm px-4 py-3.5 select-none cursor-default hover:shadow-md hover:border-neutral-300 transition-all">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-white border border-neutral-200 flex items-center justify-center shrink-0">
            <Image
              src="/logo.svg"
              alt="Aria"
              width={14}
              height={14}
              className="object-contain"
            />
          </div>
          <span className="text-[9px] font-bold tracking-widest text-neutral-400 uppercase">
            Start
          </span>
        </div>
        {data.isRunsTab && data.isSimulationActive && (
          <div className="h-6 w-6 flex items-center justify-center shrink-0">
            {data.status === "running" && (
              <Loader2 className="h-3.5 w-3.5 text-blue-600 animate-spin" />
            )}
            {data.status === "success" && (
              <Check className="h-3.5 w-3.5 text-emerald-600 font-bold" />
            )}
            {data.status === "failed" && (
              <X className="h-3.5 w-3.5 text-red-600 font-bold" />
            )}
            {data.status === "pending" && (
              <div className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
            )}
          </div>
        )}
      </div>
      <h4 className="font-semibold text-sm text-neutral-800 leading-snug truncate">
        {data.label || "Trigger"}
      </h4>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-neutral-300 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-neutral-300 !border-2 !border-white"
      />
    </div>
  );
}

// ─── AI Node ─────────────────────────────────────────────────────────────────

function AINode({ data }: { data: any }) {
  const isFirst: boolean = data._isFirst === true;

  const typeTag = (data.type || "ai_task")
    .replace(/^ai_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  if (isFirst) {
    return (
      <div className="w-[450px] rounded-xl border-2 border-blue-500 bg-blue-600 shadow-lg shadow-blue-500/25 px-4 py-3.5 select-none cursor-default">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-white/20 flex items-center justify-center">
              <Image
                src="/logo.svg"
                alt="AI"
                width={14}
                height={14}
                className="object-contain"
              />
            </div>
            <span className="text-[9px] font-bold tracking-widest text-blue-100 uppercase">
              AI · {typeTag}
            </span>
          </div>
          {data.isRunsTab ? (
            data.isSimulationActive ? (
              <div className="h-6 w-6 flex items-center justify-center shrink-0">
                {data.status === "running" && (
                  <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                )}
                {data.status === "success" && (
                  <Check className="h-3.5 w-3.5 text-white font-bold" />
                )}
                {data.status === "failed" && (
                  <X className="h-3.5 w-3.5 text-red-205 font-bold" />
                )}
                {data.status === "pending" && (
                  <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
                )}
              </div>
            ) : null
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                data.onOpenSettings?.();
              }}
              className="h-6 w-6 rounded-lg flex items-center justify-center text-blue-200 hover:text-white hover:bg-white/20 transition-colors"
              title="Configure AI node"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <h4 className="font-semibold text-sm text-white leading-snug truncate">
          {data.label}
        </h4>
        {data.isRunsTab &&
          data.errors &&
          data.errors.length > 0 &&
          !data.isSimulationActive && (
            <div className="mt-2.5 pt-2 border-t border-white/20 text-[10px] text-red-100 flex flex-col gap-1">
              {data.errors.map((err: string, i: number) => (
                <span key={i} className="flex items-center gap-1 font-medium">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-200" />
                  {err}
                </span>
              ))}
            </div>
          )}
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-2 !h-2 !bg-blue-200 !border-2 !border-blue-600"
        />
      </div>
    );
  }

  return (
    <div className="w-[450px] rounded-md border border-neutral-200 bg-neutral-50 shadow-sm px-4 py-3.5 select-none cursor-default hover:shadow-md hover:border-neutral-300 transition-all">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-neutral-900 flex items-center justify-center">
            <Image
              src="/logo.svg"
              alt="AI"
              width={13}
              height={13}
              className="object-contain"
            />
          </div>
          <span className="text-[9px] font-bold tracking-widest text-neutral-400 uppercase">
            AI · {typeTag}
          </span>
        </div>
        {data.isRunsTab ? (
          data.isSimulationActive ? (
            <div className="h-6 w-6 flex items-center justify-center shrink-0">
              {data.status === "running" && (
                <Loader2 className="h-3.5 w-3.5 text-blue-600 animate-spin" />
              )}
              {data.status === "success" && (
                <Check className="h-3.5 w-3.5 text-emerald-600 font-bold" />
              )}
              {data.status === "failed" && (
                <X className="h-3.5 w-3.5 text-red-600 font-bold" />
              )}
              {data.status === "pending" && (
                <div className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
              )}
            </div>
          ) : null
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onOpenSettings?.();
            }}
            className="h-6 w-6 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            title="Configure AI node"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <h4 className="font-semibold text-sm text-neutral-800 leading-snug truncate">
        {data.label}
      </h4>
      {data.isRunsTab &&
        data.errors &&
        data.errors.length > 0 &&
        !data.isSimulationActive && (
          <div className="mt-2.5 pt-2 border-t border-neutral-200 text-[10px] text-red-600 flex flex-col gap-1.5">
            {data.errors.map((err: string, i: number) => (
              <span key={i} className="flex items-center gap-1 font-medium">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                {err}
              </span>
            ))}
          </div>
        )}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-neutral-300 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-neutral-300 !border-2 !border-white"
      />
    </div>
  );
}

// ─── App Node ─────────────────────────────────────────────────────────────────

function AppNode({ data }: { data: any }) {
  const composioConfig = data.composio_config || {};
  const slug = composioConfig.action_slug || "";
  const iconSrc = getAppIcon(slug);

  const actionParts = slug.split("_");
  const rawAppName = actionParts[0] || "App";
  const appName = rawAppName.charAt(0).toUpperCase() + rawAppName.slice(1);
  const actionName = actionParts
    .slice(1)
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const paramCount = Object.keys(composioConfig.params_mapping || {}).length;
  const isFirst = data._isFirst === true;

  if (isFirst) {
    return (
      <div className="w-[500px] rounded-md border bg-blue-100 shadow-sm shadow-blue-500/25 px-4 py-3 select-none cursor-default">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 justify-center items-center flex border rounded bg-white shrink-0">
              <Image
                src={iconSrc}
                alt={appName}
                width={18}
                height={18}
                className="object-contain"
              />
            </div>
            <span className="text-sm font-semibold uppercase">{appName}</span>
          </div>
          {data.isRunsTab ? (
            data.isSimulationActive ? (
              <div className="h-6 w-6 flex items-center justify-center shrink-0">
                {data.status === "running" && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {data.status === "success" && (
                  <Check className="h-3.5 w-3.5 font-bold" />
                )}
                {data.status === "failed" && (
                  <X className="h-3.5 w-3.5 font-bold" />
                )}
                {data.status === "pending" && (
                  <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
                )}
              </div>
            ) : null
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                data.onOpenSettings?.();
              }}
              className="h-6 w-6 rounded-lg flex items-center justify-center  hover:bg-white/20 transition-colors"
              title="Configure app node"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <h4 className="font-semibold text-xs leading-snug truncate">
          {data.label}
        </h4>
        {actionName && (
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-blue-100 bg-blue-700/50 border border-blue-400/30 px-2 py-0.5 rounded-md font-medium truncate max-w-[130px]">
              {actionName}
            </span>
            {data.isRunsTab ? (
              data.errors && data.errors.length > 0 ? (
                <div className="flex items-center gap-1 text-[10px] text-red-200 font-medium">
                  <AlertCircle className="size-3.5 text-red-200" />
                  <span>Missing parameter</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                    <Check className="size-3.5 text-emerald-600" />
                    <span>All params configured</span>
                  </div>
                  {data.traceResult && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant={"outline"}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] p-1.5! ml-2 cursor-pointer"
                        >
                          Trace Result <Eye className="size-3.5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-96 p-4 rounded-xl border border-neutral-200 bg-white shadow-xl z-[9999]"
                        align="end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between border-b pb-2">
                            <span className="font-semibold text-xs text-neutral-900">
                              Execution Trace Result
                            </span>
                          </div>
                          <pre className="text-[10px] bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 overflow-x-auto overflow-y-auto max-h-60 font-mono text-neutral-800 leading-relaxed max-w-full whitespace-pre-wrap">
                            {JSON.stringify(data.traceResult, null, 2)}
                          </pre>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              )
            ) : (
              paramCount > 0 && (
                <div className="flex items-center gap-1 text-[10px] ">
                  {paramCount} paramter{paramCount !== 1 ? "s" : ""}{" "}
                  <Settings2 className="text-muted-foreground size-4" />
                </div>
              )
            )}
          </div>
        )}
        {data.isRunsTab &&
          data.errors &&
          data.errors.length > 0 &&
          !data.isSimulationActive && (
            <div className="mt-2.5 pt-2 border-t border-white/20 text-[10px] text-red-100 flex flex-col gap-1">
              {data.errors.map((err: string, i: number) => (
                <span key={i} className="flex items-center gap-1 font-medium">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-200" />
                  {err}
                </span>
              ))}
            </div>
          )}
        {/* <Handle type="target" position={Position.Top} className="" /> */}
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-2 !h-2"
        />
      </div>
    );
  }

  return (
    <div className="w-[500px] rounded-md border border-neutral-200 bg-neutral-50 shadow-sm px-4 py-3 select-none cursor-default hover:shadow-md hover:border-neutral-300 transition-all">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-white border flex items-center justify-center shrink-0">
            <Image
              src={iconSrc}
              alt={appName}
              width={18}
              height={18}
              className="object-contain"
            />
          </div>
          <span className="text-sm font-semibold uppercase">{appName}</span>
        </div>
        {data.isRunsTab ? (
          data.isSimulationActive ? (
            <div className="h-6 w-6 flex items-center justify-center shrink-0">
              {data.status === "running" && (
                <Loader2 className="h-3.5 w-3.5 text-blue-600 animate-spin" />
              )}
              {data.status === "success" && (
                <Check className="h-3.5 w-3.5 text-emerald-600 font-bold" />
              )}
              {data.status === "failed" && (
                <X className="h-3.5 w-3.5 text-red-600 font-bold" />
              )}
              {data.status === "pending" && (
                <div className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
              )}
            </div>
          ) : null
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onOpenSettings?.();
            }}
            className="h-6 w-6 rounded-lg flex items-center justify-center  hover:bg-neutral-100 transition-colors"
            title="Configure app node"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <h4 className="font-semibold text-xs text-neutral-800 leading-snug truncate">
        {data.label}
      </h4>
      {actionName && (
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-neutral-500 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-md font-medium truncate max-w-[130px]">
            {actionName}
          </span>
          {data.isRunsTab ? (
            data.errors && data.errors.length > 0 ? (
              <div className="flex items-center gap-1 text-[10px] text-red-600 font-semibold">
                <AlertCircle className="size-3.5 text-red-500" />
                <span>Missing parameter</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                  <Check className="size-3.5 text-emerald-500" />
                  <span>All params configured</span>
                </div>
                {data.traceResult && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant={"outline"}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] p-1.5! ml-2 cursor-pointer"
                      >
                        Trace Result <Eye className="size-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-96 p-4 rounded-xl border border-neutral-200 bg-white shadow-xl z-[9999]"
                      align="end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="font-semibold text-xs text-neutral-900">
                            Execution Trace Result
                          </span>
                        </div>
                        <pre className="text-[10px] bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 overflow-x-auto overflow-y-auto max-h-60 font-mono text-neutral-800 leading-relaxed max-w-full whitespace-pre-wrap">
                          {JSON.stringify(data.traceResult, null, 2)}
                        </pre>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            )
          ) : (
            paramCount > 0 && (
              <div className="flex items-center gap-1 text-[10px] ">
                {paramCount} paramter{paramCount !== 1 ? "s" : ""}{" "}
                <Settings2 className="text-muted-foreground size-4" />
              </div>
            )
          )}
        </div>
      )}
      {data.isRunsTab &&
        data.errors &&
        data.errors.length > 0 &&
        !data.isSimulationActive && (
          <div className="mt-2.5 pt-2 border-t border-neutral-200 text-[10px] text-red-600 flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
            {data.errors.map((err: string, i: number) => (
              <span key={i} className="flex items-center gap-1 font-semibold">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                {err}
              </span>
            ))}
          </div>
        )}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-neutral-300 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-neutral-300 !border-2 !border-white"
      />
    </div>
  );
}

// ─── Straight Edge ────────────────────────────────────────────────────────────

function StraightEdge({ id, sourceX, sourceY, targetX, targetY }: any) {
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{ stroke: "#d4d4d4", strokeWidth: 1.5 }}
      markerEnd="url(#flowArrow)"
    />
  );
}

// ─── Auto Fit ─────────────────────────────────────────────────────────────────

function FlowFitter({
  nodes,
  containerRef,
}: {
  nodes: any[];
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { setViewport } = useReactFlow();
  useEffect(() => {
    if (nodes && nodes.length > 0 && containerRef.current) {
      const t = setTimeout(() => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const nodeWidth = 500;
          // Center horizontally
          const x = (rect.width - nodeWidth) / 2;
          // Start from the top (40px padding)
          setViewport({ x, y: 30, zoom: 0.92 });
        }
      }, 100);
      return () => clearTimeout(t);
    }
  }, [nodes, setViewport, containerRef]);
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function FlowPreview({
  onSelectSuggestion,
  onEditWorkflow,
  nodes,
  edges,
  onChangeNodes,
  activeTab = "editor",
  isRunning = false,
  nodeStatuses = {},
}: FlowPreviewProps) {
  const [currentRecipes, setCurrentRecipes] = useState<typeof recipes>([]);
  const [localNodes, setLocalNodes] = useState<any[]>([]);
  const [activePopoverNodeId, setActivePopoverNodeId] = useState<string | null>(
    null,
  );
  const handleSuggestNew = () => {
    const shuffled = [...recipes].sort(() => 0.5 - Math.random());
    setCurrentRecipes(shuffled.slice(0, 3));
  };

  useEffect(() => {
    handleSuggestNew();
  }, []);

  useEffect(() => {
    if (nodes) {
      setLocalNodes(nodes);
    } else {
      setLocalNodes([]);
    }
  }, [nodes]);

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

  const customEdgeTypes = useMemo(() => ({ straight: StraightEdge }), []);

  const containerRef = useRef<HTMLDivElement>(null);

  // Lay out nodes vertically (tight vertical spacing index * 140, always start from top, no need to center)
  const renderedNodes = useMemo(() => {
    const filteredNodes = localNodes.filter(
      (node) => node.type !== "task_trigger",
    );
    return filteredNodes.map((node, index) => {
      const errors: string[] = [];
      const nodeType = node.type || "";
      if (nodeType.startsWith("ai_")) {
        const prompt = node.data?.ai_config?.prompt;
        if (!prompt || !prompt.trim()) {
          errors.push("prompt is empty");
        }
      } else if (nodeType === "composio_app") {
        const params = node.data?.composio_config?.params_mapping || {};
        const keys = Object.keys(params);
        keys.forEach((k) => {
          const val = params[k];
          const valStr = val === null || val === undefined ? "" : String(val);
          if (!valStr.trim()) {
            errors.push(`${k.replace(/_/g, " ")} is empty`);
          }
        });
      }

      return {
        ...node,
        data: {
          ...node.data,
          _isFirst: index === 0,
          onOpenSettings: () => setActivePopoverNodeId(node.id),
          isRunsTab: activeTab === "runs",
          isSimulationActive: isRunning,
          status: nodeStatuses?.[node.id] || "pending",
          traceResult: node.data?.traceResult,
          errors,
        },
        position: { x: 0, y: index * 160 },
      };
    });
  }, [localNodes, activeTab, isRunning, nodeStatuses]);

  // Force all edges to use straight type and filter out ones connected to task_trigger
  const renderedEdges = useMemo(() => {
    if (!edges) return [];
    const validNodeIds = new Set(renderedNodes.map((n) => n.id));
    return edges
      .filter(
        (edge) =>
          validNodeIds.has(edge.source) && validNodeIds.has(edge.target),
      )
      .map((edge) => ({ ...edge, type: "straight" }));
  }, [edges, renderedNodes]);

  const activeNode = useMemo(() => {
    return renderedNodes.find((n) => n.id === activePopoverNodeId);
  }, [renderedNodes, activePopoverNodeId]);

  const hasWorkflow = renderedNodes.length > 0;

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      {/* Canvas — white background */}
      <div ref={containerRef} className="absolute inset-0 z-0 bg-white">
        <ReactFlow
          nodes={renderedNodes}
          edges={renderedEdges}
          nodeTypes={customNodeTypes}
          edgeTypes={customEdgeTypes}
          proOptions={{ hideAttribution: true }}
          fitView={false} // Disable auto-fitView so it doesn't vertically center the workflow
          nodesDraggable={false}
          nodesConnectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          selectionOnDrag={false}
        >
          <Background gap={24} size={1} color="#e5e5e5" />
          <FlowFitter nodes={renderedNodes} containerRef={containerRef} />

          {/* Arrow marker */}
          <svg style={{ position: "absolute", width: 0, height: 0 }}>
            <defs>
              <marker
                id="flowArrow"
                markerWidth="8"
                markerHeight="10"
                refX="6"
                refY="4"
                orient="auto"
              >
                <path d="M0,0 L0,8 L8,4 z" fill="#c8c8c8" />
              </marker>
            </defs>
          </svg>
        </ReactFlow>
      </div>

      {/* Popovers rendered at the root Level to bypass transformed container styling/scaling issues */}
      {activeNode && activeNode.type?.startsWith("ai_") && (
        <AINodePopover
          data={activeNode.data}
          nodeType={activeNode.type}
          onClose={() => setActivePopoverNodeId(null)}
          onSave={(newData, newType) => {
            const updated = localNodes.map((n) =>
              n.id === activeNode.id
                ? { ...n, type: newType, data: { ...n.data, ...newData } }
                : n,
            );
            setLocalNodes(updated);
            onChangeNodes?.(updated);
            setActivePopoverNodeId(null);
          }}
        />
      )}

      {activeNode && activeNode.type === "composio_app" && (
        <AppNodePopover
          data={activeNode.data}
          onClose={() => setActivePopoverNodeId(null)}
          onSave={(newData) => {
            const updated = localNodes.map((n) =>
              n.id === activeNode.id
                ? { ...n, data: { ...n.data, ...newData } }
                : n,
            );
            setLocalNodes(updated);
            onChangeNodes?.(updated);
            setActivePopoverNodeId(null);
          }}
        />
      )}

      {/* Recipe suggestions — shown only if no workflow loaded */}
      {!hasWorkflow && (
        <div className="relative z-10 max-w-md w-full border border-neutral-200 shadow rounded-md p-5 bg-neutral-50 select-none mx-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="h-9 w-9 rounded-xl bg-neutral-900 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 36 48" width="16" height="20" fill="white">
                <path d="m0 6c10.1433 9.4404 25.8567 9.4404 36 0-9.4404 10.1433-9.4404 25.8567 0 36-10.1433-9.4404-25.8567-9.4404-36 0 9.44041-10.1433 9.44041-25.8567 0-36z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-neutral-900">
                Workflow Recipes
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5 leading-snug">
                Pick a template and the AI will build your automation graph.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end w-full mb-2">
            <Button
              type="button"
              variant={"ghost"}
              size={"xs"}
              onClick={handleSuggestNew}
              className="flex items-center "
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {currentRecipes.map((recipe) => (
              <button
                key={recipe.title}
                type="button"
                onClick={() => onSelectSuggestion?.(recipe.prompt, recipe.apps)}
                className="flex items-center text-left p-3 rounded-md border border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm transition-all duration-200 group cursor-pointer w-full"
              >
                <div
                  className={`p-2 rounded-lg border ${recipe.bgClass} mr-3 transition-colors duration-200 shrink-0`}
                >
                  <recipe.icon className={`h-4 w-4 ${recipe.colorClass}`} />
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="font-semibold text-xs text-neutral-800 group-hover:text-neutral-900 truncate">
                    {recipe.title}
                  </h4>
                  <p className="text-[10px] text-neutral-400 mt-0.5 truncate">
                    {recipe.description}
                  </p>
                </div>
                <div className="h-6 w-6 rounded-full bg-neutral-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <ArrowRight className="h-3 w-3 text-neutral-500" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === "editor" && hasWorkflow && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-white border border-neutral-200 px-4 py-2 rounded-lg shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
          <span className="text-[11px] font-medium text-neutral-500 flex items-center gap-1.5 select-none">
            Want fixes &gt; ask agent to adjust or edit workflow..
          </span>
          <div className="h-3.5 w-px bg-neutral-200" />
          <Button
            type="button"
            onClick={() => onEditWorkflow?.("edit this workflow as ")}
            className="text-xs rounded  cursor-pointer py-1"
          >
            Edit workflow...
          </Button>
        </div>
      )}
    </div>
  );
}
