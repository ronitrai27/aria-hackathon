import { useState, useEffect, useRef } from "react";
import {
  CheckCircle,
  RefreshCw,
  ChevronDown,
  Clock,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  steps?: Array<{ worker: string; status: string; message: string }>;
  traceLogs?: string[];
  executionTime?: number;
  isSystemNotification?: boolean;
  isError?: boolean;
}

export function TraceLogsViewer({
  traceLogs,
  isGenerating,
  message,
}: {
  traceLogs: string[];
  isGenerating: boolean;
  message?: ChatMessage;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isGenerating) return;
    setElapsed(0);
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [traceLogs.length, isOpen]);

  if (!traceLogs || traceLogs.length === 0) return null;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const currentDuration = isGenerating ? elapsed : message?.executionTime || 0;

  return (
    <div className="mt-3 p-4 bg-muted/40 backdrop-blur-md rounded-xl border border-border space-y-3 max-w-xl shadow-sm select-none dark:bg-zinc-900/40 dark:border-white/5">
      <div
        className="flex items-center justify-between border-b border-border dark:border-white/5 pb-2 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-[10px] font-bold text-muted-foreground dark:text-zinc-400 tracking-wider uppercase flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${isGenerating ? "bg-indigo-500 animate-pulse" : "bg-emerald-500"}`}
          />
          {isGenerating ? "Executing..." : `Executed in ${currentDuration}s`}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground dark:text-zinc-500 font-semibold bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
            {formatTime(currentDuration)}
          </span>
          <ChevronDown
            className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${isOpen ? "transform rotate-180" : ""}`}
          />
        </div>
      </div>
      {isOpen && (
        <div
          ref={containerRef}
          className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800"
        >
          {traceLogs.map((log, idx) => (
            <div
              key={idx}
              className="font-mono text-[10px] text-zinc-600 dark:text-zinc-400 py-0.5 border-l border-indigo-500/20 pl-2 leading-relaxed whitespace-pre-wrap break-all"
            >
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StatusStepper({
  steps,
}: {
  steps: Array<{ worker: string; status: string; message: string }>;
}) {
  if (!steps || steps.length === 0) return null;
  return (
    <div className="mt-3 p-4 bg-muted/40 backdrop-blur-md rounded-xl border border-border space-y-3 max-w-md shadow-sm select-none dark:bg-zinc-900/40 dark:border-white/5">
      <div className="flex items-center justify-between border-b border-border dark:border-white/5 pb-2">
        <span className="text-[10px] font-bold text-muted-foreground dark:text-zinc-400 tracking-wider uppercase flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
          {steps.some((s) =>
            [
              "memory_worker",
              "task_worker",
              "upload_worker",
              "reflect_worker",
              "brain_subgraph",
            ].includes(s.worker),
          )
            ? "Brain Action Trace Logs"
            : "Agent Action Trace Logs"}
        </span>
        <span className="text-[9px] text-muted-foreground dark:text-zinc-500 font-medium">
          Real-time status
        </span>
      </div>
      <div className="space-y-2.5">
        {steps.map((step, idx) => {
          const isDone = step.status === "completed" || step.status === "done";
          const isRunning =
            step.status === "running" || step.status === "starting";

          return (
            <div
              key={idx}
              className="flex items-start gap-3 text-xs text-foreground dark:text-neutral-300 transition-all duration-300"
            >
              {isDone ? (
                <div className="h-4 w-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 shadow-xs">
                  <CheckCircle className="h-2.5 w-2.5" />
                </div>
              ) : isRunning ? (
                <div className="h-4 w-4 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5 shadow-xs">
                  <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                </div>
              ) : (
                <div className="h-4 w-4 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0 mt-0.5 dark:bg-zinc-800/80 dark:border-zinc-700/50 dark:text-zinc-600" />
              )}
              <span
                className={`text-[11px] font-medium leading-normal ${
                  isDone
                    ? "text-muted-foreground dark:text-neutral-400"
                    : isRunning
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-muted-foreground dark:text-neutral-600"
                }`}
              >
                {step.message}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const formatMessageContent = (content: any) => {
  if (!content) return "";
  let text = "";
  if (typeof content !== "string") {
    if (Array.isArray(content)) {
      text = content
        .map((block) => {
          if (block && typeof block === "object") {
            if (block.type === "text") return block.text || "";
            return "";
          }
          return String(block);
        })
        .join("");
    } else {
      text = String(content);
    }
  } else {
    text = content;
  }
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.nodes || parsed.steps || parsed.workflow_name) {
        return `I have successfully created the workflow${
          parsed.workflow_name ? ` '${parsed.workflow_name}'` : ""
        }. Feel free to modify it or ask me to add anything else!`;
      }
    } catch (e) {
      // ignore
    }
  }
  if (text.includes('"nodes"') && text.includes('"edges"')) {
    return "I have successfully created the workflow. Feel free to modify it or ask me to add anything else!";
  }
  return text;
};

import React from "react";

export function CustomMarkdown({ content }: { content: any }) {
  if (!content) return null;

  const contentStr = typeof content === "string" ? content : String(content);
  // Clean raw content
  const cleanedContent = contentStr.replace(/```[a-zA-Z0-9]*\n?/g, "");
  const lines = cleanedContent.split("\n");

  const renderedElements: React.ReactNode[] = [];
  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;
  let currentParagraph: string[] = [];

  const flushParagraph = (key: string | number) => {
    if (currentParagraph.length > 0) {
      renderedElements.push(
        <p
          key={`p-${key}`}
          className="text-[12.5px] leading-relaxed text-zinc-800 dark:text-zinc-200 mt-2 mb-2"
        >
          {currentParagraph.map((line, lineIdx) => (
            <React.Fragment key={lineIdx}>
              {lineIdx > 0 && <br />}
              {parseInline(line)}
            </React.Fragment>
          ))}
        </p>,
      );
      currentParagraph = [];
    }
  };

  const flushList = (key: string | number) => {
    if (currentList) {
      const ListTag = currentList.type;
      const listClass =
        currentList.type === "ul" ? "list-disc pl-4" : "list-decimal pl-4";
      renderedElements.push(
        <ListTag
          key={`list-${key}`}
          className={`${listClass} space-y-1.5 text-zinc-700 dark:text-zinc-300 mt-2 mb-2`}
        >
          {currentList.items.map((item, itemIdx) => (
            <li key={itemIdx} className="text-[12.5px] leading-relaxed">
              {parseInline(item)}
            </li>
          ))}
        </ListTag>,
      );
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Check for blank lines
    if (!trimmed) {
      flushParagraph(i);
      flushList(i);
      continue;
    }

    // 2. Check for headers
    if (trimmed.startsWith("### ")) {
      flushParagraph(i);
      flushList(i);
      renderedElements.push(
        <h4
          key={`h4-${i}`}
          className="text-xs font-bold text-zinc-800 dark:text-zinc-100 mt-4 mb-1.5 tracking-wide uppercase"
        >
          {parseInline(trimmed.substring(4))}
        </h4>,
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushParagraph(i);
      flushList(i);
      renderedElements.push(
        <h3
          key={`h3-${i}`}
          className="text-sm font-bold text-zinc-800 dark:text-zinc-100 mt-5 mb-2 border-b border-zinc-200 dark:border-zinc-800 pb-1"
        >
          {parseInline(trimmed.substring(3))}
        </h3>,
      );
      continue;
    }
    if (trimmed.startsWith("# ")) {
      flushParagraph(i);
      flushList(i);
      renderedElements.push(
        <h2
          key={`h2-${i}`}
          className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 mt-5 mb-2.5"
        >
          {parseInline(trimmed.substring(2))}
        </h2>,
      );
      continue;
    }

    // 3. Check for bullet list items
    const bulletMatch = line.match(/^(\s*)[-*+]\s+(.*)/);
    if (bulletMatch) {
      flushParagraph(i);
      const content = bulletMatch[2];
      if (currentList && currentList.type === "ul") {
        currentList.items.push(content);
      } else {
        flushList(i);
        currentList = { type: "ul", items: [content] };
      }
      continue;
    }

    // 4. Check for ordered list items (e.g. 1. or 1))
    const orderedMatch = line.match(/^(\s*)(\d+[\.\)]\s+)(.*)/);
    if (orderedMatch) {
      flushParagraph(i);
      flushList(i);
      const prefix = orderedMatch[2];
      const content = orderedMatch[3];
      renderedElements.push(
        <p
          key={`ol-${i}`}
          className="text-[12.5px] leading-relaxed text-zinc-900 dark:text-zinc-100 font-bold mt-3 mb-1"
        >
          {prefix}
          {parseInline(content)}
        </p>,
      );
      continue;
    }

    // 5. Regular paragraph lines
    flushList(i);
    currentParagraph.push(line);
  }

  // Flush remaining elements
  flushParagraph("final");
  flushList("final");

  return <div className="space-y-1 select-text">{renderedElements}</div>;
}

// Parse bold (**text**) and code backticks (`code`) inline
function parseInline(text: string): React.ReactNode[] {
  if (!text) return [];
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  const matches = text.split(regex);

  return matches.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-bold text-zinc-900 dark:text-zinc-50">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      const codeContent = part.slice(1, -1);
      if (!codeContent.trim()) return null;
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded font-mono text-[10.5px] text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/50"
        >
          {codeContent}
        </code>
      );
    }
    return part;
  });
}

export function MemoryUpdateCard({ content }: { content: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [timestamp] = useState(() => {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  });

  // Extract facts list
  const factsLines = content
    .split("\n")
    .filter((line) => line.trim().startsWith("- "))
    .map((line) => line.trim().substring(2));

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 bg-zinc-50/50 dark:bg-zinc-900/10 shadow-xs max-w-xl transition-all duration-300">
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <span className="text-[14px]">🧠</span>
          <span className="text-[12.5px] font-bold text-zinc-900 dark:text-zinc-100">
            Brain Memory Updated
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
          <span className="text-[10px] font-medium font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
            {factsLines.length} updates
          </span>
          <span className="text-[10px] font-medium font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 dark:text-zinc-500">
            {timestamp}
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "transform rotate-180" : ""}`}
          />
        </div>
      </div>

      {isOpen && (
        <div className="mt-3 pt-3 border-t border-zinc-205 dark:border-zinc-800 space-y-2 animate-in slide-in-from-top-1 duration-250">
          {factsLines.map((fact, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 text-[12px] text-zinc-600 dark:text-zinc-400"
            >
              <span className="text-zinc-400 dark:text-zinc-600 mt-1 shrink-0">
                •
              </span>
              <span className="leading-relaxed">{fact}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export interface ChatMessageItemProps {
  message: ChatMessage;
}

export default function ChatMessageItem({ message }: ChatMessageItemProps) {
  const isUser = message.role === "user";
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<"up" | "down" | null>(null);

  const handleRetry = () => {
    const newThreadId = `brain_thread_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    router.push(`/home/agent?threadId=${newThreadId}`);
  };

  const isMemoryUpdate =
    !isUser &&
    (message.isSystemNotification ||
      message.content.startsWith("🧠 **Brain Memory Updated:**") ||
      message.content.includes("Brain Memory Updated"));

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`flex gap-3.5 w-full ${
        isUser ? "justify-end" : "justify-start"
      } ${isMemoryUpdate ? "pl-[46px]" : ""}`}
    >
      {!isUser && !isMemoryUpdate && (
        <div className="h-8 w-8 rounded-lg bg-linear-to-tr from-blue-600 via-purple-500 to-red-500 p-0.5 shadow-md flex items-center justify-center shrink-0 mt-1">
          <svg
            fill="currentColor"
            viewBox="0 0 36 48"
            className="w-4 h-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title>Aria Avatar</title>
            <path d="m0 6c10.1433 9.4404 25.8567 9.4404 36 0-9.4404 10.1433-9.4404 25.8567 0 36-10.1433-9.4404-25.8567-9.4404-36 0 9.44041-10.1433 9.44041-25.8567 0-36z" />
          </svg>
        </div>
      )}
      <div className="flex flex-col gap-1 w-full max-w-none">
        <div
          className={`rounded-2xl text-sm leading-relaxed ${
            isUser
              ? "p-4 bg-zinc-100 border border-zinc-200 text-zinc-900 dark:bg-zinc-800/90 dark:border-zinc-700/40 dark:text-neutral-100 rounded-tr-sm ml-auto shadow-xs max-w-[85%]"
              : "py-2 px-1 text-foreground dark:text-neutral-200 rounded-tl-sm w-full"
          }`}
        >
          {isUser ? (
            <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          ) : isMemoryUpdate ? (
            <MemoryUpdateCard content={message.content} />
          ) : (
            <CustomMarkdown content={formatMessageContent(message.content)} />
          )}

          {!isUser && message.isError && (
            <div className="mt-4 flex flex-col items-start gap-3">
              <Button
                onClick={handleRetry}
                variant="destructive"
                className="flex items-center gap-2 rounded-sm text-xs "
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry in new chat!
              </Button>
            </div>
          )}

          {!isUser && message.traceLogs && message.traceLogs.length > 0 ? (
            <TraceLogsViewer
              traceLogs={message.traceLogs}
              isGenerating={false}
              message={message}
            />
          ) : (
            !isUser &&
            message.steps &&
            message.steps.length > 0 && <StatusStepper steps={message.steps} />
          )}

          {!isUser &&
            !isMemoryUpdate &&
            message.executionTime !== undefined && (
              <div className="flex items-center gap-3.5 mt-3 pt-2 border-t border-zinc-200  text-[10.5px]  select-none">
                <span className="flex items-center gap-1 shrink-0 font-medium">
                  <Clock className="h-3.5 w-3.5 text-zinc-400" />
                  Executed in {message.executionTime}s
                </span>
                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    onClick={handleCopy}
                    className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors text-neutral-700 cursor-pointer"
                    title="Copy response"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    onClick={() => setLiked(liked === "up" ? null : "up")}
                    className={`p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer ${
                      liked === "up"
                        ? "text-emerald-500 hover:text-emerald-400"
                        : "text-neutral-700"
                    }`}
                    title="Like response"
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setLiked(liked === "down" ? null : "down")}
                    className={`p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer ${
                      liked === "down"
                        ? "text-rose-500 hover:text-rose-400"
                        : "text-neutral-700"
                    }`}
                    title="Dislike response"
                  >
                    <ThumbsDown className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
