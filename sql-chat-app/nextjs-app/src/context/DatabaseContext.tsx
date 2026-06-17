"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface DatabaseContextType {
    dbConnected: boolean | null;
    loading: boolean;
    showConnectModal: boolean;
    setShowConnectModal: (show: boolean) => void;
    checkConnectionStatus: () => Promise<void>;
    disconnectDatabase: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
    const { status } = useSession();
    const [dbConnected, setDbConnected] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const [showConnectModal, setShowConnectModal] = useState(false);

    const checkConnectionStatus = useCallback(async () => {
        if (status !== "authenticated") {
            setDbConnected(null);
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/user/profile");
            if (res.ok) {
                const profile = await res.json();
                setDbConnected(!!profile.dbConnectionString);
            } else {
                setDbConnected(false);
            }
        } catch (err) {
            console.error("Failed to check database connection status:", err);
            setDbConnected(false);
        } finally {
            setLoading(false);
        }
    }, [status]);

    const disconnectDatabase = useCallback(async () => {
        // Just client side disconnect/reset or we could call api if we want.
        // There is no explicit disconnect api. So we just reset state or user can connect a new one.
        setDbConnected(false);
    }, []);

    useEffect(() => {
        checkConnectionStatus();
    }, [checkConnectionStatus]);

    return (
        <DatabaseContext.Provider
            value={{
                dbConnected,
                loading,
                showConnectModal,
                setShowConnectModal,
                checkConnectionStatus,
                disconnectDatabase,
            }}
        >
            {children}
        </DatabaseContext.Provider>
    );
}

export function useDatabase() {
    const context = useContext(DatabaseContext);
    if (context === undefined) {
        throw new Error("useDatabase must be used within a DatabaseProvider");
    }
    return context;
}
