"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

type Toast = { id: number; message: string };
const ToastContext = createContext<{ toast: (message: string) => void } | null>(null);

let counter = 0;

export function Toaster({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => setMounted(true), []);

  const toast = useCallback((message: string) => {
    counter += 1;
    const id = counter;
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted &&
        createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex flex-col items-center gap-2"
            aria-live="polite"
            aria-atomic="true"
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                className="pointer-events-auto flex items-center gap-2 rounded-md border border-rule bg-ink px-3.5 py-2 text-[13px] font-medium text-paper shadow-lift animate-fade-rise"
              >
                <Check size={14} className="text-green" strokeWidth={2.5} />
                {t.message}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { toast: () => {} };
  return ctx;
}
