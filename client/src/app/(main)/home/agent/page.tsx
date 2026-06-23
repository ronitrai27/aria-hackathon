"use client";

import { Allotment } from "allotment";
import { useState } from "react";
import "allotment/dist/style.css";
import {
  Bell,
  Bot,
  Brain,
  FileText,
  Lock,
  MoreHorizontal,
  PanelRightClose,
  PanelRightOpen,
  Paperclip,
  SendHorizontal,
  Share2,
  Sparkles,
  Star,
  UserPlus,
} from "lucide-react";
import Image from "next/image";
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
import { useAgentStore } from "@/hooks/useAgentStore";
import FlowPreview from "./components/FlowPreview";

export default function AgentPage() {
  const [isRightOpen, setIsRightOpen] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [selectedModel, setSelectedModel] = useState("claude-sonnet-3.5");
  const [activeTab, setActiveTab] = useState<"editor" | "runs">("editor");
  const [isReadWriteActive, setIsReadWriteActive] = useState(true);

  const { activeMode, setActiveMode } = useAgentStore();

  return (
    <div className="h-[calc(100vh-4rem)] w-[calc(100%+3rem)] -mx-6 -my-6 flex overflow-hidden bg-background">
      {/* Global CSS overrides for Allotment dividers and custom morph animations */}
      <style>{`
        .allotment-module_sash__By-6u::after {
          background-color: var(--border) !important;
          width: 1px !important;
        }
        .allotment-module_sash__By-6u:hover::after {
          background-color: var(--ring) !important;
        }
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

      <Allotment key={isRightOpen ? "open" : "closed"}>
        {/* Left Pane: Agent Chat Space */}
        <Allotment.Pane minSize={400}>
          <div className="h-full w-full flex flex-col items-center justify-between p-8 bg-background relative overflow-y-auto">
            <div className="w-full flex justify-between items-center pb-4 opacity-0">
              <span className="text-xs text-muted-foreground">Agent Mode</span>
            </div>

            {/* Middle welcome content */}
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl my-auto py-8">
              <div className="relative flex items-center justify-center w-20 h-20 mb-4 group cursor-pointer">
                <div className="relative w-18 h-18 bg-linear-to-tr from-blue-600 via-purple-500 to-red-500 p-0.5 shadow-2xl flex items-center justify-center overflow-hidden animate-shape-morph">
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

              {/* Welcoming typewriter effect (Small & Slow with 2-minute delays) */}
              <div className="text-lg font-medium text-muted-foreground mb-8 text-center min-h-[20px] max-w-xl">
                <Typewriter
                  onInit={(typewriter) => {
                    typewriter
                      .typeString("How can I help you today?")
                      .pauseFor(120000) // Wait 2 minutes (120,000ms)
                      .deleteAll()
                      .typeString("Let's build a new database workflow.")
                      .pauseFor(120000)
                      .deleteAll()
                      .typeString("Need help configuring your integrations?")
                      .pauseFor(120000)
                      .deleteAll()
                      .typeString("Let's design a custom pipeline.")
                      .pauseFor(120000)
                      .start();
                  }}
                  options={{
                    loop: true,
                    delay: 80, // Slow typing speed
                    deleteSpeed: 40,
                    cursorClassName: "text-blue-500 font-normal animate-pulse",
                  }}
                />
              </div>

              {/* Input Wrapper Container (with tabs on top) */}
              <div className="w-full flex flex-col items-center">
                {/* Tabs for Brain and Agent */}
                <div className="flex items-center gap-1 self-start ml-4 -mb-[1px] z-10">
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
                    type="button"
                    onClick={() => setActiveMode("agent")}
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

                {/* Textarea container */}
                <div className="relative w-full bg-muted/30 border border-border rounded-2xl p-3 focus-within:border-ring/50 focus-within:ring-2 focus-within:ring-ring/15 transition-all shadow-sm">
                  {/* Active editable state for both modes */}
                  <Textarea
                    placeholder={
                      activeMode === "agent"
                        ? "Describe a task or workflow for the Agent..."
                        : "Describe a workflow or ask a question..."
                    }
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    className="min-h-[80px] w-full resize-none bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:border-0 p-1 pr-12 text-base text-foreground placeholder:text-muted-foreground/80 md:text-sm"
                  />

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
                    {/* Left attachment button */}
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg"
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>

                      <div className="border border-border shadow-sm p-1 pr-2.5 rounded-full flex items-center gap-2 bg-white">
                        <div className="flex -space-x-0.5">
                          <Image
                            className="inline-block h-4.5 w-4.5  object-contain bg-background"
                            src="/outlook.jpeg"
                            alt="Outlook"
                            width={17}
                            height={17}
                          />
                          <Image
                            className="inline-block h-4.5 w-4.5  object-contain bg-background"
                            src="/gmail.png"
                            alt="Gmail"
                            width={17}
                            height={17}
                          />
                          <Image
                            className="inline-block h-4 w-4  object-contain bg-background"
                            src="/calendar.png"
                            alt="Calendar"
                            width={17}
                            height={17}
                          />
                          <Image
                            className="inline-block h-4.5 w-4.5 object-contain bg-background"
                            src="/slack.png"
                            alt="Slack"
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
                          className={`w-7 h-4 rounded-full transition-colors duration-200 relative cursor-pointer shrink-0 outline-none ${
                            isReadWriteActive ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        >
                          <span
                            className={`block w-3 h-3 bg-white rounded-full transition-transform duration-200 absolute top-0.5 left-0.5 ${
                              isReadWriteActive
                                ? "translate-x-3"
                                : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Right options / Actions */}
                    <div className="flex items-center gap-1">
                      <Select
                        value={selectedModel}
                        onValueChange={setSelectedModel}
                      >
                        <SelectTrigger className="h-8 px-2.5 bg-transparent hover:bg-muted/50 border-0 shadow-none focus:ring-0 text-xs font-medium text-muted-foreground flex items-center gap-1.5 rounded-sm cursor-pointer">
                          <SelectValue placeholder="Select Model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="claude-sonnet-3.5">
                            <span className="flex items-center gap-2 text-xs">
                              <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                              Claude Sonnet 3.5
                            </span>
                          </SelectItem>
                          <SelectItem value="claude-opus-4.5" disabled>
                            <div className="flex items-center justify-between w-full gap-8 text-xs text-muted-foreground">
                              <span className="flex items-center gap-2">
                                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                                Claude Opus 4.5
                              </span>
                              <Lock className="h-3 w-3 text-muted-foreground/45 shrink-0" />
                            </div>
                          </SelectItem>
                          <SelectItem value="gpt-4.1-mini">
                            <span className="flex items-center gap-2 text-xs">
                              <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                              GPT-4.1 mini
                            </span>
                          </SelectItem>
                          <SelectItem value="gpt-4.1" disabled>
                            <div className="flex items-center justify-between w-full gap-8 text-xs text-muted-foreground">
                              <span className="flex items-center gap-2">
                                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                                GPT-4.1
                              </span>
                              <Lock className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </SelectItem>
                          <SelectItem value="gpt-5.1" disabled>
                            <div className="flex items-center justify-between w-full gap-8 text-xs text-muted-foreground">
                              <span className="flex items-center gap-2">
                                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                                GPT-5.1
                              </span>
                              <Lock className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        type="button"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-sm ml-1 cursor-pointer disabled:opacity-50"
                        disabled={!inputVal.trim()}
                      >
                        <SendHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Allotment.Pane>

        {/* Right Pane: React Flow Preview Page */}
        <Allotment.Pane
          minSize={isRightOpen ? 360 : 60}
          maxSize={isRightOpen ? undefined : 60}
          preferredSize={isRightOpen ? "50%" : 60}
        >
          {isRightOpen ? (
            /* Open Preview Panel */
            <div className="h-full w-full flex flex-col bg-background border-l border-border relative select-none">
              {/* Header */}
              <div className="h-16 flex items-center justify-between px-4 border-b border-border shrink-0 bg-background/95 backdrop-blur-sm z-10">
                {/* Left: Document info */}
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-foreground">
                        Untitled
                      </span>
                      <Star className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-yellow-500 transition-colors" />
                    </div>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Auto-saved
                    </span>
                  </div>
                </div>

                {/* Center: Tabs Switcher */}
                <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => setActiveTab("editor")}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      activeTab === "editor"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("runs")}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      activeTab === "runs"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Runs
                  </button>
                </div>

                {/* Right: Actions and Collapse trigger */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                  >
                    <Bell className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg mr-1"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>

                  <div className="h-4 w-px bg-border mx-1" />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsRightOpen(false)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg bg-muted/30"
                    title="Collapse Preview"
                  >
                    <PanelRightClose className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Dotted Canvas Space with React Flow */}
              <div className="flex-1 relative flex flex-col bg-muted/5 min-h-0">
                {/* React Flow Render Component */}
                <div className="w-full h-full flex-1 min-h-0">
                  <FlowPreview />
                </div>
              </div>
            </div>
          ) : (
            /* Closed Strip */
            <div className="h-full w-full bg-muted/10 flex flex-col items-center py-4 border-l border-border select-none">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsRightOpen(true)}
                className="h-10! w-10 text-black rounded-sm mb-6 cursor-pointer"
                title="Open Preview"
              >
                <PanelRightOpen className="h-5 w-5!" />
              </Button>

              <div className="flex-1 flex items-center justify-center">
                <button
                  type="button"
                  className="text-xs font-bold tracking-wide text-muted-foreground uppercase writing-vertical rotate-180 select-none cursor-pointer hover:text-muted-foreground transition-colors outline-none"
                  onClick={() => setIsRightOpen(true)}
                  style={{ writingMode: "vertical-lr" }}
                >
                  Workflow Preview Panel
                </button>
              </div>
            </div>
          )}
        </Allotment.Pane>
      </Allotment>
    </div>
  );
}
