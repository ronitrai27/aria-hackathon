"use client";

import { useRouter } from "next/navigation";
import { LineChart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function WorkflowsPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-foreground">
          Workflows <LineChart className="inline w-5 h-5 ml-1" />
        </h1>
        <Button
          className="gap-2 text-xs rounded-md"
          onClick={() => router.push("/home/agent")}
        >
          <Plus className="h-4 w-4" />
          Create Workflow
        </Button>
      </div>

      {/* ── Hero banner ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-[#f0eeff] border border-violet-100 px-8 py-4 flex items-center justify-between min-h-[220px]">
        {/* Left — text + CTAs */}
        <div className="relative z-10 min-w-[400px]! space-y-3">
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
              className="bg-white text-black text-xs px-4 h-8 rounded-sm shadow-sm"
              onClick={() => router.push("/home/agent")}
            >
              Create Now +
            </Button>
          </div>
        </div>

        {/* Right — decorative flow diagram */}
        <div className="relative w-full  select-none">
          <Image
            src="/idk.svg"
            alt="Workflow"
            width={380}
            height={380}
            className="absolute -top-24 right-0"
          />
        </div>
      </div>
    </div>
  );
}
