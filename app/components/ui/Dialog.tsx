"use client";

import { Loader2 } from "lucide-react";
import { useEffect } from "react";

export const Dialog = ({
  title,
  onClose,
  children,
}: {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-2xl bg-panel p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-medium">{title}</h2>
        {children}
      </div>
    </div>
  );
};

export const ConfirmDialog = ({
  title,
  description,
  confirmLabel,
  cancelLabel,
  pendingLabel,
  pending = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  pendingLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <Dialog title={title} onClose={() => !pending && onCancel()}>
    <p className="mt-2 text-base text-muted">{description}</p>
    <div className="mt-5 flex justify-end gap-1">
      <button onClick={onCancel} disabled={pending} className="btn btn-ghost">
        {cancelLabel}
      </button>
      <button onClick={onConfirm} disabled={pending} className="btn btn-danger">
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending && pendingLabel ? pendingLabel : confirmLabel}
      </button>
    </div>
  </Dialog>
);
