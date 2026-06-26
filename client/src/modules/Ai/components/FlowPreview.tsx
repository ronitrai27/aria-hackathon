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
import { createPortal } from "react-dom";
import { connectorIcons } from "@/lib/static";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FlowPreviewProps {
  onSelectSuggestion?: (prompt: string, apps: string[]) => void;
  onEditWorkflow?: (text: string) => void;
  nodes?: any[];
  edges?: any[];
  onChangeNodes?: (nodes: any[]) => void;
  activeTab?: "editor" | "runs";
  setActiveTab?: (tab: "editor" | "runs") => void;
  isRunning?: boolean;
  nodeStatuses?: Record<string, "pending" | "running" | "success" | "failed">;
  nodeExecutionDurations?: Record<string, number>;
  isDragging?: boolean;
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
  const [provider, setProvider] = useState<"claude" | "openai">(
    aiConfig.provider ||
      (aiConfig.model?.includes("gpt") ? "openai" : "claude"),
  );
  const [citations, setCitations] = useState<boolean>(
    aiConfig.citations !== undefined ? aiConfig.citations : false,
  );
  const [format, setFormat] = useState<"plain" | "rich">(
    aiConfig.format || "rich",
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
          provider,
          model: provider === "claude" ? "claude-sonnet-4-5" : "gpt-4o",
          citations,
          format,
          extra_instructions: extra,
        },
      },
      `ai_${role}`,
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 backdrop-blur-[4px]">
      <div className="bg-white border border-neutral-200 rounded-3xl shadow-xl w-[920px] max-w-[95vw] h-[600px] max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
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
                Write with AI
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                AI Node Configuration
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-sm flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Split Panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column (58% width) - Prompt, insertion buttons, Provider selector, Citations toggle */}
          <div className="w-[58%] border-r border-neutral-100 p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-neutral-800">
                    Prompt
                  </label>
                  {!prompt.trim() && (
                    <span className="text-[10px] text-red-500 font-semibold lowercase">
                      Required field
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-500 mb-2 leading-normal font-medium">
                  Give the model detailed instructions. Insert relevant data for
                  context.{" "}
                  <span className="text-blue-600 hover:underline cursor-pointer">
                    See examples
                  </span>
                </p>
                <div
                  className={`border rounded-xl bg-neutral-50/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all ${
                    !prompt.trim()
                      ? "border-red-300 focus-within:border-red-400"
                      : "border-neutral-200 focus-within:border-blue-400"
                  }`}
                >
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={8}
                    placeholder="Write about that mail..."
                    className="w-full bg-transparent px-4 py-3 text-sm text-neutral-800 placeholder:text-neutral-400 resize-none outline-none leading-relaxed"
                  />
                  {/* Pills under textarea */}
                  <div className="px-3 pb-2.5 flex items-center gap-1.5 border-t border-neutral-400 pt-2 bg-neutral-100 rounded-b-xl">
                    <button
                      type="button"
                      className="px-2 py-1 text-[10px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      + Data from previous steps
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 text-[10px] font-semibold text-neutral-600 bg-white hover:bg-neutral-200/80 border border-neutral-200 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      + Tool
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 text-[10px] font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      + Knowledge
                    </button>
                  </div>
                </div>
              </div>

              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-2">
                  Choose Provider
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setProvider("claude")}
                    className={`border rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all ${
                      provider === "claude"
                        ? "border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/10"
                        : "border-neutral-200 hover:bg-neutral-50 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Image
                        src="/claude.png"
                        alt="Claude"
                        width={20}
                        height={20}
                        className="object-contain rounded"
                      />
                      <div>
                        <span className="text-xs font-bold text-neutral-800">
                          Claude
                        </span>
                        <p className="text-[9px] text-neutral-400">
                          Sonnet 4.5
                        </p>
                      </div>
                    </div>
                    <div
                      className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        provider === "claude"
                          ? "border-blue-500 bg-blue-500"
                          : "border-neutral-300"
                      }`}
                    >
                      {provider === "claude" && (
                        <Check className="h-2.5 w-2.5 text-white stroke-[3px]" />
                      )}
                    </div>
                  </div>

                  <div
                    onClick={() => setProvider("openai")}
                    className={`border rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all ${
                      provider === "openai"
                        ? "border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/10"
                        : "border-neutral-200 hover:bg-neutral-50 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Image
                        src="/chatgpt.png"
                        alt="ChatGPT"
                        width={20}
                        height={20}
                        className="object-contain rounded"
                      />
                      <div>
                        <span className="text-xs font-bold text-neutral-800">
                          OpenAI
                        </span>
                        <p className="text-[9px] text-neutral-400">GPT-4o</p>
                      </div>
                    </div>
                    <div
                      className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        provider === "openai"
                          ? "border-blue-500 bg-blue-500"
                          : "border-neutral-300"
                      }`}
                    >
                      {provider === "openai" && (
                        <Check className="h-2.5 w-2.5 text-white stroke-[3px]" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Citations Toggle */}
            <div className="flex items-center justify-between pt-4 border-t border-neutral-100 mt-4">
              <div>
                <span className="text-xs font-bold text-neutral-800 block">
                  Include citations in response?
                </span>
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  Provides reference links to source documents if available
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCitations(!citations)}
                className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer outline-none ${
                  citations ? "bg-blue-600" : "bg-neutral-200"
                }`}
              >
                <span
                  className={`block w-4 h-4 bg-white rounded-full shadow transition-transform absolute top-0.5 left-0.5 ${
                    citations ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Right Column */}
          <div className="w-[42%] bg-white p-6 flex flex-col overflow-y-auto">
            <div className="space-y-6">
              {/* Role */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-800">
                  AI Role
                </label>

                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="h-10 rounded-md text-sm">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="research">Research</SelectItem>
                    <SelectItem value="summarize">Summarize</SelectItem>
                    <SelectItem value="classify">Classify</SelectItem>
                    <SelectItem value="extract">Extract</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Output */}

              <div className="space-y-3">
                <label className="text-sm font-medium text-neutral-800">
                  Output format
                </label>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setFormat("plain")}
                    className={`w-full rounded-md border px-4 py-3 flex items-start gap-3 transition cursor-pointer ${
                      format === "plain"
                        ? "border-blue-500 bg-blue-50"
                        : "border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    <div
                      className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center ${
                        format === "plain"
                          ? "border-blue-500"
                          : "border-neutral-300"
                      }`}
                    >
                      {format === "plain" && (
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </div>

                    <div className="text-left">
                      <p className="text-sm font-medium text-neutral-900">
                        Plain text
                      </p>

                      <p className="text-xs text-neutral-500 mt-1">
                        Simple, unformatted output.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat("rich")}
                    className={`w-full rounded-md border px-4 py-3 flex items-start gap-3 transition cursor-pointer ${
                      format === "rich"
                        ? "border-blue-500 bg-blue-50"
                        : "border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    <div
                      className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center ${
                        format === "rich"
                          ? "border-blue-500"
                          : "border-neutral-300"
                      }`}
                    >
                      {format === "rich" && (
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </div>

                    <div className="text-left">
                      <p className="text-sm font-medium text-neutral-900">
                        Rich text
                      </p>

                      <p className="text-xs text-neutral-500 mt-1 leading-5">
                        Supports headings, bullet lists, markdown, links and
                        formatted documents.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Extra */}

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-800">
                  Additional Instructions
                </label>

                <textarea
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  rows={5}
                  placeholder="Optional instructions for this AI step..."
                  className="
          w-full
          rounded-md
          border
          border-neutral-200
          bg-white
          px-3
          py-2.5
          text-sm
          resize-none
          placeholder:text-neutral-400
          focus:outline-none
          focus:ring-2
          focus:ring-blue-500/20
          focus:border-blue-500
        "
                />

                <p className="text-xs text-neutral-400">
                  Optional. These instructions will be appended after the main
                  prompt.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-neutral-100 bg-neutral-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs text-neutral-600 font-semibold hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
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
              {Object.entries(params).map(([key, val]) => {
                const isEmpty = !val || !val.trim();
                return (
                  <div key={key}>
                    <label className="block text-[11px] text-neutral-500 mb-1 font-medium capitalize flex justify-between">
                      <span>{key.replace(/_/g, " ")}</span>
                      {isEmpty && (
                        <span className="text-[10px] text-red-500 font-semibold lowercase">
                          Required field
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) =>
                        setParams((p) => ({ ...p, [key]: e.target.value }))
                      }
                      className={`w-full rounded-xl border bg-neutral-50 px-4 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono ${
                        isEmpty
                          ? "border-red-300 focus:border-red-400"
                          : "border-neutral-200 focus:border-blue-400"
                      }`}
                    />
                  </div>
                );
              })}
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
      <div
        style={{ width: data.width ? `${data.width}px` : "450px" }}
        className="rounded-xl border-2 border-blue-500 bg-blue-600 shadow-lg shadow-blue-500/25 px-4 py-3.5 select-none cursor-default"
      >
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
    <div
      style={{ width: data.width ? `${data.width}px` : "450px" }}
      className="rounded-md border border-neutral-200 bg-neutral-50 shadow-sm px-4 py-3.5 select-none cursor-default hover:shadow-md hover:border-neutral-300 transition-all"
    >
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
      <div
        style={{ width: data.width ? `${data.width}px` : "500px" }}
        className="workflow-node-card rounded-md border bg-blue-100 shadow-sm shadow-blue-500/25 px-4 py-3 select-none cursor-default"
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-white flex items-center justify-center border shrink-0 node-logo-wrapper">
              <Image
                src="/logo.svg"
                alt="AI"
                width={14}
                height={14}
                className="object-contain invert node-logo-img"
              />
            </div>
            <span className="text-sm font-semibold uppercase text-neutral-800 node-header-title">
              AI Agent
            </span>
          </div>
          {data.isRunsTab ? (
            <div className="h-6 flex items-center gap-1.5 justify-end shrink-0">
              {data.duration !== undefined && data.status !== "pending" && (
                <span
                  className={`text-[10px] font-mono text-neutral-700 ${data.status === "running" ? "animate-pulse" : ""}`}
                >
                  {data.duration}s
                </span>
              )}
              {data.status === "running" && (
                <Loader2 className="h-3.5 w-3.5 text-blue-600 animate-spin node-status-icon" />
              )}
              {data.status === "success" && (
                <Check className="h-3.5 w-3.5 text-emerald-600 font-bold node-status-icon" />
              )}
              {data.status === "failed" && (
                <X className="h-3.5 w-3.5 text-red-600 font-bold" />
              )}
              {data.status === "pending" && (
                <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
              )}
            </div>
          ) : (
            <Button
              type="button"
              size={"xs"}
              variant={"default"}
              onClick={(e) => {
                e.stopPropagation();
                data.onOpenSettings?.();
              }}
              className="text-[10px] rounded-sm flex items-center justify-center node-edit-btn"
              title="Configure app node"
            >
              <span className="node-edit-text mr-1">Edit</span>
              <Settings className="h-3.5 w-3.5 node-edit-icon" />
            </Button>
          )}
        </div>
        <h4 className="font-semibold text-xs text-neutral-800 leading-snug truncate node-label-title">
          {data.label}
        </h4>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-blue-700 bg-blue-200/50 border border-blue-300 px-2 py-0.5 rounded-md font-medium truncate max-w-[130px] node-action-badge">
            {typeTag}
          </span>
          <div className="flex items-center gap-2 node-meta-text">
            {data.errors && data.errors.length > 0 && data.isRunsTab ? (
              <div className="flex items-center gap-1 text-[10px] text-red-700 font-semibold node-meta-text">
                <AlertCircle className="size-3.5 text-red-600 node-meta-icon" />
                <span>Missing prompt</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[10px] text-blue-700 font-medium node-meta-text">
                Model: {data.ai_config?.model || "gpt-4.1-nano"}
              </div>
            )}
            {data.isRunsTab && data.traceResult && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant={"outline"}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] h-6 px-2 bg-white/85 text-blue-700 border-blue-300/40 hover:bg-white flex items-center gap-1 cursor-pointer node-edit-btn"
                  >
                    Trace Result <Eye className="size-3 node-edit-icon" />
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
        </div>
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-2 !h-2"
        />
      </div>
    );
  }

  return (
    <div
      style={{ width: data.width ? `${data.width}px` : "500px" }}
      className="workflow-node-card rounded-md border border-neutral-200 bg-neutral-50 shadow-sm px-4 py-3 select-none cursor-default hover:shadow-md hover:border-neutral-300 transition-all"
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded border bg-white flex items-center justify-center shrink-0 node-logo-wrapper">
            <Image
              src="/logo.svg"
              alt="AI"
              width={13}
              height={13}
              className="object-contain invert node-logo-img"
            />
          </div>
          <span className="text-sm font-semibold uppercase text-neutral-800 node-header-title">
            AI Agent
          </span>
        </div>
        {data.isRunsTab ? (
          <div className="h-6 flex items-center gap-1.5 justify-end shrink-0">
            {data.duration !== undefined && data.status !== "pending" && (
              <span
                className={`text-[10px] font-mono text-neutral-700 ${data.status === "running" ? "animate-pulse" : ""}`}
              >
                {data.duration}s
              </span>
            )}
            {data.status === "running" && (
              <Loader2 className="h-3.5 w-3.5 text-blue-600 animate-spin node-status-icon" />
            )}
            {data.status === "success" && (
              <Check className="h-3.5 w-3.5 text-emerald-600 font-bold node-status-icon" />
            )}
            {data.status === "failed" && (
              <X className="h-3.5 w-3.5 text-red-600 font-bold" />
            )}
            {data.status === "pending" && (
              <div className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
            )}
          </div>
        ) : (
          <Button
            type="button"
            size={"xs"}
            variant={"default"}
            onClick={(e) => {
              e.stopPropagation();
              data.onOpenSettings?.();
            }}
            className="text-[10px] rounded-sm flex items-center justify-center node-edit-btn"
            title="Configure app node"
          >
            <span className="node-edit-text mr-1">Edit</span>
            <Settings className="h-3.5 w-3.5 node-edit-icon" />
          </Button>
        )}
      </div>
      <h4 className="font-semibold text-xs text-neutral-800 leading-snug truncate node-label-title">
        {data.label}
      </h4>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-neutral-700 bg-neutral-200/60 border border-neutral-300 px-2 py-0.5 rounded-md font-medium truncate max-w-[130px] node-action-badge">
          {typeTag}
        </span>
        <div className="flex items-center gap-2 node-meta-text">
          {data.errors && data.errors.length > 0 && data.isRunsTab ? (
            <div className="flex items-center gap-1 text-[10px] text-red-600 font-semibold node-meta-text">
              <AlertCircle className="size-3.5 text-red-500 node-meta-icon" />
              <span>Missing prompt</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[10px] text-neutral-500 node-meta-text">
              Model: {data.ai_config?.model || "gpt-4.1-nano"}
            </div>
          )}
          {data.isRunsTab && data.traceResult && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant={"outline"}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] h-6 px-2 cursor-pointer flex items-center gap-1 node-edit-btn"
                >
                  Trace Result <Eye className="size-3 node-edit-icon" />
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
      </div>
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
      <div
        style={{ width: data.width ? `${data.width}px` : "500px" }}
        className="workflow-node-card rounded-md border bg-blue-100 shadow-sm shadow-blue-500/25 px-4 py-3 select-none cursor-default"
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 justify-center items-center flex border rounded bg-white shrink-0 node-logo-wrapper">
              <Image
                src={iconSrc}
                alt={appName}
                width={18}
                height={18}
                className="object-contain node-logo-img"
              />
            </div>
            <span className="text-sm font-semibold uppercase node-header-title">
              {appName}
            </span>
          </div>
          {data.isRunsTab ? (
            <div className="h-6 flex items-center gap-1.5 justify-end shrink-0">
              {data.duration !== undefined && data.status !== "pending" && (
                <span
                  className={`text-[10px] font-mono text-neutral-700 ${data.status === "running" ? "animate-pulse" : ""}`}
                >
                  {data.duration}s
                </span>
              )}
              {data.status === "running" && (
                <Loader2 className="h-3.5 w-3.5 text-blue-600 animate-spin node-status-icon" />
              )}
              {data.status === "success" && (
                <Check className="h-3.5 w-3.5 text-emerald-600 font-bold node-status-icon" />
              )}
              {data.status === "failed" && (
                <X className="h-3.5 w-3.5 text-red-600 font-bold" />
              )}
              {data.status === "pending" && (
                <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
              )}
            </div>
          ) : (
            <Button
              type="button"
              size={"xs"}
              variant={"default"}
              onClick={(e) => {
                e.stopPropagation();
                data.onOpenSettings?.();
              }}
              className="text-[10px] rounded-sm flex items-center justify-center node-edit-btn"
              title="Configure app node"
            >
              <span className="node-edit-text mr-1">Edit</span>
              <Settings className="h-3.5 w-3.5 node-edit-icon" />
            </Button>
          )}
        </div>
        <h4 className="font-semibold text-xs leading-snug truncate node-label-title">
          {data.label}
        </h4>
        {actionName && (
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md font-medium truncate max-w-[130px] node-action-badge">
              {actionName}
            </span>
            {data.errors && data.errors.length > 0 && data.isRunsTab ? (
              <div className="flex items-center gap-1 text-[10px] text-red-700 font-semibold node-meta-text">
                <AlertCircle className="size-3.5 text-red-600 node-meta-icon" />
                <span>Missing parameter</span>
              </div>
            ) : data.isRunsTab ? (
              <div className="flex items-center gap-2 node-meta-text">
                <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-medium node-meta-text">
                  <Check className="size-3.5 text-emerald-600 node-meta-icon" />
                  <span>All params configured</span>
                </div>
                {data.traceResult && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant={"outline"}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] p-1.5! ml-2 cursor-pointer node-edit-btn"
                      >
                        Trace Result <Eye className="size-3.5 node-edit-icon" />
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
            ) : (
              paramCount > 0 && (
                <div className="flex items-center gap-1 text-[10px] node-meta-text">
                  {paramCount} paramter{paramCount !== 1 ? "s" : ""}{" "}
                  <Settings2 className="text-muted-foreground size-4 node-meta-icon" />
                </div>
              )
            )}
          </div>
        )}
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-2 !h-2"
        />
      </div>
    );
  }

  return (
    <div
      style={{ width: data.width ? `${data.width}px` : "500px" }}
      className="workflow-node-card rounded-md border border-neutral-200 bg-neutral-50 shadow-sm px-4 py-3 select-none cursor-default hover:shadow-md hover:border-neutral-300 transition-all"
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-white border flex items-center justify-center shrink-0 node-logo-wrapper">
            <Image
              src={iconSrc}
              alt={appName}
              width={18}
              height={18}
              className="object-contain node-logo-img"
            />
          </div>
          <span className="text-sm font-semibold uppercase node-header-title">
            {appName}
          </span>
        </div>
        {data.isRunsTab ? (
          <div className="h-6 flex items-center gap-1.5 justify-end shrink-0">
            {data.duration !== undefined && data.status !== "pending" && (
              <span
                className={`text-[10px] font-mono text-neutral-700 ${data.status === "running" ? "animate-pulse" : ""}`}
              >
                {data.duration}s
              </span>
            )}
            {data.status === "running" && (
              <Loader2 className="h-3.5 w-3.5 text-blue-600 animate-spin node-status-icon" />
            )}
            {data.status === "success" && (
              <Check className="h-3.5 w-3.5 text-emerald-600 font-bold node-status-icon" />
            )}
            {data.status === "failed" && (
              <X className="h-3.5 w-3.5 text-red-600 font-bold" />
            )}
            {data.status === "pending" && (
              <div className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
            )}
          </div>
        ) : (
          <Button
            type="button"
            size={"xs"}
            variant={"default"}
            onClick={(e) => {
              e.stopPropagation();
              data.onOpenSettings?.();
            }}
            className="text-[10px] rounded-sm flex items-center justify-center node-edit-btn"
            title="Configure app node"
          >
            <span className="node-edit-text mr-1">Edit</span>
            <Settings className="h-3.5 w-3.5 node-edit-icon" />
          </Button>
        )}
      </div>
      <h4 className="font-semibold text-xs text-neutral-800 leading-snug truncate node-label-title">
        {data.label}
      </h4>
      {actionName && (
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-neutral-500 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-md font-medium truncate max-w-[130px] node-action-badge">
            {actionName}
          </span>
          {data.errors && data.errors.length > 0 && data.isRunsTab ? (
            <div className="flex items-center gap-1 text-[10px] text-red-600 font-semibold node-meta-text">
              <AlertCircle className="size-3.5 text-red-500 node-meta-icon" />
              <span>Missing parameter</span>
            </div>
          ) : data.isRunsTab ? (
            <div className="flex items-center gap-2 node-meta-text">
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold node-meta-text">
                <Check className="size-3.5 text-emerald-500 node-meta-icon" />
                <span>All params configured</span>
              </div>
              {data.traceResult && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant={"outline"}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] p-1.5! ml-2 cursor-pointer node-edit-btn"
                    >
                      Trace Result <Eye className="size-3.5 node-edit-icon" />
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
          ) : (
            paramCount > 0 && (
              <div className="flex items-center gap-1 text-[10px] node-meta-text">
                {paramCount} paramter{paramCount !== 1 ? "s" : ""}{" "}
                <Settings2 className="text-muted-foreground size-4 node-meta-icon" />
              </div>
            )
          )}
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

function FlowFitter({ zoom }: { zoom: number }) {
  const { setViewport } = useReactFlow();
  const isInitial = useRef(true);

  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      const t = setTimeout(() => {
        setViewport({ x: 0, y: 0, zoom });
      }, 100);
      return () => clearTimeout(t);
    } else {
      setViewport({ x: 0, y: 0, zoom });
    }
  }, [setViewport, zoom]);

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
  setActiveTab,
  isRunning = false,
  nodeStatuses = {},
  nodeExecutionDurations = {},
  isDragging = false,
}: FlowPreviewProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const [currentRecipes, setCurrentRecipes] = useState<typeof recipes>([]);
  const [localNodes, setLocalNodes] = useState<any[]>([]);
  const [activePopoverNodeId, setActivePopoverNodeId] = useState<string | null>(
    null,
  );
  const [dimensions, setDimensions] = useState({ width: 0, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let rAFId: number;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (isDragging || width === 0 || dimensions.width === 0) {
          cancelAnimationFrame(rAFId);
          rAFId = requestAnimationFrame(() => {
            setDimensions({ width, height });
          });
        } else {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            setDimensions({ width, height });
          }, 300);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(rAFId);
      clearTimeout(timeoutRef.current);
    };
  }, [isDragging, dimensions.width]);
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

  const [nodeDurations, setNodeDurations] = useState<Record<string, number>>(
    {},
  );
  const runningNodeIdRef = useRef<string | null>(null);
  const runningStartTimeRef = useRef<number | null>(null);
  const prevIsRunningRef = useRef(isRunning);

  // Reset durations when isRunning transitions from false to true (a new run starts)
  useEffect(() => {
    if (isRunning && !prevIsRunningRef.current) {
      setNodeDurations({});
      runningNodeIdRef.current = null;
      runningStartTimeRef.current = null;
    }
    prevIsRunningRef.current = isRunning;
  }, [isRunning]);

  // Monitor nodeStatuses changes to start/stop step timers
  useEffect(() => {
    if (!isRunning) {
      // If workflow stopped, compute final duration of the last running node
      if (runningNodeIdRef.current && runningStartTimeRef.current) {
        const finalElapsed = (Date.now() - runningStartTimeRef.current) / 1000;
        const prevId = runningNodeIdRef.current;
        setNodeDurations((prev) => ({
          ...prev,
          [prevId]: Number(finalElapsed.toFixed(1)),
        }));
      }
      runningNodeIdRef.current = null;
      runningStartTimeRef.current = null;
      return;
    }

    // Find the currently running node ID
    const runningNodeId =
      Object.keys(nodeStatuses).find((id) => nodeStatuses[id] === "running") ||
      null;

    if (runningNodeId !== runningNodeIdRef.current) {
      // Record final elapsed time for previous node
      if (runningNodeIdRef.current && runningStartTimeRef.current) {
        const finalElapsed = (Date.now() - runningStartTimeRef.current) / 1000;
        const prevId = runningNodeIdRef.current;
        setNodeDurations((prev) => ({
          ...prev,
          [prevId]: Number(finalElapsed.toFixed(1)),
        }));
      }

      // Start new timer
      if (runningNodeId) {
        runningStartTimeRef.current = Date.now();
        setNodeDurations((prev) => ({
          ...prev,
          [runningNodeId]: 0,
        }));
      } else {
        runningStartTimeRef.current = null;
      }
      runningNodeIdRef.current = runningNodeId;
    }
  }, [nodeStatuses, isRunning]);

  // Interval hook to update active step duration every 100ms
  useEffect(() => {
    let interval: any;
    if (isRunning) {
      interval = setInterval(() => {
        const activeId = runningNodeIdRef.current;
        const startTime = runningStartTimeRef.current;
        if (activeId && startTime) {
          const elapsed = (Date.now() - startTime) / 1000;
          setNodeDurations((prev) => ({
            ...prev,
            [activeId]: Number(elapsed.toFixed(1)),
          }));
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

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

  // Dynamically calculate ZOOM based on the number of nodes (excluding task_trigger)
  const ZOOM = useMemo(() => {
    const filteredNodes = localNodes.filter(
      (node) => node.type !== "task_trigger",
    );
    const N = filteredNodes.length;
    if (N <= 1) return 1.0;
    if (N === 2) return 0.94;
    if (N === 3) return 0.88;
    return 0.82; // N >= 4 (it stays at 0.82 if more than 4 nodes)
  }, [localNodes]);

  // Lay out nodes vertically, auto-adjusting spacing and scale.
  // Exactly 4 nodes fit in the viewport; if > 4 nodes, it becomes scrollable.
  const { renderedNodes, canvasHeight, isScrollable } = useMemo(() => {
    const filteredNodes = localNodes.filter(
      (node) => node.type !== "task_trigger",
    );
    const N = filteredNodes.length;
    const H = dimensions.height || 600;

    const topPadding = 40;
    const bottomPadding = 160;

    // Convert viewport height H to ReactFlow canvas coordinate space
    const canvasH = H / ZOOM;
    const viewportAvailableHeight = Math.max(
      200,
      canvasH - topPadding - bottomPadding,
    );

    const nodeCanvasWidth = Math.min(
      500,
      Math.max(280, (dimensions.width - 32) / ZOOM),
    );

    // Pre-calculate errors and heights for all nodes to compute proper spacing
    interface PreparedNode {
      node: any;
      errors: string[];
      height: number;
    }

    const preparedNodes: PreparedNode[] = filteredNodes.map((node) => {
      const errors: string[] = [];
      const nodeType = node.type || "";
      if (nodeType.startsWith("ai_")) {
        const prompt = node.data?.ai_config?.prompt;
        if (!prompt || !prompt.trim()) {
          errors.push("System Prompt is empty");
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

      // All nodes have a standard height of 100px since the bottom error listing container is removed.
      const height = 100;

      return { node, errors, height };
    });

    const totalNodesHeight = preparedNodes.reduce(
      (sum, item) => sum + item.height,
      0,
    );

    let gap = 40;
    let startY = topPadding;
    let computedCanvasHeight = H;
    let scrollRequired = false;

    if (N > 0) {
      if (N === 1) {
        startY =
          topPadding +
          Math.max(0, viewportAvailableHeight - preparedNodes[0].height) / 2;
        gap = 0;
      } else {
        const minGap = 40;
        const totalMinGapsHeight = (N - 1) * minGap;
        if (totalNodesHeight + totalMinGapsHeight <= viewportAvailableHeight) {
          // All nodes fit within viewportAvailableHeight, distribute extra space evenly
          const remainingSpace = viewportAvailableHeight - totalNodesHeight;
          gap = Math.min(120, remainingSpace / (N - 1));
          startY = topPadding + (remainingSpace - (N - 1) * gap) / 2;
          computedCanvasHeight = H;
          scrollRequired = false;
        } else {
          // Total height exceeds viewport, use minimum gap and enable scroll
          gap = minGap;
          startY = topPadding;

          let currentY = startY;
          preparedNodes.forEach((item, index) => {
            currentY += item.height;
            if (index < N - 1) currentY += gap;
          });
          const totalCanvasHeight = currentY + bottomPadding;
          computedCanvasHeight = totalCanvasHeight * ZOOM;
          scrollRequired = true;
        }
      }
    }

    const nodeX = (dimensions.width / ZOOM - nodeCanvasWidth) / 2;

    // Assign final positions based on sequential offsets
    let currentY = startY;
    const nodesList = preparedNodes.map((item, index) => {
      const nodePos = currentY;
      currentY += item.height + gap;

      return {
        ...item.node,
        data: {
          ...item.node.data,
          _isFirst: index === 0,
          onOpenSettings: () => setActivePopoverNodeId(item.node.id),
          isRunsTab: activeTab === "runs",
          isSimulationActive: isRunning,
          status: nodeStatuses?.[item.node.id] || "pending",
          duration: nodeDurations?.[item.node.id],
          traceResult: item.node.data?.traceResult,
          errors: item.errors,
          width: nodeCanvasWidth,
        },
        position: { x: nodeX, y: nodePos },
      };
    });

    return {
      renderedNodes: nodesList,
      canvasHeight: computedCanvasHeight,
      isScrollable: scrollRequired,
    };
  }, [
    localNodes,
    activeTab,
    isRunning,
    nodeStatuses,
    nodeDurations,
    dimensions.width,
    dimensions.height,
    ZOOM,
  ]);

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

  const hasMissingParams = renderedNodes.some(
    (node) => node.data?.errors?.length > 0,
  );

  return (
    <div className="w-full h-full relative flex items-center justify-center overflow-hidden workflow-panel-container">
      <style>{`
        .workflow-panel-container {
          container-type: inline-size;
          container-name: workflow;
        }
        @container workflow (max-width: 500px) {
          .node-edit-text {
            display: none !important;
          }
          .bottom-fixes-text,
          .bottom-separator,
          .bottom-edit-full {
            display: none !important;
          }
          .bottom-edit-short {
            display: inline !important;
          }
          .workflow-warning-text,
          .workflow-warning-sep,
          .workflow-warning-btn-full {
            display: none !important;
          }
          .workflow-warning-btn-short {
            display: inline !important;
          }
        }

        /* Responsive scaling for node components based on canvas width */
        .react-flow__node {
          transition: width 0.15s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1) !important;
          will-change: transform, width;
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none !important;
        }
        .scrollbar-none {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        .node-header-title {
          font-size: 15px !important;
        }
        .node-label-title {
          font-size: 13px !important;
        }
        .node-action-badge {
          font-size: 11px !important;
        }
        .node-meta-text,
        .node-meta-text div,
        .node-meta-text span {
          font-size: 11px !important;
        }
        .node-edit-btn {
          font-size: 11px !important;
          padding: 3px 8px !important;
          height: auto !important;
        }
        .node-edit-icon {
          width: 14px !important;
          height: 14px !important;
        }
        .node-logo-wrapper {
          width: 24px !important;
          height: 24px !important;
        }
        .node-logo-img {
          width: 75% !important;
          height: 75% !important;
        }
        .node-status-icon,
        .node-meta-icon {
          width: 14px !important;
          height: 14px !important;
        }
        .node-error-container {
          padding-top: 8px !important;
          margin-top: 10px !important;
        }
        .node-error-item {
          font-size: 11px !important;
          gap: 4px !important;
        }
        .node-error-icon {
          width: 14px !important;
          height: 14px !important;
        }

        /* Narrow view adjustments */
        @container workflow (max-width: 480px) {
          .node-header-title {
            font-size: 13px !important;
          }
          .node-label-title {
            font-size: 11.5px !important;
          }
          .node-action-badge {
            font-size: 10px !important;
          }
          .node-meta-text,
          .node-meta-text div,
          .node-meta-text span,
          .node-error-item {
            font-size: 9.5px !important;
          }
          .node-logo-wrapper {
            width: 20px !important;
            height: 20px !important;
          }
          .node-status-icon,
          .node-meta-icon,
          .node-error-icon {
            width: 12px !important;
            height: 12px !important;
          }
        }

        @container workflow (max-width: 380px) {
          .node-header-title {
            font-size: 12px !important;
          }
          .node-label-title {
            font-size: 10.5px !important;
          }
          .node-action-badge {
            font-size: 9px !important;
          }
          .node-meta-text,
          .node-meta-text div,
          .node-meta-text span,
          .node-error-item {
            font-size: 9px !important;
          }
          .node-logo-wrapper {
            width: 18px !important;
            height: 18px !important;
          }
          .node-status-icon,
          .node-meta-icon,
          .node-error-icon {
            width: 11px !important;
            height: 11px !important;
          }
        }
      `}</style>
      {/* Scrollable Viewport Wrapper */}
      <div
        ref={containerRef}
        className={`absolute inset-0 z-0 bg-white overflow-x-hidden scrollbar-none select-none ${
          isScrollable ? "overflow-y-auto" : "overflow-y-hidden"
        }`}
      >
        {/* Inner Canvas of dynamic height */}
        <div
          style={{
            height: isScrollable ? `${canvasHeight}px` : "100%",
            width: "100%",
            minHeight: "100%",
          }}
        >
          <ReactFlow
            nodes={renderedNodes}
            edges={renderedEdges}
            nodeTypes={customNodeTypes}
            edgeTypes={customEdgeTypes}
            proOptions={{ hideAttribution: true }}
            fitView={false}
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
            <FlowFitter zoom={ZOOM} />

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
      </div>

      {/* Popovers rendered via React Portal to bypass transformed container styling/scaling issues and open centered globally on page */}
      {mounted &&
        activeNode &&
        activeNode.type?.startsWith("ai_") &&
        createPortal(
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
          />,
          document.body,
        )}

      {mounted &&
        activeNode &&
        activeNode.type === "composio_app" &&
        createPortal(
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
          />,
          document.body,
        )}

      {/* Recipe suggestions — shown only if no workflow loaded */}
      {!hasWorkflow && (
        <div className="relative max-w-md w-[calc(100%-48px)] border border-neutral-200 shadow rounded-md p-4 bg-neutral-50 select-none mx-6 my-6">
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
          <span className="bottom-fixes-text text-[11px] font-medium text-neutral-500 flex items-center gap-1.5 select-none">
            Want fixes &gt; ask agent to adjust or edit workflow..
          </span>
          <div className="h-3.5 w-px bg-neutral-200 bottom-separator" />
          <Button
            type="button"
            onClick={() => onEditWorkflow?.("edit this workflow as ")}
            className="text-xs rounded  cursor-pointer py-1 flex items-center justify-center"
          >
            <span className="bottom-edit-full">Edit workflow...</span>
            <span className="bottom-edit-short hidden">Edit</span>
          </Button>
        </div>
      )}

      {activeTab === "runs" &&
        hasWorkflow &&
        hasMissingParams &&
        !isRunning && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 rounded-lg border border-red-200 bg-white px-4 py-2 shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300 workflow-warning-box">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />

            <span className="text-xs text-neutral-600 workflow-warning-text">
              Some workflow nodes are missing required parameters.
            </span>

            <div className="h-4 w-px bg-neutral-200 workflow-warning-sep" />

            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs rounded-sm workflow-warning-btn"
              onClick={() => {
                setActiveTab?.("editor");
              }}
            >
              <span className="workflow-warning-btn-full">Go to Editor</span>
              <span className="workflow-warning-btn-short hidden">Editor</span>
            </Button>
          </div>
        )}
    </div>
  );
}
