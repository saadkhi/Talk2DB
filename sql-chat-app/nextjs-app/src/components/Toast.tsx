"use client";

import React, { useEffect, useState } from "react";

interface ToastProps {
    message: string;
    duration?: number;
    onClose?: () => void;
}

export function Toast({ message, duration = 2000, onClose }: ToastProps) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(() => onClose?.(), 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    if (!visible) return null;

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                backgroundColor: '#10b981',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                zIndex: 1000,
                fontWeight: '500',
                fontSize: '14px',
                transition: 'opacity 0.3s ease, transform 0.3s ease',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(10px)',
            }}
        >
            {message}
        </div>
    );
}

export function useToast() {
    const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null);

    const showToast = (message: string, duration = 2000) => {
        setToast({ message, visible: true });
        setTimeout(() => setToast(null), duration);
    };

    return { toast, showToast };
}
