import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, RefreshCw } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'loading' | 'progress';

export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
    progress?: number; // 0-100
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => string;
    removeToast: (id: string) => void;
    updateToast: (id: string, updates: Partial<Toast>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback(({ duration = 5000, ...toast }: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast = { ...toast, id, duration };
        setToasts((prev) => [...prev, newToast]);

        if (toast.type !== 'loading' && toast.type !== 'progress' && duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
        return id;
    }, [removeToast]);

    const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));

        // Auto-remove if type changed to non-persistent and duration is set (or default)
        if (updates.type && updates.type !== 'loading' && updates.type !== 'progress') {
            const duration = updates.duration || 5000;
            if (duration > 0) {
                setTimeout(() => {
                    removeToast(id);
                }, duration);
            }
        }
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, updateToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`
              pointer-events-auto flex items-start gap-3 p-4 rounded-lg shadow-lg border transition-all duration-300 transform translate-y-0
              ${toast.type === 'success' ? 'bg-white border-green-200 text-slate-800 dark:bg-slate-800 dark:border-green-900 dark:text-white' : ''}
              ${toast.type === 'error' ? 'bg-white border-red-200 text-slate-800 dark:bg-slate-800 dark:border-red-900 dark:text-white' : ''}
              ${toast.type === 'info' ? 'bg-white border-blue-200 text-slate-800 dark:bg-slate-800 dark:border-blue-900 dark:text-white' : ''}
              ${(toast.type === 'loading' || toast.type === 'progress') ? 'bg-white border-indigo-200 text-slate-800 dark:bg-slate-800 dark:border-indigo-900 dark:text-white' : ''}
            `}
                    >
                        <div className="shrink-0 mt-0.5">
                            {toast.type === 'success' && <CheckCircle className="text-green-500" size={20} />}
                            {toast.type === 'error' && <AlertCircle className="text-red-500" size={20} />}
                            {toast.type === 'info' && <Info className="text-blue-500" size={20} />}
                            {toast.type === 'loading' && <RefreshCw className="text-indigo-500 animate-spin" size={20} />}
                            {toast.type === 'progress' && <RefreshCw className="text-indigo-500 animate-spin" size={20} />}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm">{toast.title}</h4>
                            {toast.message && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{toast.message}</p>}

                            {toast.type === 'progress' && (
                                <div className="mt-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                    <div
                                        className="bg-indigo-500 h-full transition-all duration-300 ease-out rounded-full"
                                        style={{ width: `${Math.max(0, Math.min(100, toast.progress || 0))}%` }}
                                    />
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => removeToast(toast.id)}
                            className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
