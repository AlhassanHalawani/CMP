import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Toast, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from '@neo/Toast';

type ToastItem = {
  id: number;
  title: string;
  description?: string;
};

type ToastContextValue = {
  showToast: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function AppToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((title: string, description?: string) => {
    const id = Date.now() + Math.floor(Math.random() * 10000);
    setToasts((prev) => [...prev, { id, title, description }]);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      <ToastProvider swipeDirection="right">
        {children}
        {toasts.map((item) => (
          <Toast
            key={item.id}
            open
            duration={3200}
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                setToasts((prev) => prev.filter((toast) => toast.id !== item.id));
              }
            }}
          >
            <ToastTitle>{item.title}</ToastTitle>
            {item.description && <ToastDescription>{item.description}</ToastDescription>}
          </Toast>
        ))}
        <ToastViewport />
      </ToastProvider>
    </ToastContext.Provider>
  );
}

export function useAppToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useAppToast must be used within AppToastProvider');
  return ctx;
}
