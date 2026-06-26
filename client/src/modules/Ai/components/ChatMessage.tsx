import { CheckCircle, RefreshCw } from "lucide-react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  steps?: Array<{ worker: string; status: string; message: string }>;
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

export const formatMessageContent = (content: string) => {
  if (!content) return "";
  const trimmed = content.trim();
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
  if (content.includes('"nodes"') && content.includes('"edges"')) {
    return "I have successfully created the workflow. Feel free to modify it or ask me to add anything else!";
  }
  return content;
};

interface ChatMessageItemProps {
  message: ChatMessage;
}

export default function ChatMessageItem({ message }: ChatMessageItemProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex gap-3.5 w-full ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isUser && (
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
      )}
      <div className="flex flex-col gap-1 w-full max-w-[82%]">
        <div
          className={`rounded-2xl text-sm leading-relaxed ${
            isUser
              ? "p-4 bg-zinc-100 border border-zinc-200 text-zinc-900 dark:bg-zinc-800/90 dark:border-zinc-700/40 dark:text-neutral-100 rounded-tr-sm ml-auto shadow-xs"
              : "py-2 px-1 text-foreground dark:text-neutral-200 rounded-tl-sm"
          }`}
        >
          {formatMessageContent(message.content)}
          {!isUser && message.steps && message.steps.length > 0 && (
            <StatusStepper steps={message.steps} />
          )}
        </div>
      </div>
    </div>
  );
}
