"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

export interface DbConnection {
    id: string;
    name: string;
    dbDialect: string;
    isDefault: boolean;
}

interface DatabaseContextType {
    dbConnected: boolean | null;
    dbDialect: string | null;
    connections: DbConnection[];
    activeConnectionId: string | null;
    setActiveConnectionId: (id: string) => void;
    loading: boolean;
    showConnectModal: boolean;
    setShowConnectModal: (show: boolean) => void;
    checkConnectionStatus: () => Promise<void>;
    disconnectDatabase: (id?: string) => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
    const { status } = useSession();
    const [connections, setConnections] = useState<DbConnection[]>([]);
    const [activeConnectionId, setActiveConnectionIdState] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showConnectModal, setShowConnectModal] = useState(false);

    // Derived state for backward compatibility and quick checks
    const activeConnection = connections.find(c => c.id === activeConnectionId);
    const dbConnected = connections.length > 0;
    const dbDialect = activeConnection?.dbDialect ?? null;

    const setActiveConnectionId = (id: string) => {
        setActiveConnectionIdState(id);
        // Persist the choice in local storage for the next session
        localStorage.setItem("talk2db_active_connection", id);
        // Also set a cookie so Server Components and APIs can read it
        document.cookie = `talk2db_active_connection=${id}; path=/; max-age=31536000`;
    };

    const checkConnectionStatus = useCallback(async () => {
        if (status !== "authenticated") {
            setConnections([]);
            setActiveConnectionIdState(null);
            setLoading(false);
            return;
        }
        try {
            const res = await fetch("/api/user/profile");
            if (res.ok) {
                const profile = await res.json();
                const fetchedConns = profile.connections || [];
                setConnections(fetchedConns);
                
                if (fetchedConns.length > 0) {
                    const savedId = localStorage.getItem("talk2db_active_connection");
                    const hasSaved = fetchedConns.some((c: any) => c.id === savedId);
                    if (hasSaved) {
                        setActiveConnectionIdState(savedId);
                    } else {
                        const defaultConn = fetchedConns.find((c: any) => c.isDefault) || fetchedConns[0];
                        setActiveConnectionIdState(defaultConn.id);
                    }
                } else {
                    setActiveConnectionIdState(null);
                }
            } else {
                setConnections([]);
            }
        } catch (err) {
            console.error("Failed to check database connection status:", err);
            setConnections([]);
        } finally {
            setLoading(false);
        }
    }, [status]);

    const disconnectDatabase = useCallback(async (id?: string) => {
        try {
            const targetId = id || activeConnectionId;
            if (!targetId) return;

            const res = await fetch(`/api/user/connect-db?id=${targetId}`, { method: "DELETE" });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || "Disconnect failed");
            }
            
            // Refresh connections list
            await checkConnectionStatus();
        } catch (err) {
            console.error("Failed to disconnect database:", err);
            throw err; // re-throw so the caller (modal) can show the error
        }
    }, [activeConnectionId, checkConnectionStatus]);

    useEffect(() => {
        checkConnectionStatus();
    }, [checkConnectionStatus]);

    return (
        <DatabaseContext.Provider
            value={{
                dbConnected,
                dbDialect,
                connections,
                activeConnectionId,
                setActiveConnectionId,
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
