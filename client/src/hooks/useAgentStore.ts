import { create } from "zustand";

export type ModeType = "brain" | "agent";

interface AgentState {
  activeMode: ModeType;
  setActiveMode: (mode: ModeType) => void;
  isConnectionDialogOpen: boolean;
  connectionDialogApp: string | null;
  openConnectionDialog: (appName: string) => void;
  closeConnectionDialog: () => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  activeMode: "brain",
  setActiveMode: (mode) => set({ activeMode: mode }),
  isConnectionDialogOpen: false,
  connectionDialogApp: null,
  openConnectionDialog: (appName) =>
    set({ isConnectionDialogOpen: true, connectionDialogApp: appName }),
  closeConnectionDialog: () =>
    set({ isConnectionDialogOpen: false, connectionDialogApp: null }),
}));
