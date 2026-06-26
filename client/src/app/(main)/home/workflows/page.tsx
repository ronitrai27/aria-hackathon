"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkflowsPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Workflows</h1>
        <Button
          className="gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-4 h-9 font-semibold shadow-sm"
          onClick={() => router.push("/home/agent")}
        >
          <Plus className="h-4 w-4" />
          Create Workflow
        </Button>
      </div>

      {/* ── Hero banner ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-[#f0eeff] border border-violet-100 px-8 py-7 flex items-center justify-between min-h-[160px]">
        {/* Left — text + CTAs */}
        <div className="relative z-10 max-w-sm space-y-3">
          <h2 className="text-2xl font-bold text-gray-900 leading-snug">
            Automate. Orchestrate. Elevate.
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Build powerful workflows that connect your apps,
            <br />
            agents, and data — all in one place.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 h-9 rounded-lg shadow-sm"
              onClick={() => router.push("/home/agent")}
            >
              Create your first workflow
            </Button>
            <Button
              variant="outline"
              className="bg-white border-gray-200 text-gray-700 text-sm font-semibold px-4 h-9 rounded-lg hover:bg-gray-50"
            >
              Explore templates
            </Button>
          </div>
        </div>

        {/* Right — decorative flow diagram */}
        <div className="relative flex items-center gap-0 mr-4 select-none">
          {/* SVG dashed connector lines */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 380 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* line: bolt → robot */}
            <path
              d="M 72 60 C 100 60, 110 60, 160 60"
              stroke="#c4b5fd"
              strokeWidth="2"
              strokeDasharray="5 4"
              strokeLinecap="round"
            />
            {/* line: robot → database */}
            <path
              d="M 218 60 C 248 60, 258 60, 298 60"
              stroke="#c4b5fd"
              strokeWidth="2"
              strokeDasharray="5 4"
              strokeLinecap="round"
            />
            {/* line: database → check */}
            <path
              d="M 346 60 C 356 85, 360 95, 370 95"
              stroke="#c4b5fd"
              strokeWidth="2"
              strokeDasharray="5 4"
              strokeLinecap="round"
            />
            {/* small sparkle dots */}
            <circle cx="125" cy="90" r="3" fill="#a78bfa" opacity="0.5" />
            <circle cx="270" cy="90" r="3" fill="#a78bfa" opacity="0.5" />
          </svg>

          {/* Node: Lightning bolt */}
          <div className="relative z-10 h-14 w-14 rounded-2xl bg-white shadow-md flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-violet-500 fill-violet-500">
              <path d="M13 2L3 14h9l-1 8 10-12h-9z" />
            </svg>
          </div>

          <div className="w-20" />

          {/* Node: Robot / AI agent */}
          <div className="relative z-10 h-14 w-14 rounded-2xl bg-white shadow-md flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-gray-700 fill-gray-700">
              <rect x="5" y="8" width="14" height="9" rx="2" />
              <circle cx="9" cy="12" r="1.5" fill="white" />
              <circle cx="15" cy="12" r="1.5" fill="white" />
              <rect x="8" y="15" width="8" height="1.5" rx="0.75" fill="white" />
              <rect x="10.5" y="5" width="3" height="3" rx="0.5" />
              <line x1="12" y1="5" x2="12" y2="8" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>

          <div className="w-20" />

          {/* Node: Database */}
          <div className="relative z-10 h-14 w-14 rounded-2xl bg-white shadow-md flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-blue-400 fill-blue-400">
              <ellipse cx="12" cy="5" rx="8" ry="3" />
              <path d="M4 5v4c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
              <path d="M4 9v4c0 1.66 3.58 3 8 3s8-1.34 8-3V9" />
              <path d="M4 13v4c0 1.66 3.58 3 8 3s8-1.34 8-3v-4" />
            </svg>
          </div>

          <div className="w-8" />

          {/* Node: Check (success) — offset lower-right */}
          <div className="relative z-10 h-9 w-9 rounded-full bg-green-500 shadow-md flex items-center justify-center self-end mb-1">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white stroke-white fill-none" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        {/* Subtle dot-grid background pattern */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, #a78bfa 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage:
              "radial-gradient(ellipse 60% 80% at 70% 50%, black 0%, transparent 100%)",
          }}
        />
      </div>
    </div>
  );
}
