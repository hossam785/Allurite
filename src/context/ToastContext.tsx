"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import ToastContainer, { ToastMessage } from "@/components/ui/Toast";

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (msg: { title?: string; message: string; type?: ToastMessage["type"]; duration?: number }) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (message: string, title?: string, duration?: number) => void;
    error: (message: string, title?: string, duration?: number) => void;
    info: (message: string, title?: string, duration?: number) => void;
    warning: (message: string, title?: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ title, message, type = "info", duration = 4000 }: { title?: string; message: string; type?: ToastMessage["type"]; duration?: number }) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev.slice(-4), { id, title, message, type, duration }]);
    },
    []
  );

  const toast = {
    success: useCallback((message: string, title?: string, duration?: number) => addToast({ message, title, type: "success", duration }), [addToast]),
    error: useCallback((message: string, title?: string, duration?: number) => addToast({ message, title, type: "error", duration }), [addToast]),
    info: useCallback((message: string, title?: string, duration?: number) => addToast({ message, title, type: "info", duration }), [addToast]),
    warning: useCallback((message: string, title?: string, duration?: number) => addToast({ message, title, type: "warning", duration }), [addToast]),
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
