import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { useToasts, type ToastLevel } from "../store/toast-store";

const LEVEL_CONFIG: Record<
  ToastLevel,
  { icon: typeof Info; bg: string; border: string; text: string }
> = {
  success: {
    icon: CheckCircle2,
    bg: "bg-green-950/90",
    border: "border-green-800",
    text: "text-green-300",
  },
  error: {
    icon: XCircle,
    bg: "bg-red-950/90",
    border: "border-red-800",
    text: "text-red-300",
  },
  info: {
    icon: Info,
    bg: "bg-zinc-900/90",
    border: "border-zinc-700",
    text: "text-zinc-300",
  },
};

export function ToastContainer() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const cfg = LEVEL_CONFIG[toast.level];
        const Icon = cfg.icon;
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2 px-3 py-2.5 rounded-lg border shadow-lg backdrop-blur-sm animate-slide-in ${cfg.bg} ${cfg.border}`}
            style={{ minWidth: 280, maxWidth: 380 }}
          >
            <Icon size={15} className={`mt-0.5 shrink-0 ${cfg.text}`} />
            <p className={`text-xs flex-1 leading-relaxed ${cfg.text}`}>
              {toast.message}
            </p>
            <button
              onClick={() => dismiss(toast.id)}
              className="p-0.5 text-zinc-500 hover:text-zinc-300 shrink-0 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
