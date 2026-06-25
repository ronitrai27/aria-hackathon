"use client";

import { useEffect, useRef } from "react";
import ChatMessageItem, {
  StatusStepper,
} from "../../../../modules/Ai/components/ChatMessage";

interface AgentChatMessagesProps {
  messages: any[];
  isGenerating: boolean;
  activeSteps: any[];
}

export default function AgentChatMessages({
  messages,
  isGenerating,
  activeSteps,
}: AgentChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0 || isGenerating) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isGenerating, activeSteps]);

  if (messages.length === 0) return null;

  return (
    <div className="flex-1 w-full max-w-2xl overflow-y-auto py-4 space-y-6 pr-2 select-text scrollbar-none flex flex-col">
      {messages.map((msg, idx) => (
        <ChatMessageItem key={idx} message={msg} />
      ))}
      {isGenerating && activeSteps.length > 0 && (
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
                I am starting to create the workflow based on your request...
              </p>
              <StatusStepper steps={activeSteps} />
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
