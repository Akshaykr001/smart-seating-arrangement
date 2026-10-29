"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

export type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
      window.setTimeout(() => {
        dismiss(id);
      }, 4500);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="no-print fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-[calc(100vw-2rem)] sm:w-auto pointer-events-none"
      >
        {toasts.map((toast) => {
          const isError = toast.tone === "error";
          const isSuccess = toast.tone === "success";
          return (
            <div
              key={toast.id}
              role={isError ? "alert" : "status"}
              className="floating-panel pointer-events-auto flex items-start justify-between gap-3 px-4 py-3 text-base"
              style={{
                borderColor: isError
                  ? "var(--color-status-error-border)"
                  : isSuccess
                  ? "var(--color-status-success-border)"
                  : "var(--color-border)",
              }}
            >
              <div className="flex items-start gap-2.5">
                {isSuccess && (
                  <svg
                    aria-hidden="true"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-status-success-text)"
                    strokeWidth="2"
                    className="mt-0.5 shrink-0"
                  >
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {isError && (
                  <svg
                    aria-hidden="true"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-status-error-text)"
                    strokeWidth="2"
                    className="mt-0.5 shrink-0"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                  </svg>
                )}
                <span className="text-[var(--color-text)]">{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-1 -m-1 cursor-pointer"
                style={{ borderRadius: "var(--radius)" }}
              >
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

