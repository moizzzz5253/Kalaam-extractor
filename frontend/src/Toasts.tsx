import { useEffect } from "react";
import { IconClose } from "./icons";

export interface Toast {
  id: number;
  kind: "ok" | "info" | "error";
  text: string;
  action?: { label: string; run: () => void };
}

/** Bottom-right notices. Errors stay until dismissed; others leave after 4 s. */
export default function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    if (toast.kind === "error") return;
    const t = setTimeout(() => onDismiss(toast.id), toast.action ? 8000 : 4000); // longer when it offers Undo
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  return (
    <div className={`toast ${toast.kind}`} role={toast.kind === "error" ? "alert" : "status"}>
      <i className={`led ${toast.kind === "error" ? "bad" : "ok"}`} aria-hidden="true" />
      <p>
        <bdi>{toast.text}</bdi>
      </p>
      {toast.action && (
        <button
          className="btn sm"
          onClick={() => {
            toast.action!.run();
            onDismiss(toast.id);
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button className="tbtn" aria-label="Dismiss" onClick={() => onDismiss(toast.id)}>
        <IconClose size={14} />
      </button>
    </div>
  );
}
