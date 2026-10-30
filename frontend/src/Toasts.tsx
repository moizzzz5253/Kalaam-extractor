import { useEffect } from "react";
import { IconCheck, IconClose, IconWarning } from "./icons";

export interface Toast {
  id: number;
  kind: "success" | "info" | "error";
  text: string;
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
    const t = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  return (
    <div className={`toast toast-${toast.kind}`} role={toast.kind === "error" ? "alert" : "status"}>
      <span className="toast-icon">{toast.kind === "error" ? <IconWarning size={18} /> : <IconCheck size={18} />}</span>
      <p>{toast.text}</p>
      <button className="icon-btn" aria-label="Dismiss" onClick={() => onDismiss(toast.id)}>
        <IconClose size={16} />
      </button>
    </div>
  );
}
