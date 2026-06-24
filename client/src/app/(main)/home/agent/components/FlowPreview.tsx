"use client";

import { Button } from "@/components/ui/button";
import { Background, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowRight,
  FileText,
  Share2,
  Sparkles,
  Workflow,
  CheckCircle,
  RefreshCw,
  Ghost,
} from "lucide-react";
import { useEffect, useState } from "react";

interface FlowPreviewProps {
  onSelectSuggestion?: (prompt: string, apps: string[]) => void;
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

export default function FlowPreview({ onSelectSuggestion }: FlowPreviewProps) {
  const [currentRecipes, setCurrentRecipes] = useState<typeof recipes>([]);

  const handleSuggestNew = () => {
    const shuffled = [...recipes].sort(() => 0.5 - Math.random());
    setCurrentRecipes(shuffled.slice(0, 3));
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
  useEffect(() => {
    handleSuggestNew();
  }, []);

  return (
    <div className="w-full h-full relative flex items-center justify-center p-6">
      {/* Dotted Canvas Background */}
      <div className="absolute inset-0 z-0">
        <ReactFlow nodes={[]} edges={[]} proOptions={{ hideAttribution: true }}>
          <Background gap={20} size={1.5} color="var(--border)" />
        </ReactFlow>
      </div>

      {/* Suggestion Recipes Glassmorphic Card */}
      <div className="relative z-10 max-w-md w-full border shadow rounded-md p-4 bg-background">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md flex items-center justify-center shrink-0">
              <Workflow className="h-5 w-5 " />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">
                Select a Workflow Recipe
              </h3>
              <p className="text-xs text-muted-foreground leading-snug">
                Choose a prompt template below to let the AI agent create your
                workflow.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end mb-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSuggestNew}
            className="flex items-center gap-1.5 text-[10px]"
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
              className="flex items-center text-left p-3.5 rounded-xl border border-neutral-200/50 dark:border-zinc-800/50 bg-neutral-50/30 dark:bg-zinc-900/20 hover:bg-neutral-50/80 dark:hover:bg-zinc-800/50 hover:border-neutral-300 dark:hover:border-zinc-700 hover:scale-[1.01] hover:-translate-y-0.5 shadow-xs hover:shadow-sm transition-all duration-300 group cursor-pointer w-full"
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
              <div className="h-7 w-7 rounded-full bg-neutral-100 dark:bg-zinc-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 shrink-0">
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
