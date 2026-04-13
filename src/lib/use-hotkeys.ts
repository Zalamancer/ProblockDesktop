import { useEffect } from "react";

export interface HotkeyMap {
  [combo: string]: () => void;
}

/**
 * Listen for keyboard shortcuts. Combos use "mod" for Cmd/Ctrl.
 * Examples: "mod+n", "mod+1", "mod+shift+k"
 */
export function useHotkeys(map: HotkeyMap) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;
      const key = e.key.toLowerCase();

      for (const [combo, action] of Object.entries(map)) {
        const parts = combo.toLowerCase().split("+");
        const needsMod = parts.includes("mod");
        const needsShift = parts.includes("shift");
        const targetKey = parts.filter((p) => p !== "mod" && p !== "shift")[0];

        if (
          mod === needsMod &&
          shift === needsShift &&
          key === targetKey
        ) {
          e.preventDefault();
          action();
          return;
        }
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [map]);
}
