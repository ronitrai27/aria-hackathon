import { create } from "zustand";
import { Doc } from "../../convex/_generated/dataModel";

interface UserState {
  user: Doc<"users"> | null;
  setUser: (user: Doc<"users"> | null) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
