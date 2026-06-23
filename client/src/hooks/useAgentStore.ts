import { create } from "zustand";

export type ModeType = "brain" | "agent";

interface AgentState {
  activeMode: ModeType;
  setActiveMode: (mode: ModeType) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  activeMode: "brain",
  setActiveMode: (mode) => set({ activeMode: mode }),
}));
