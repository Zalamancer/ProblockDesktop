import { create } from "zustand";

export type ToastLevel = "success" | "error" | "info";

export interface Toast {
  id: number;
  level: ToastLevel;
  message: string;
  createdAt: number;
}

interface ToastStore {
  toasts: Toast[];
  push: (level: ToastLevel, message: string) => void;
  dismiss: (id: number) => void;
}

let nextId = 0;

export const useToasts = create<ToastStore>((set) => ({
  toasts: [],

  push: (level, message) => {
    const id = ++nextId;
    set((s) => ({
      toasts: [...s.toasts, { id, level, message, createdAt: Date.now() }],
    }));
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  dismiss: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
