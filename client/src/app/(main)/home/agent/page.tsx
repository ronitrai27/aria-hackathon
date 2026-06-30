"use client";

import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  Bell,
  Bot,
  Brain,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Lock,
  MoreHorizontal,
  Paperclip,
  Search,
  SendHorizontal,
  Share2,
  Sparkles,
  UserPlus,
  Workflow,
  X,
  FileText,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import type React from "react";
import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { toast } from "sonner";
import Typewriter from "typewriter-effect";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAgentChat } from "@/hooks/useAgentChat";
import { useAgentStore } from "@/hooks/useAgentStore";
import { useBrainChat } from "@/hooks/useBrainChat";
import { connectorIcons, models } from "@/lib/static";
import { api } from "../../../../../convex/_generated/api";
import ChatMessageItem, {
  StatusStepper,
} from "../../../../modules/Ai/components/ChatMessage";
import WorkflowChoiceDialog from "../../../../modules/WorkflowChoiceDialog";
import WorkflowPanel from "../../../../modules/workflows/components/WorkflowPanel";
import AgentChatMessages from "./AgentChatMessages";

interface SuggestionItem {
  title: string;
  description: string;
  shortDescription: string;
  prompt: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  iconBg: string;
  images?: string[];
  apps?: string[];
}

const brainSuggestions: SuggestionItem[] = [
  {
    title: "Browser Activities",
    description: "Create tasks from my previous important browser activities.",
    shortDescription: "Tasks from browser activities.",
    prompt: "Create tasks from my previous important browser activities.",
    icon: Brain,
    iconColor: "text-purple-500",
    iconBg: "bg-purple-500/10 group-hover:bg-purple-500/20",
  },
  {
    title: "Internet Usage",
    description:
      "Reflect my past activities and tell what I spent most hours on internet?",
    shortDescription: "Internet usage recap.",
    prompt:
      "Reflect my past activities and tell what I spent most hours on internet?",
    icon: Clock,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/10 group-hover:bg-amber-500/20",
  },
  {
    title: "Important Tasks",
    description:
      "Check my important emails, calendar and slack messages and make some tasks that are important.",
    shortDescription: "Sync emails, calendar & slack.",
    prompt:
      "Check my important emails, calendar and slack messages and make some tasks that are important.",
    icon: Workflow,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10 group-hover:bg-blue-500/20",
    images: ["/gmail.png", "/calendar.png", "/slack.png"],
  },
];

const agentSuggestions: SuggestionItem[] = [
  {
    title: "AI Trends Doc",
    description:
      "Research about latest AI trends and create a doc and send to email.",
    shortDescription: "Research AI trends & send doc.",
    prompt:
      "Research about latest AI trends, create a Google Doc, and send to my email.",
    icon: Sparkles,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10 group-hover:bg-blue-500/20",
    images: ["/logo.svg", "/docs.png", "/gmail.png"],
    apps: ["Google Docs", "Gmail"],
  },
  {
    title: "AI Jobs in India",
    description:
      "Research about latest AI jobs in India, send to slack and post in reddit.",
    shortDescription: "AI jobs: Slack & Reddit.",
    prompt:
      "Research about latest AI jobs in India, send details to Slack, and post on Reddit.",
    icon: Search,
    iconColor: "text-orange-500",
    iconBg: "bg-orange-500/10 group-hover:bg-orange-500/20",
    images: ["/logo.svg", "/slack.png", "/reddit.png"],
    apps: ["Slack", "Reddit"],
  },
  {
    title: "Linear & Todoist",
    description:
      "Fetch tasks from linear, send to slack and make those tasks in todoist.",
    shortDescription: "Linear tasks to Slack & Todoist.",
    prompt:
      "Fetch tasks from Linear, send a summary to Slack, and create those tasks in Todoist.",
    icon: Bot,
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-500/10 group-hover:bg-emerald-500/20",
    images: ["/linear.jpeg", "/slack.png", "/todoist.jpg"],
    apps: ["Linear", "Slack", "Todoist"],
  },
];

function AgentPageContent() {
  const [inputVal, setInputVal] = useState("");
  const [isPageReady, setIsPageReady] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [activeTab, setActiveTab] = useState<"editor" | "runs">("editor");
  const [isReadWriteActive, setIsReadWriteActive] = useState(true);
  const [isNarrow, setIsNarrow] = useState(false);
  const [selectedSuggestionApps, setSelectedSuggestionApps] = useState<
    string[]
  >([]);

  const { activeMode, setActiveMode, openConnectionDialog } = useAgentStore();

  const {
    messages: agentMessages,
    setMessages: setAgentMessages,
    isGenerating: isAgentGenerating,
    setIsGenerating: setIsAgentGenerating,
    activeSteps: agentSteps,
    setActiveSteps,
    activeTraceLogs: agentTraceLogs,
    setActiveTraceLogs: setAgentTraceLogs,
    workflowData,
    setWorkflowData,
    isRightOpen,
    setIsRightOpen,
    sendMessage: sendAgentMessage,
  } = useAgentChat();

  const {
    messages: brainMessages,
    setMessages: setBrainMessages,
    isGenerating: isBrainGenerating,
    isStreamingResponse: isBrainStreaming,
    activeTraceLogs: brainTraceLogs,
    activeSteps: brainSteps,
    pendingTasks,
    pendingTasksStatus,
    sendMessage: sendBrainMessage,
    handleApprove: handleBrainApprove,
    isLoadingSession,
  } = useBrainChat();

  const isBrainMode = activeMode === "brain";
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messages = isBrainMode ? brainMessages : agentMessages;
  const isGenerating = isBrainMode ? isBrainGenerating : isAgentGenerating;
  const activeTraceLogs = isBrainMode ? brainTraceLogs : agentTraceLogs;
  const activeSteps = isBrainMode ? brainSteps : agentSteps;
  const isStreamingResponse = isBrainMode ? isBrainStreaming : false;

  const [isSaving, setIsSaving] = useState(false);
  const saveWorkflow = useMutation(api.workflows.saveWorkflow);
  const updateLastRun = useMutation(api.workflows.updateLastRun);
  const workflows = useQuery(api.workflows.getWorkflows);

  // Workflow metadata state (passed down to WorkflowPanel)
  const [savedWorkflowId, setSavedWorkflowId] = useState<string | null>(null);
  const [isStarred, setIsStarred] = useState(false);
  const [workflowTitle, setWorkflowTitle] = useState("Untitled");

  // Load mode and input from URL search query parameter on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const mode = searchParams.get("mode");
      const input = searchParams.get("input");
      if (mode === "brain") {
        setActiveMode("brain");
      } else if (mode === "agent") {
        setActiveMode("agent");
      }
      if (input) {
        setInputVal(input);
      }
      if (mode || input) {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("mode");
        cleanUrl.searchParams.delete("input");
        window.history.replaceState(
          {},
          "",
          cleanUrl.pathname + cleanUrl.search,
        );
      }
    }
  }, [setActiveMode]);

  // Load workflow from URL search query parameter on mount
  useEffect(() => {
    if (typeof window !== "undefined" && workflows && workflows.length > 0) {
      const searchParams = new URLSearchParams(window.location.search);
      const workflowId = searchParams.get("workflowId");
      if (workflowId) {
        const wf = workflows.find((w) => w._id === workflowId);
        if (wf) {
          setWorkflowData({
            nodes: wf.structure.nodes,
            edges: wf.structure.edges,
          });
          setWorkflowTitle(wf.name);
          setIsStarred(wf.isStarred);
          setSavedWorkflowId(wf._id);
          setIsRightOpen(true);

          // Clear query parameter from URL to prevent duplicate loads
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete("workflowId");
          window.history.replaceState(
            {},
            "",
            cleanUrl.pathname + cleanUrl.search,
          );
        }
      }
    }
  }, [workflows, setWorkflowData, setIsRightOpen]);

  // Workflow-choice intercept state (Q2: edit vs new when workflow is open)
  const [showWorkflowChoice, setShowWorkflowChoice] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState("");
  const [isEditingWorkflow, setIsEditingWorkflow] = useState(false);

  // Custom Resizer States for industry-level, lightweight, and robust resizing (pure DOM style updates for 60fps drag)
  const containerRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const [rightWidth, setRightWidth] = useState(600); // Default to original 600px width
  const [isDragging, setIsDragging] = useState(false);
  const lastWidthRef = useRef(600);

  const startResizing = useCallback(
    (mouseDownEvent: React.MouseEvent) => {
      mouseDownEvent.preventDefault();
      lastWidthRef.current = rightWidth;
      setIsDragging(true);
    },
    [rightWidth],
  );

  useEffect(() => {
    if (!isRightOpen) {
      setRightWidth(60);
      if (rightPanelRef.current) {
        rightPanelRef.current.style.width = "60px";
      }
    } else {
      setRightWidth((prev) => {
        const next = prev < 600 ? 600 : prev;
        if (rightPanelRef.current) {
          rightPanelRef.current.style.width = `${next}px`;
        }
        return next;
      });
    }
  }, [isRightOpen]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newRightWidth = rect.right - e.clientX;
      const minRight = isRightOpen ? 380 : 60; // Keep the original min-width limit of 380px
      const maxRight = rect.width - 350; // Left pane minimum size is 350px
      const clampedWidth = Math.max(
        minRight,
        Math.min(maxRight, newRightWidth),
      );

      lastWidthRef.current = clampedWidth;
      if (rightPanelRef.current) {
        rightPanelRef.current.style.width = `${clampedWidth}px`;
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setRightWidth(lastWidthRef.current);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, isRightOpen]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  /** Extract app names from workflow nodes and match against connectorIcons keys */
  function extractAppsFromWorkflow(nodes: any[]): string[] {
    const knownApps = Object.keys(connectorIcons); // ["Gmail", "Slack", "GitHub", ...]
    const found = new Set<string>();

    for (const node of nodes) {
      // The key field is data.tool_name or data.label — e.g. "GMAIL_SEND_EMAIL"
      // Extract the app prefix: "GMAIL_SEND_EMAIL" → "GMAIL"
      const toolName: string =
        node.data?.tool_name ||
        node.data?.label ||
        node.data?.composio_config?.action_slug ||
        "";

      if (toolName) {
        const prefix = toolName.split("_")[0].toLowerCase(); // e.g. "gmail"
        for (const app of knownApps) {
          // Normalize: "Google Meet" → "googlemeet", "Gmail" → "gmail"
          const normalized = app.toLowerCase().replace(/\s+/g, "");
          if (
            normalized === prefix ||
            normalized.startsWith(prefix) ||
            prefix.startsWith(normalized)
          ) {
            found.add(app);
          }
        }
      }
    }
    return Array.from(found);
  }

  /** Build an edit-context prompt the agent can use */
  function buildEditPrompt(userRequest: string): string {
    if (!workflowData) return userRequest;
    const summary = (workflowData.nodes || [])
      .filter((n: any) => n.type !== "task_trigger")
      .map((n: any) => {
        const config =
          n.data?.ai_config ||
          n.data?.composio_config ||
          n.data?.parameters ||
          {};
        return `  - ${n.type || "node"}: ${JSON.stringify(config)}`;
      })
      .join("\n");

    const fullStructure = JSON.stringify(workflowData, null, 2);

    return [
      `[EDIT WORKFLOW]`,
      `Workflow ID: ${savedWorkflowId ?? "unsaved"}`,
      `Title: ${workflowTitle}`,
      `Current nodes:\n${summary || "  (none)"}`,
      `Full Structure JSON:`,
      fullStructure,
      ``,
      `User request: ${userRequest}`,
    ].join("\n");
  }

  function resolvePromptTemplate(prompt: string, allNodes: any[]): string {
    const hasTrigger = allNodes[0]?.type === "task_trigger";
    return prompt.replace(
      /\{{1,2}step[_\s](\d+)(?:\.([a-zA-Z0-9_\.\[\]]+))?\}{1,2}/g,
      (match, stepNumStr, path) => {
        const stepNum = parseInt(stepNumStr, 10);
        const stepIdx = hasTrigger ? stepNum : stepNum - 1;
        if (stepIdx >= 0 && stepIdx < allNodes.length) {
          const targetNode = allNodes[stepIdx];
          const trace = targetNode.data?.traceResult;
          if (trace) {
            if (path) {
              const parts = path.split(".");
              const checkObjects = [trace, trace.data, trace.result]
                .filter(Boolean)
                .map((obj) => {
                  if (typeof obj === "string") {
                    const trimmed = obj.trim();
                    if (
                      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
                      (trimmed.startsWith("[") && trimmed.endsWith("]"))
                    ) {
                      try {
                        return JSON.parse(trimmed);
                      } catch {
                        return obj;
                      }
                    }
                  }
                  return obj;
                });

              for (const obj of checkObjects) {
                let current = obj;
                let found = true;
                for (const part of parts) {
                  // Support array indexing like channels[0]
                  const arrayMatch = part.match(/^([a-zA-Z0-9_]+)\[(\d+)\]$/);
                  if (arrayMatch) {
                    const baseKey = arrayMatch[1];
                    const index = parseInt(arrayMatch[2], 10);
                    if (
                      current &&
                      typeof current === "object" &&
                      baseKey in current
                    ) {
                      const arr = (current as any)[baseKey];
                      if (Array.isArray(arr) && index < arr.length) {
                        current = arr[index];
                      } else {
                        found = false;
                        break;
                      }
                    } else {
                      found = false;
                      break;
                    }
                  } else if (
                    current &&
                    typeof current === "object" &&
                    part in current
                  ) {
                    current = current[part];
                  } else {
                    found = false;
                    break;
                  }
                }
                if (found && current !== undefined) {
                  return typeof current === "string"
                    ? current
                    : JSON.stringify(current);
                }
              }
              // Fallback for document_url/url -> display_url/url
              if (path.includes("document_url") || path.includes("url")) {
                for (const obj of checkObjects) {
                  if (obj && typeof obj === "object") {
                    if (obj.display_url) return String(obj.display_url);
                    if (obj.url) return String(obj.url);
                  }
                }
              }
              return `[Path ${path} not found in Step ${stepNumStr}]`;
            }

            if (typeof trace === "string") return trace;
            if (trace.result)
              return typeof trace.result === "string"
                ? trace.result
                : JSON.stringify(trace.result);
            if (trace.data)
              return typeof trace.data === "string"
                ? trace.data
                : JSON.stringify(trace.data);
            return JSON.stringify(trace);
          }
          return `[Step ${stepNumStr} output not available]`;
        }
        return match;
      },
    );
  }

  // Auto-save debounced effect
  useEffect(() => {
    if (!workflowData || !workflowData.nodes || workflowData.nodes.length === 0)
      return;

    setIsSaving(true);
    const delayDebounce = setTimeout(async () => {
      try {
        // Sanitize nodes and edges to make them serializable for Convex
        const sanitizedNodes = (workflowData.nodes || []).map((node: any) => {
          const { onOpenSettings, ...restData } = node.data || {};
          const serializableData = {
            label: restData.label,
            description: restData.description,
            fields: restData.fields,
            tool_name: restData.tool_name,
            ai_config: restData.ai_config,
            composio_config: restData.composio_config,
            traceResult: restData.traceResult,
          };
          return {
            id: node.id,
            type: node.type,
            position: node.position,
            data: serializableData,
          };
        });

        const sanitizedEdges = (workflowData.edges || []).map((edge: any) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          animated: edge.animated,
        }));

        const id = await saveWorkflow({
          name: workflowTitle,
          description: "Designed workflow graph",
          structure: {
            nodes: sanitizedNodes,
            edges: sanitizedEdges,
          },
        });
        if (id && !savedWorkflowId) {
          setSavedWorkflowId(id as string);
        }
      } catch (err) {
        console.error("Failed to auto-save workflow:", err);
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    return () => clearTimeout(delayDebounce);
  }, [workflowData, saveWorkflow]);

  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  const isWorkflowRunningRef = useRef(isWorkflowRunning);
  useEffect(() => {
    isWorkflowRunningRef.current = isWorkflowRunning;
  }, [isWorkflowRunning]);

  const runToastIdRef = useRef<string | number | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number | null>(null);
  const [nodeExecutionStatuses, setNodeExecutionStatuses] = useState<
    Record<string, "pending" | "running" | "success" | "failed">
  >({});
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  const handleNodesChange = useCallback(
    (newNodes: any[]) => {
      setWorkflowData((prev) => (prev ? { ...prev, nodes: newNodes } : null));
    },
    [setWorkflowData],
  );

  const isWorkflowReadyToRun = useCallback((nodes: any[]): boolean => {
    if (!nodes || nodes.length === 0) return false;
    return nodes.every((node) => {
      const type = node.type || "";
      if (type.startsWith("ai_")) {
        const prompt = node.data?.ai_config?.prompt;
        return typeof prompt === "string" && prompt.trim().length > 0;
      }
      if (type === "composio_app") {
        const params = node.data?.composio_config?.params_mapping || {};
        const hiddenParams = node.data?.composio_config?.hidden_params || [];
        const keys = Object.keys(params).filter((k) => !hiddenParams.includes(k));
        if (keys.length === 0) return true;
        return keys.every((k) => {
          const val = params[k];
          const valStr = val === null || val === undefined ? "" : String(val);
          return valStr.trim().length > 0;
        });
      }
      return true;
    });
  }, []);

  const getNodeValidationErrors = useCallback((node: any): string[] => {
    const errors: string[] = [];
    const type = node.type || "";
    if (type.startsWith("ai_")) {
      const prompt = node.data?.ai_config?.prompt;
      if (!prompt || !prompt.trim()) {
        errors.push("System Prompt is empty");
      }
    } else if (type === "composio_app") {
      const params = node.data?.composio_config?.params_mapping || {};
      const hiddenParams = node.data?.composio_config?.hidden_params || [];
      const keys = Object.keys(params).filter((k) => !hiddenParams.includes(k));
      keys.forEach((k) => {
        const val = params[k];
        const valStr = val === null || val === undefined ? "" : String(val);
        if (!valStr.trim()) {
          errors.push(`Parameter "${k.replace(/_/g, " ")}" is empty`);
        }
      });
    }
    return errors;
  }, []);

  const startSimulation = useCallback(
    (nodes: any[]) => {
      if (!nodes || nodes.length === 0) return;
      setIsWorkflowRunning(true);
      setCurrentStepIndex(0);
      setExecutionLogs([
        `[${new Date().toLocaleTimeString()}] 🚀 Initiating execution for workflow: Designed Automation Graph`,
        `[${new Date().toLocaleTimeString()}] 🛡️ Validating security tokens and node credentials...`,
        `[${new Date().toLocaleTimeString()}] ✅ Security validation complete. All connections authorized.`,
        `[${new Date().toLocaleTimeString()}] 📝 Starting execution sequence...`,
      ]);

      // Clear previous trace results from all nodes in the state
      setWorkflowData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          nodes: prev.nodes.map((n: any) => ({
            ...n,
            data: {
              ...n.data,
              traceResult: undefined,
            },
          })),
        };
      });

      const initialStatuses: Record<
        string,
        "pending" | "running" | "success" | "failed"
      > = {};
      nodes.forEach((n, idx) => {
        initialStatuses[n.id] = idx === 0 ? "running" : "pending";
      });
      setNodeExecutionStatuses(initialStatuses);

      // Record the last run execution
      if (savedWorkflowId) {
        updateLastRun({ id: savedWorkflowId as any }).catch((err) => {
          console.error("Failed to update last run:", err);
        });
      }

      // Show a loading toast at top-center
      const toastId = toast.loading("Running workflow...", {
        position: "top-center",
      });
      runToastIdRef.current = toastId;
    },
    [savedWorkflowId, updateLastRun, setWorkflowData],
  );

  const stopSimulation = useCallback(() => {
    setIsWorkflowRunning(false);
    setCurrentStepIndex(null);
    setNodeExecutionStatuses((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (next[key] === "running") {
          next[key] = "pending";
        }
      });
      return next;
    });
    setExecutionLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ⏹️ Workflow execution stopped by user.`,
    ]);
  }, []);

  // Simulation execution loop
  useEffect(() => {
    if (!isWorkflowRunning || currentStepIndex === null || !workflowData?.nodes)
      return;

    const nodes = workflowData.nodes;
    if (currentStepIndex >= nodes.length) {
      if (runToastIdRef.current) {
        toast.success("Workflow executed successfully!", {
          id: runToastIdRef.current,
          position: "top-center",
        });
        runToastIdRef.current = null;
      }
      setIsWorkflowRunning(false);
      setCurrentStepIndex(null);
      setExecutionLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 🎉 WORKFLOW COMPLETED SUCCESSFULLY!`,
        `[${new Date().toLocaleTimeString()}] 💾 State variables persisted. Graph completed in ${(nodes.length * 1.5).toFixed(1)}s.`,
      ]);
      return;
    }

    const currentNode = nodes[currentStepIndex];
    const delay = 1500;

    if (currentNode.type === "composio_app") {
      const actionSlug = currentNode.data?.composio_config?.action_slug;
      const params = currentNode.data?.composio_config?.params_mapping || {};

      const runComposio = async () => {
        setExecutionLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ðŸ”Œ [Composio] Executing ${actionSlug} for user ${user?._id}...`,
        ]);
        try {
          // Resolve prompt templates inside params
          const resolvedParams: Record<string, any> = {};
          const hiddenParams = currentNode.data?.composio_config?.hidden_params || [];
          for (const key in params) {
            if (hiddenParams.includes(key)) continue;
            const value = params[key];
            if (typeof value === "string") {
              resolvedParams[key] = resolvePromptTemplate(value, nodes);
            } else {
              resolvedParams[key] = value;
            }
          }

          const res = await fetch("/api/composio/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user?._id || "user_test",
              actionSlug,
              arguments: resolvedParams,
            }),
          });
          const result = await res.json();

          if (!isWorkflowRunningRef.current) return;

          if (!res.ok || result.error || result.successful === false) {
            throw new Error(
              result.error ||
                (result.data && result.data.message) ||
                "Execution unsuccessful",
            );
          }

          // Save traceResult on the node
          setWorkflowData((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              nodes: prev.nodes.map((n) =>
                n.id === currentNode.id
                  ? { ...n, data: { ...n.data, traceResult: result } }
                  : n,
              ),
            };
          });

          setNodeExecutionStatuses((prev) => ({
            ...prev,
            [currentNode.id]: "success",
          }));

          setExecutionLogs((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] âœ… Step ${currentStepIndex + 1}: ${currentNode.data?.label || currentNode.id} executed successfully.`,
          ]);

          const nextIndex = currentStepIndex + 1;
          if (nextIndex < nodes.length) {
            const nextNode = nodes[nextIndex];
            setNodeExecutionStatuses((prev) => ({
              ...prev,
              [nextNode.id]: "running",
            }));
            const appName = nextNode.type === "composio_app" ? "App" : "AI";
            setExecutionLogs((prev) => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] âš¡ Invoking Step ${nextIndex + 1} (${appName}): ${nextNode.data?.label || nextNode.id}...`,
            ]);
          }
          setCurrentStepIndex(nextIndex);
        } catch (err: any) {
          console.error("Execution error:", err);

          // Save traceResult as error
          setWorkflowData((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              nodes: prev.nodes.map((n) =>
                n.id === currentNode.id
                  ? {
                      ...n,
                      data: {
                        ...n.data,
                        traceResult: {
                          error: err.message || "Execution failed",
                        },
                      },
                    }
                  : n,
              ),
            };
          });

          setNodeExecutionStatuses((prev) => ({
            ...prev,
            [currentNode.id]: "failed",
          }));

          setExecutionLogs((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] âŒ Step ${currentStepIndex + 1}: ${currentNode.data?.label || currentNode.id} failed: ${err.message}`,
          ]);

          if (runToastIdRef.current) {
            toast.error(`Workflow failed: ${err.message || err}`, {
              id: runToastIdRef.current,
              position: "top-center",
            });
            runToastIdRef.current = null;
          }

          // Stop execution on failure
          setIsWorkflowRunning(false);
          setCurrentStepIndex(null);
        }
      };

      runComposio();
      return;
    }

    if (currentNode.type?.startsWith("ai_")) {
      const runAINode = async () => {
        setExecutionLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] 🤖 [AI Node] Executing ${currentNode.type} (${currentNode.data?.label || currentNode.id})...`,
        ]);
        try {
          const resolvedPrompt = resolvePromptTemplate(
            currentNode.data?.ai_config?.prompt || "",
            nodes,
          );

          const res = await fetch("/api/ai-vercel/workflow-trigger", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              role: currentNode.type.replace("ai_", ""),
              prompt: resolvedPrompt,
              extraInstructions:
                currentNode.data?.ai_config?.extra_instructions || "",
              format: currentNode.data?.ai_config?.format || "rich",
              provider: currentNode.data?.ai_config?.provider || "openai",
              citations: currentNode.data?.ai_config?.citations || false,
            }),
          });
          const result = await res.json();

          if (!isWorkflowRunningRef.current) return;

          if (!res.ok || result.error) {
            throw new Error(result.error || "AI Node Execution failed");
          }

          // Save traceResult on the node
          setWorkflowData((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              nodes: prev.nodes.map((n) =>
                n.id === currentNode.id
                  ? { ...n, data: { ...n.data, traceResult: result } }
                  : n,
              ),
            };
          });

          setNodeExecutionStatuses((prev) => ({
            ...prev,
            [currentNode.id]: "success",
          }));

          setExecutionLogs((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] ✅ Step ${currentStepIndex + 1}: ${currentNode.data?.label || currentNode.id} executed successfully.`,
          ]);

          const nextIndex = currentStepIndex + 1;
          if (nextIndex < nodes.length) {
            const nextNode = nodes[nextIndex];
            setNodeExecutionStatuses((prev) => ({
              ...prev,
              [nextNode.id]: "running",
            }));
            const appName = nextNode.type === "composio_app" ? "App" : "AI";
            setExecutionLogs((prev) => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] ⚡ Invoking Step ${nextIndex + 1} (${appName}): ${nextNode.data?.label || nextNode.id}...`,
            ]);
          }
          setCurrentStepIndex(nextIndex);
        } catch (err: any) {
          console.error("AI Node Execution error:", err);

          // Save traceResult as error
          setWorkflowData((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              nodes: prev.nodes.map((n) =>
                n.id === currentNode.id
                  ? {
                      ...n,
                      data: {
                        ...n.data,
                        traceResult: {
                          error: err.message || "Execution failed",
                        },
                      },
                    }
                  : n,
              ),
            };
          });

          setNodeExecutionStatuses((prev) => ({
            ...prev,
            [currentNode.id]: "failed",
          }));

          setExecutionLogs((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] ❌ Step ${currentStepIndex + 1}: ${currentNode.data?.label || currentNode.id} failed: ${err.message}`,
          ]);

          if (runToastIdRef.current) {
            toast.error(`Workflow failed: ${err.message || err}`, {
              id: runToastIdRef.current,
              position: "top-center",
            });
            runToastIdRef.current = null;
          }

          // Stop execution on failure
          setIsWorkflowRunning(false);
          setCurrentStepIndex(null);
        }
      };

      runAINode();
      return;
    }

    // Default simulation for non-composio and non-AI nodes
    const timer = setTimeout(() => {
      setNodeExecutionStatuses((prev) => ({
        ...prev,
        [currentNode.id]: "success",
      }));

      const nextIndex = currentStepIndex + 1;
      if (nextIndex < nodes.length) {
        const nextNode = nodes[nextIndex];
        setNodeExecutionStatuses((prev) => ({
          ...prev,
          [nextNode.id]: "running",
        }));

        setExecutionLogs((prev) => {
          const appName =
            nextNode.type === "composio_app"
              ? (
                  nextNode.data?.composio_config?.action_slug?.split("_")[0] ||
                  "App"
                ).toUpperCase()
              : "AI";
          return [
            ...prev,
            `[${new Date().toLocaleTimeString()}] âœ… Step ${currentStepIndex + 1}: ${currentNode.data?.label || currentNode.id} executed successfully.`,
            `[${new Date().toLocaleTimeString()}] âš¡ Invoking Step ${nextIndex + 1} (${appName}): ${nextNode.data?.label || nextNode.id}...`,
            nextNode.type?.startsWith("ai_")
              ? `[${new Date().toLocaleTimeString()}] ðŸ¤– model: ${nextNode.data?.ai_config?.model || "gemini-2.5-flash"} | prompt: "${nextNode.data?.ai_config?.prompt?.substring(0, 45)}..."`
              : `[${new Date().toLocaleTimeString()}] ðŸ”Œ action: ${nextNode.data?.composio_config?.action_slug || "integration"}`,
          ];
        });
      } else {
        setExecutionLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] âœ… Step ${currentStepIndex + 1}: ${currentNode.data?.label || currentNode.id} executed successfully.`,
        ]);
      }

      setCurrentStepIndex(nextIndex);
    }, delay);

    return () => clearTimeout(timer);
  }, [isWorkflowRunning, currentStepIndex, workflowData]);

  // Clean up run toast if simulation stops (e.g. manually canceled)
  useEffect(() => {
    if (!isWorkflowRunning && runToastIdRef.current) {
      toast.dismiss(runToastIdRef.current);
      runToastIdRef.current = null;
    }
  }, [isWorkflowRunning]);

  // Terminal auto scroll
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollTop = consoleEndRef.current.scrollHeight;
    }
  }, [executionLogs]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const user = useQuery(api.user.getCurrentUser);

  // Flip page-ready once Convex user data resolves (undefined = loading)
  useEffect(() => {
    if (user !== undefined) {
      // Small delay so the typewriter has a moment to breathe
      const t = setTimeout(() => setIsPageReady(true), 600);
      return () => clearTimeout(t);
    }
  }, [user]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (messages.length > 0 || isGenerating) {
      scrollToBottom();
    }
  }, [messages, isGenerating, activeSteps, scrollToBottom]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const observerRef = useRef<ResizeObserver | null>(null);

  const leftPaneRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (node !== null) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setIsNarrow(entry.contentRect.width < 580);
        }
      });
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

  const isAgentMode = activeMode === "agent";
  const unconnectedApps = isAgentMode
    ? selectedSuggestionApps.filter((app) => !user?.connecters?.includes(app))
    : [];
  const hasUnconnectedApps = unconnectedApps.length > 0;
  const hasNoAppsSelected = isAgentMode && selectedSuggestionApps.length === 0;

  const handlePaperclipClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_SIZE) {
      toast.error(
        "File size exceeds the 2MB limit! Please upload a smaller document.",
        {
          position: "top-center",
        },
      );
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    e.target.value = "";
  };

  const handleSend = async (
    overrideText?: string,
    skipWorkflowCheck = false,
  ) => {
    const textToSend = overrideText || inputVal;

    if (!textToSend.trim()) {
      if (isBrainMode && selectedFile) {
        toast.error(
          "Please add a description of what you want to do with the document!",
          {
            position: "top-center",
          },
        );
      }
      return;
    }

    if (isAgentMode) {
      if (selectedSuggestionApps.length === 0) {
        toast.error(
          "You need to select connected apps to continue using agent for making workflows.",
          {
            position: "top-center",
          },
        );
        return;
      }
      if (hasUnconnectedApps) {
        toast.error(
          "You need to select connected apps to continue using agent for making workflows.",
          {
            position: "top-center",
          },
        );
        return;
      }
    }

    const isEditIntent =
      isEditingWorkflow ||
      textToSend.toLowerCase().startsWith("edit this workflow as") ||
      textToSend.toLowerCase().startsWith("edit this worklow as");

    // Q2: If a workflow is open and user is sending a NEW free-form message,
    // intercept and ask: edit current workflow OR start fresh?
    if (
      !skipWorkflowCheck &&
      isAgentMode &&
      workflowData &&
      workflowData.nodes.length > 0 &&
      !overrideText &&
      !isEditIntent
    ) {
      setPendingPrompt(textToSend);
      setShowWorkflowChoice(true);
      return;
    }

    setInputVal("");
    setShowWorkflowChoice(false);

    if (isEditIntent && workflowData && !isBrainMode) {
      const enriched = buildEditPrompt(textToSend);
      setIsEditingWorkflow(false);
      sendAgentMessage(enriched, textToSend);
    } else {
      if (isBrainMode) {
        sendBrainMessage(textToSend, selectedFile);
        setSelectedFile(null);
      } else {
        sendAgentMessage(textToSend);
      }
    }
  };

  const selected = models.find((m) => m.value === selectedModel) || models[0];

  return (
    <div className="h-[calc(100vh-4rem)] w-[calc(100%+3rem)] -mx-6 -my-6 flex overflow-hidden bg-background relative">
      <div
        className={`h-full w-full flex transition-opacity duration-700 ease-in-out ${isPageReady ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        {/* Workflow choice dialog */}
        <WorkflowChoiceDialog
          open={showWorkflowChoice}
          workflowTitle={workflowTitle}
          onEditCurrent={() => {
            const apps = extractAppsFromWorkflow(workflowData?.nodes ?? []);
            if (apps.length > 0) setSelectedSuggestionApps(apps);

            let finalPrompt = "edit this workflow as -> ";
            if (pendingPrompt) {
              const cleanPrompt = pendingPrompt.replace(
                /^(edit this workflow as ->|edit this workflow as|edit this worklow as ->|edit this worklow as)\s*/i,
                "",
              );
              finalPrompt += cleanPrompt;
            }

            setInputVal(finalPrompt);
            setIsEditingWorkflow(true);
            setShowWorkflowChoice(false);
            setPendingPrompt("");
            setTimeout(() => {
              if (textareaRef.current) textareaRef.current.focus();
            }, 50);
          }}
          onStartFresh={() => {
            setWorkflowData(null);
            setWorkflowTitle("Untitled");
            setIsStarred(false);
            setSavedWorkflowId(null);
            setShowWorkflowChoice(false);
            setInputVal("");
            sendAgentMessage(pendingPrompt);
          }}
          onClose={() => {
            setShowWorkflowChoice(false);
            setPendingPrompt("");
          }}
        />
        {/* Global CSS overrides and custom morph animations */}
        <style>{`
        .writing-vertical {
          writing-mode: vertical-rl;
          text-orientation: mixed;
        }
        
        /* Shape morph animation: square -> circle -> rotating -> square */
        @keyframes shapeMorph {
          0% {
            border-radius: 1.25rem; /* Squircle (20px) */
            transform: rotate(0deg);
          }
          35% {
            border-radius: 50%; /* Circle */
            transform: rotate(120deg);
          }
          70% {
            border-radius: 1.25rem; /* Squircle (20px) */
            transform: rotate(240deg);
          }
          100% {
            border-radius: 1.25rem;
            transform: rotate(360deg);
          }
        }
        
        .animate-shape-morph {
          animation: shapeMorph 10s ease-in-out infinite;
        }
      `}</style>

        <div ref={containerRef} className="h-full w-full flex relative">
          {/* Left Pane: Agent Chat Space */}
          <div
            className={`h-full flex-1 min-w-[350px] relative overflow-hidden ${isDragging ? "pointer-events-none select-none" : ""}`}
          >
            <div
              ref={leftPaneRef}
              className="h-full w-full flex flex-col items-center justify-between p-8 bg-background relative overflow-hidden"
            >
              <div className="w-full flex justify-between items-center pb-4 opacity-0">
                <span className="text-xs text-muted-foreground">
                  Agent Mode
                </span>
              </div>

              {/* Scrolling chat messages history list */}
              {isLoadingSession ? (
                <div className="flex-1 flex flex-col items-center justify-center w-full my-auto opacity-70">
                  <div className="h-12 w-12 bg-linear-to-tr from-blue-600 via-purple-500 to-red-500 p-0.5 shadow-md flex items-center justify-center shrink-0 aria-morph-loading mb-4 animate-spin rounded-xl">
                    <svg
                      fill="currentColor"
                      viewBox="0 0 36 48"
                      className="w-6 h-7 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="m0 6c10.1433 9.4404 25.8567 9.4404 36 0-9.4404 10.1433-9.4404 25.8567 0 36-10.1433-9.4404-25.8567-9.4404-36 0 9.44041-10.1433 9.44041-25.8567 0-36z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground animate-pulse">
                    Loading chat...
                  </p>
                </div>
              ) : messages.length > 0 ? (
                <AgentChatMessages
                  messages={messages}
                  isGenerating={isGenerating}
                  isStreamingResponse={isStreamingResponse}
                  activeSteps={activeSteps}
                  activeTraceLogs={activeTraceLogs}
                  pendingTasks={isBrainMode ? pendingTasks : null}
                  pendingTasksStatus={isBrainMode ? pendingTasksStatus : null}
                  onApprove={isBrainMode ? handleBrainApprove : undefined}
                  isBrainMode={isBrainMode}
                />
              ) : (
                /* Welcome / loading area — skeleton fades out, real content fades in */
                <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl my-auto">
                  {/* ── Logo (always visible) ── */}
                  <div className="relative flex items-center justify-center w-16 h-16 mb-4 group cursor-pointer">
                    <div className="relative w-16 h-16 bg-linear-to-tr from-blue-600 via-purple-500 to-red-500 p-0.5 shadow-2xl flex items-center justify-center overflow-hidden animate-shape-morph">
                      <div className="absolute inset-0 rounded-[inherit] border border-white/20 bg-linear-to-b from-white/15 to-transparent" />
                      <svg
                        fill="currentColor"
                        viewBox="0 0 36 48"
                        className="w-9 h-11 text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.4)] relative z-10"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <title>Aria Logo</title>
                        <path d="m0 6c10.1433 9.4404 25.8567 9.4404 36 0-9.4404 10.1433-9.4404 25.8567 0 36-10.1433-9.4404-25.8567-9.4404-36 0 9.44041-10.1433 9.44041-25.8567 0-36z" />
                      </svg>
                    </div>
                  </div>

                  {/* ── Typewriter text — welcome ── */}
                  <div className="text-lg font-medium text-muted-foreground mb-8 text-center max-w-xl min-h-[2rem]">
                    <Typewriter
                      key="welcome"
                      onInit={(typewriter) => {
                        typewriter
                          .typeString("How can I help you today?")
                          .pauseFor(120000)
                          .deleteAll()
                          .typeString("Let's build a new database workflow.")
                          .pauseFor(120000)
                          .deleteAll()
                          .typeString(
                            "Need help configuring your integrations?",
                          )
                          .pauseFor(120000)
                          .deleteAll()
                          .typeString("Let's design a custom pipeline.")
                          .pauseFor(120000)
                          .start();
                      }}
                      options={{
                        loop: true,
                        delay: 80,
                        deleteSpeed: 40,
                        cursorClassName:
                          "text-blue-500 font-normal animate-pulse",
                      }}
                    />
                  </div>

                  {/* ── Cards — suggestions ── */}
                  <div
                    className={`grid w-full max-w-[680px] gap-3.5 mb-6 ${
                      isNarrow ? "grid-cols-1" : "grid-cols-3"
                    }`}
                  >
                    {(activeMode === "agent"
                      ? agentSuggestions
                      : brainSuggestions
                    ).map((s, idx) => (
                      <button
                        key={s.title}
                        type="button"
                        onClick={() => {
                          setInputVal(s.prompt);
                          if (s.apps) {
                            setSelectedSuggestionApps(s.apps);
                          } else {
                            setSelectedSuggestionApps([]);
                          }
                        }}
                        className={`flex text-left bg-card hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer relative overflow-hidden shadow-xs w-full ${
                          isNarrow
                            ? "flex-row items-center p-2 rounded-lg border border-border h-11"
                            : "flex-col items-start p-4 rounded-xl border border-border h-40"
                        }`}
                        style={{
                          transitionDelay: `${idx * 80}ms`,
                          animation: `fadeInUp 0.4s ease both`,
                          animationDelay: `${idx * 80}ms`,
                        }}
                      >
                        {isNarrow ? (
                          <>
                            <div
                              className={`p-1.5 rounded-lg ${s.iconBg} shrink-0 transition-colors duration-300`}
                            >
                              <s.icon
                                className={`h-3.5 w-3.5 ${s.iconColor}`}
                              />
                            </div>
                            <span className="text-[11px] text-muted-foreground font-medium truncate ml-2.5 flex-1 pr-1 group-hover:text-primary transition-colors duration-300">
                              {s.shortDescription}
                            </span>
                            {s.images && (
                              <div className="flex -space-x-1 ml-auto mr-2 shrink-0">
                                {s.images.map((img, i) => (
                                  <div
                                    key={i}
                                    className={`w-5 h-5 border border-card bg-white flex items-center justify-center shadow-xs overflow-hidden shrink-0 ${
                                      img.includes("logo.svg")
                                        ? "rounded-sm"
                                        : "rounded"
                                    }`}
                                  >
                                    <Image
                                      src={img}
                                      alt=""
                                      width={12}
                                      height={12}
                                      className={`object-contain ${
                                        img.includes("logo.svg") ? "invert" : ""
                                      }`}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between items-start w-full">
                              <div
                                className={`p-2 rounded-lg ${s.iconBg} mb-3 transition-colors duration-300`}
                              >
                                <s.icon
                                  className={`h-4.5 w-4.5 ${s.iconColor}`}
                                />
                              </div>
                              {s.images && (
                                <div className="flex -space-x-1.5 mt-1">
                                  {s.images.map((img, i) => (
                                    <div
                                      key={i}
                                      className={`w-5.5 h-5.5 border border-card bg-white flex items-center justify-center shadow-xs overflow-hidden ${
                                        img.includes("logo.svg")
                                          ? "rounded-sm"
                                          : "rounded-full"
                                      }`}
                                    >
                                      <Image
                                        src={img}
                                        alt=""
                                        width={15}
                                        height={15}
                                        className={`object-contain ${
                                          img.includes("logo.svg")
                                            ? "invert"
                                            : ""
                                        }`}
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <h4 className="font-semibold text-xs text-foreground mb-1 group-hover:text-primary transition-colors duration-300">
                              {s.title}
                            </h4>
                            <p className="text-[11px] text-muted-foreground leading-normal">
                              {s.description}
                            </p>
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Wrapper Container (with tabs on top) */}
              <div className="w-full max-w-2xl flex flex-col items-center shrink-0">
                {/* Tabs for Brain and Agent */}
                <div className="flex items-center gap-1 self-start ml-4 -mb-px z-10">
                  <button
                    type="button"
                    onClick={() => setActiveMode("brain")}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-t-xl flex items-center gap-1.5 transition-all cursor-pointer select-none ${
                      activeMode === "brain"
                        ? "bg-linear-to-tr from-blue-600 via-purple-500 to-red-500 text-white shadow-sm"
                        : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border border-b-transparent hover:bg-muted/60"
                    }`}
                  >
                    <Brain className="h-4 w-4" />
                    Ask Brain
                  </button>
                  <button
                    id="tour-chat-agent-toggle"
                    type="button"
                    onClick={() => {
                      if (selectedFile) {
                        toast.error(
                          "Please remove or submit the attached document before switching to Agent mode!",
                          {
                            position: "top-center",
                          },
                        );
                        return;
                      }
                      setActiveMode("agent");
                    }}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-t-xl flex items-center gap-1.5 transition-all cursor-pointer select-none ${
                      activeMode === "agent"
                        ? "bg-linear-to-tr from-blue-600 via-purple-500 to-red-500 text-white shadow-sm"
                        : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border border-b-transparent hover:bg-muted/60"
                    }`}
                  >
                    <Bot className="h-4 w-4" />
                    Agent
                  </button>
                </div>

                <div
                  className={`relative w-full bg-muted/30 border border-border rounded-2xl focus-within:border-ring/50 focus-within:ring-2 focus-within:ring-ring/15 transition-all shadow-sm ${
                    isNarrow ? "p-2.5" : "p-3"
                  }`}
                >
                  {isBrainMode && selectedFile && (
                    <div className="flex items-center gap-2 bg-background/80 backdrop-blur-xs border border-border rounded-lg p-2 mb-2 w-fit max-w-full">
                      <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                      <div className="flex min-w-0 flex-col">
                        <span className="max-w-[200px] truncate text-xs font-medium text-foreground">
                          {selectedFile.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedFile(null)}
                        className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}

                  <Textarea
                    ref={textareaRef}
                    placeholder={
                      activeMode === "agent"
                        ? "Create Complex automated workflows in single go..."
                        : "Get tasks suggestion from past activity"
                    }
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    className={`w-full resize-none bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:border-0 p-1 pr-12 text-foreground placeholder:text-muted-foreground/80 overflow-y-auto ${
                      isNarrow
                        ? "min-h-[60px] max-h-[120px] text-sm"
                        : "min-h-[80px] max-h-[140px] text-base md:text-sm"
                    }`}
                  />

                  <div
                    className={`flex items-center justify-between border-t border-border/40 ${
                      isNarrow ? "mt-1.5 pt-2" : "mt-2 pt-2"
                    }`}
                  >
                    {/* Left attachment button */}
                    <div className="flex items-center gap-2">
                      {activeMode === "brain" && (
                        <>
                          <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                            accept=".pdf,.docx,.doc,.xls,.xlsx,.csv,.pptx,.ppt,.txt"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handlePaperclipClick}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg cursor-pointer"
                          >
                            <Paperclip className="h-4 w-4" />
                          </Button>
                        </>
                      )}

                      {activeMode === "agent" ? (
                        <div className="relative" ref={popoverRef}>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setIsPopoverOpen(!isPopoverOpen);
                              }
                            }}
                            className="border border-border/80 shadow-xs p-1.5 px-3 rounded-full flex items-center gap-2 bg-white/90 hover:bg-neutral-50 dark:bg-zinc-900/90 dark:hover:bg-zinc-800 transition-colors select-none cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            {selectedSuggestionApps.length === 0 ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-semibold text-muted-foreground select-none">
                                  {isNarrow ? "Apps" : "Apps: 0 selected"}
                                </span>
                                {!isNarrow && (
                                  <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-border/80 text-[10px] shrink-0">
                                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                                    <span className="text-[9px] select-none shrink-0">
                                      0 selected
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                {!isNarrow && (
                                  <span className="text-[10px] font-semibold text-muted-foreground select-none">
                                    Apps ({selectedSuggestionApps.length}):
                                  </span>
                                )}
                                <div className="flex -space-x-0.5">
                                  {selectedSuggestionApps.map((app) => {
                                    const iconSrc = connectorIcons[app];
                                    if (!iconSrc) return null;
                                    const isConnected =
                                      user?.connecters?.includes(app);
                                    return (
                                      <button
                                        key={app}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openConnectionDialog(app);
                                        }}
                                        className="relative h-5 w-5 rounded overflow-hidden flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                                        title={`${app}${isConnected ? " (Connected) - Click to manage" : " (Not connected) - Click to connect"}`}
                                      >
                                        <Image
                                          src={iconSrc}
                                          alt={app}
                                          width={16}
                                          height={16}
                                          className="object-contain"
                                        />
                                        {!isConnected && (
                                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <AlertCircle className="h-3 w-3 text-red-600 bg-white rounded-full shrink-0" />
                                          </div>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                                {!isNarrow &&
                                  (() => {
                                    const unconnected =
                                      selectedSuggestionApps.filter(
                                        (app) =>
                                          !user?.connecters?.includes(app),
                                      );
                                    const hasUnconnectedApps =
                                      unconnected.length > 0;
                                    return hasUnconnectedApps ? (
                                      <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-border/80 text-[10px] shrink-0">
                                        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                                        <span className="text-[9px] select-none shrink-0">
                                          Connection Required
                                        </span>
                                      </div>
                                    ) : null;
                                  })()}
                              </div>
                            )}
                            <ChevronUp
                              className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200"
                              style={{
                                transform: isPopoverOpen
                                  ? "rotate(180deg)"
                                  : "none",
                              }}
                            />
                          </div>

                          {isPopoverOpen && (
                            <div className="absolute bottom-full left-0 mb-2.5 z-50 w-64 bg-card text-card-foreground border border-border rounded-xl shadow-xl p-3 flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-foreground">
                                  Select Apps (Free limit: 3)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setIsPopoverOpen(false)}
                                  className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <input
                                  type="text"
                                  value={searchQuery}
                                  onChange={(e) =>
                                    setSearchQuery(e.target.value)
                                  }
                                  placeholder="Search apps..."
                                  className="w-full bg-muted/50 border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                                {searchQuery && (
                                  <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>

                              <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1">
                                {Object.keys(connectorIcons)
                                  .filter((app) =>
                                    app
                                      .toLowerCase()
                                      .includes(searchQuery.toLowerCase()),
                                  )
                                  .map((app) => {
                                    const isSelected =
                                      selectedSuggestionApps.includes(app);
                                    const iconSrc = connectorIcons[app];
                                    return (
                                      <div
                                        key={app}
                                        onClick={() => {
                                          if (isSelected) {
                                            setSelectedSuggestionApps(
                                              selectedSuggestionApps.filter(
                                                (a) => a !== app,
                                              ),
                                            );
                                          } else {
                                            if (
                                              selectedSuggestionApps.length >= 3
                                            ) {
                                              return;
                                            }
                                            setSelectedSuggestionApps([
                                              ...selectedSuggestionApps,
                                              app,
                                            ]);
                                          }
                                        }}
                                        className={`w-full flex items-center justify-between p-1.5 rounded-lg text-xs text-left transition-colors cursor-pointer ${
                                          isSelected
                                            ? "bg-primary/10 text-primary hover:bg-primary/15"
                                            : "hover:bg-muted/50 text-foreground"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          {iconSrc && (
                                            <div className="relative h-5 w-5 rounded overflow-hidden flex items-center justify-center shrink-0">
                                              <Image
                                                src={iconSrc}
                                                alt={app}
                                                width={16}
                                                height={16}
                                                className="object-contain"
                                              />
                                            </div>
                                          )}
                                          <span>{app}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {isSelected && (
                                            <span className="text-[10px] font-bold text-primary mr-1">
                                              Selected
                                            </span>
                                          )}
                                          {user?.connecters?.includes(app) ? (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openConnectionDialog(app);
                                              }}
                                              className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400 text-[10px] font-medium flex items-center justify-center gap-0.5 transition-all shadow-sm cursor-pointer hover:bg-emerald-100 rounded-md shrink-0"
                                            >
                                              Connected
                                            </button>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openConnectionDialog(app);
                                              }}
                                              className="px-2 py-0.5 bg-white border border-border text-[10px] font-medium flex items-center justify-center gap-0.5 transition-all shadow-sm cursor-pointer hover:bg-muted rounded-md shrink-0"
                                            >
                                              Connect{" "}
                                              <span className="font-semibold text-xs">
                                                +
                                              </span>
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                {Object.keys(connectorIcons).filter((app) =>
                                  app
                                    .toLowerCase()
                                    .includes(searchQuery.toLowerCase()),
                                ).length === 0 && (
                                  <div className="text-[10px] text-muted-foreground text-center py-4">
                                    No apps found
                                  </div>
                                )}
                              </div>

                              {selectedSuggestionApps.length >= 3 && (
                                <div className="mt-1 pt-1.5 border-t border-border/40 text-[9px] text-amber-500 dark:text-amber-400 font-medium leading-snug">
                                  âš ï¸ Max 3 apps selected. For higher limits
                                  upgrade!
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : isNarrow ? (
                        <button
                          type="button"
                          onClick={() =>
                            setIsReadWriteActive(!isReadWriteActive)
                          }
                          className={`w-8 h-4.5 rounded-full transition-colors duration-200 relative cursor-pointer shrink-0 outline-none border border-border shadow-xs ${
                            isReadWriteActive ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                          title="Toggle Read & Write Mode"
                        >
                          <span
                            className={`block w-3.5 h-3.5 bg-white rounded-full shadow-xs transition-transform duration-200 absolute top-[1px] left-0.5 ${
                              isReadWriteActive
                                ? "translate-x-3.5"
                                : "translate-x-0"
                            }`}
                          />
                        </button>
                      ) : (
                        <div className="border border-border shadow-sm p-1 pr-2.5 rounded-full flex items-center gap-2 bg-white">
                          <div className="flex space-x-0.5">
                            <Image
                              className="inline-block h-4.5 w-4.5 object-contain bg-background"
                              src="/outlook.jpeg"
                              alt="Outlook"
                              width={17}
                              height={17}
                            />
                            <Image
                              className="inline-block h-4.5 w-4.5 object-contain bg-background"
                              src="/gmail.png"
                              alt="Gmail"
                              width={17}
                              height={17}
                            />
                            <Image
                              className="inline-block h-4.5 w-4.5 object-contain bg-background"
                              src="/calendar.png"
                              alt="Calendar"
                              width={17}
                              height={17}
                            />
                          </div>
                          <span className="text-[10px] font-medium text-muted-foreground select-none">
                            Read & Write
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setIsReadWriteActive(!isReadWriteActive)
                            }
                            className={`w-8 h-4.5 rounded-full transition-colors duration-200 relative cursor-pointer shrink-0 outline-none ${
                              isReadWriteActive
                                ? "bg-emerald-500"
                                : "bg-rose-500"
                            }`}
                          >
                            <span
                              className={`block w-3.5 h-3.5 bg-white rounded-full transition-transform duration-200 absolute top-0.5 left-0.5 ${
                                isReadWriteActive
                                  ? "translate-x-3"
                                  : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Right options / Actions */}
                    <div className="flex items-center gap-1 relative">
                      <Select
                        value={selectedModel}
                        onValueChange={setSelectedModel}
                      >
                        <SelectTrigger
                          className="
      h-9
      px-3
      border-0
      shadow-none
      bg-transparent
      hover:bg-muted/40 
      rounded-md
      gap-2
      focus:ring-0
      cursor-pointer
    "
                        >
                          <div className="flex items-center gap-2">
                            <Image
                              src={selected.logo}
                              alt=""
                              width={16}
                              height={16}
                              className="rounded-sm"
                            />

                            <span className="text-[13px] font-medium">
                              {isNarrow ? selected.short : selected.label}
                            </span>
                          </div>

                          {/* <ChevronDown className="h-3.5 w-3.5 opacity-60" /> */}
                        </SelectTrigger>

                        <SelectContent
                          position="popper"
                          side="top"
                          avoidCollisions={false}
                          className="
      w-[250px]
      rounded-xl
      p-1
      shadow-xl
    "
                        >
                          {models.map((model) => (
                            <SelectItem
                              key={model.value}
                              value={model.value}
                              disabled={model.disabled}
                              className="
          h-10
          rounded-lg
          px-2
          cursor-pointer
        "
                            >
                              <div className="flex w-full items-center">
                                <div className="flex items-center gap-3">
                                  <Image
                                    src={model.logo}
                                    alt=""
                                    width={18}
                                    height={18}
                                  />

                                  <span
                                    className={`text-[13px] ${
                                      model.disabled
                                        ? "text-muted-foreground"
                                        : "font-medium"
                                    }`}
                                  >
                                    {isNarrow ? model.short : model.label}
                                  </span>
                                </div>

                                <div className="ml-auto flex items-center">
                                  {model.disabled && (
                                    <Lock className="h-3.5 w-3.5 text-muted-foreground/60" />
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* ------ */}
                      <Button
                        type="button"
                        size="icon"
                        onClick={() => handleSend()}
                        className="h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-sm ml-1 cursor-pointer disabled:opacity-50"
                        disabled={!inputVal.trim() || isGenerating}
                      >
                        <SendHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Separator / Sash */}
          {isPageReady && isRightOpen && (
            <div
              onMouseDown={startResizing}
              className="w-px h-full bg-border relative cursor-col-resize z-40 shrink-0 select-none group"
            >
              {/* Grab hit-area */}
              <div className="absolute top-0 bottom-0 -left-1.5 w-3 h-full" />
              {/* Visual highlight line */}
              <div
                className={`absolute top-0 bottom-0 -left-[1px] w-[3px] bg-blue-600 opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${
                  isDragging ? "opacity-100!" : ""
                }`}
              />
            </div>
          )}

          {/* Right Pane: Workflow Panel — only mount after page is ready */}
          {isPageReady && (
            <div
              ref={rightPanelRef}
              className={`h-full shrink-0 overflow-hidden will-change-[width] ${isDragging ? "pointer-events-none select-none" : "transition-[width] duration-300 ease-in-out"}`}
              style={{
                width: `${rightWidth}px`,
                maxWidth: isRightOpen ? "calc(100% - 350px)" : undefined,
              }}
            >
              <WorkflowPanel
                isDragging={isDragging}
                isRightOpen={isRightOpen}
                setIsRightOpen={setIsRightOpen}
                isPageReady={isPageReady}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                workflowData={workflowData}
                setWorkflowData={setWorkflowData}
                isSaving={isSaving}
                isWorkflowRunning={isWorkflowRunning}
                setIsWorkflowRunning={setIsWorkflowRunning}
                setCurrentStepIndex={setCurrentStepIndex}
                stopSimulation={stopSimulation}
                nodeExecutionStatuses={nodeExecutionStatuses}
                isWorkflowReadyToRun={isWorkflowReadyToRun}
                startSimulation={startSimulation}
                handleNodesChange={handleNodesChange}
                onSelectSuggestion={(prompt, apps) => {
                  if (activeMode === "brain") setActiveMode("agent");
                  setSelectedSuggestionApps(apps || []);
                  setInputVal(prompt);
                }}
                onEditWorkflow={(text) => {
                  if (activeMode === "brain") setActiveMode("agent");
                  const apps = extractAppsFromWorkflow(
                    workflowData?.nodes ?? [],
                  );
                  if (apps.length > 0) setSelectedSuggestionApps(apps);

                  let finalPrompt = "edit this workflow as -> ";
                  if (text) {
                    const cleanPrompt = text.replace(
                      /^(edit this workflow as ->|edit this workflow as|edit this worklow as ->|edit this worklow as)\s*/i,
                      "",
                    );
                    finalPrompt += cleanPrompt;
                  }

                  setInputVal(finalPrompt);
                  setIsEditingWorkflow(true);
                  setTimeout(() => {
                    if (textareaRef.current) textareaRef.current.focus();
                  }, 50);
                }}
                savedWorkflowId={savedWorkflowId}
                setSavedWorkflowId={setSavedWorkflowId}
                isStarred={isStarred}
                setIsStarred={setIsStarred}
                workflowTitle={workflowTitle}
                setWorkflowTitle={setWorkflowTitle}
              />
            </div>
          )}
        </div>
      </div>

      {/* Centered Loading Overlay */}
      <div
        className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-background p-8 transition-all duration-700 ease-in-out ${
          isPageReady
            ? "opacity-0 pointer-events-none scale-98 blur-xs"
            : "opacity-100 pointer-events-auto scale-100"
        }`}
      >
        <div className="flex flex-col items-center justify-center w-full max-w-2xl text-center">
          {/* ── Logo ── */}
          <div className="relative flex items-center justify-center w-16 h-16 mb-4">
            <div className="relative w-16 h-16 bg-linear-to-tr from-blue-600 via-purple-500 to-red-500 p-0.5 shadow-2xl flex items-center justify-center overflow-hidden animate-shape-morph">
              <div className="absolute inset-0 rounded-[inherit] border border-white/20 bg-linear-to-b from-white/15 to-transparent" />
              <svg
                fill="currentColor"
                viewBox="0 0 36 48"
                className="w-9 h-11 text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.4)] relative z-10"
                xmlns="http://www.w3.org/2000/svg"
              >
                <title>Aria Logo</title>
                <path d="m0 6c10.1433 9.4404 25.8567 9.4404 36 0-9.4404 10.1433-9.4404 25.8567 0 36-10.1433-9.4404-25.8567-9.4404-36 0 9.44041-10.1433 9.44041-25.8567 0-36z" />
              </svg>
            </div>
          </div>

          {/* ── Typewriter text — loading ── */}
          <div className="text-lg font-medium text-muted-foreground mb-8 text-center max-w-xl min-h-[2rem]">
            <Typewriter
              key="setup"
              onInit={(typewriter) => {
                typewriter
                  .typeString("Setting up environment")
                  .pauseFor(300)
                  .typeString(".")
                  .pauseFor(250)
                  .typeString(".")
                  .pauseFor(250)
                  .typeString(".")
                  .pauseFor(500)
                  .deleteChars(3)
                  .typeString(".")
                  .pauseFor(250)
                  .typeString(".")
                  .pauseFor(250)
                  .typeString(".")
                  .pauseFor(500)
                  .deleteChars(3)
                  .typeString(".")
                  .pauseFor(250)
                  .typeString(".")
                  .pauseFor(250)
                  .typeString(".")
                  .start();
              }}
              options={{
                loop: false,
                delay: 55,
                cursorClassName: "text-purple-400 font-normal animate-pulse",
              }}
            />
          </div>

          {/* ── Skeleton cards ── */}
          <div className="grid w-full max-w-2xl gap-3.5 mb-6 grid-cols-1 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-xl animate-pulse h-11 sm:h-36"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <div className="hidden sm:flex p-4 flex-col gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted" />
                  <div className="w-24 h-3 rounded bg-muted" />
                  <div className="w-full h-2 rounded bg-muted/60" />
                  <div className="w-4/5 h-2 rounded bg-muted/40" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-zinc-950">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      }
    >
      <AgentPageContent />
    </Suspense>
  );
}
