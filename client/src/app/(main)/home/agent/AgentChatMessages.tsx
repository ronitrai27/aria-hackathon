"use client";

import { useEffect, useRef } from "react";
import ChatMessageItem, {
  StatusStepper,
  TraceLogsViewer,
} from "../../../../modules/Ai/components/ChatMessage";

interface AgentChatMessagesProps {
  messages: any[];
  isGenerating: boolean;
  activeSteps: any[];
  activeTraceLogs: string[];
  pendingTasks?: any[] | null;
  onApprove?: (approved: boolean) => void;
}

export default function AgentChatMessages({
  messages,
  isGenerating,
  activeSteps,
  activeTraceLogs,
  pendingTasks,
  onApprove,
}: AgentChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0 || isGenerating || (pendingTasks && pendingTasks.length > 0)) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isGenerating, activeSteps, pendingTasks]);

  if (messages.length === 0) return null;

  return (
    <div className="flex-1 w-full max-w-4xl overflow-y-auto py-4 space-y-6 pr-2 select-text scrollbar-none flex flex-col">
      {messages.map((msg, idx) => (
        <ChatMessageItem key={idx} message={msg} />
      ))}
      
      {(() => {
        const hasStagedAssistant = messages.length > 0 && messages[messages.length - 1].role === "assistant";
        const isExecuting = activeSteps.some((s: any) => s.status === "running" && s.worker !== "brain_supervisor");
        
        if (isGenerating && activeSteps.length > 0 && !hasStagedAssistant) {
          return (
            <div className="flex gap-3.5 w-full justify-start">
              <div className="h-8 w-8 rounded-lg bg-linear-to-tr from-blue-600 via-purple-500 to-red-500 p-0.5 shadow-md flex items-center justify-center shrink-0 animate-pulse">
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
              <div className="flex flex-col gap-1 w-full max-w-[82%]">
                <div className="rounded-2xl py-2 px-1 text-sm leading-relaxed text-foreground dark:text-neutral-200 rounded-tl-sm">
                  <p className="text-[13px] text-muted-foreground dark:text-neutral-200 leading-relaxed font-medium mb-3">
                    {isExecuting ? "Executing..." : "Processing your request..."}
                  </p>
                  <TraceLogsViewer traceLogs={activeTraceLogs} isGenerating={true} />
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* HITL Task Confirmation Panel */}
      {pendingTasks && pendingTasks.length > 0 && (
        <div className="flex gap-3.5 w-full justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="h-8 w-8 rounded-lg bg-linear-to-tr from-blue-600 via-purple-500 to-red-500 p-0.5 shadow-md flex items-center justify-center shrink-0">
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
          <div className="flex flex-col gap-1 w-full max-w-[82%]">
            <div className="p-5 bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-800 shadow-xl space-y-4 w-full">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="text-[13px] font-semibold text-zinc-100">Tasks Awaiting Creation Approval</h3>
              </div>
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {pendingTasks.map((t: any, idx: number) => (
                  <div key={idx} className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/40 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-zinc-200">{t.title}</span>
                      {t.priority && (
                        <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${
                          t.priority === "high" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                          t.priority === "medium" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                          "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                        }`}>
                          {t.priority}
                        </span>
                      )}
                    </div>
                    {t.description && <span className="text-[11px] text-zinc-400 leading-relaxed">{t.description}</span>}
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => onApprove?.(true)}
                  className="flex-grow py-2 rounded-xl text-xs font-semibold bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Approve & Insert
                </button>
                <button
                  onClick={() => onApprove?.(false)}
                  className="flex-grow py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all border border-zinc-700/50 active:scale-95 cursor-pointer"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
}

