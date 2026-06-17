"use client";

import React, { useState } from "react";
import { useDatabase } from "@/context/DatabaseContext";

interface ConnectDBModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ConnectDBModal({ isOpen, onClose }: ConnectDBModalProps) {
    const { checkConnectionStatus, dbConnected } = useDatabase();
    const [connectionString, setConnectionString] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!connectionString.trim()) return;

        setSubmitting(true);
        setError(null);
        setSuccess(false);

        try {
            const res = await fetch("/api/user/connect-db", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ connectionString, dialect: "postgresql" }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to verify database connection");
            }

            setSuccess(true);
            await checkConnectionStatus();
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setConnectionString("");
            }, 1000);
        } catch (err: any) {
            setError(err.message || "Could not connect to database. Please check credentials and try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-all duration-300">
            <div
                className="bg-[#1A1D27] border border-[#2D3748] rounded-2xl w-full max-w-lg p-6 relative shadow-2xl scale-100 animate-fadeIn"
                style={{
                    animation: "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                }}
            >
                {dbConnected && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                        aria-label="Close modal"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}

                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125T12 10.125" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white">Connect Your Postgres Database</h2>
                </div>

                <p className="text-xs text-[#9CA3AF] mb-6 leading-relaxed">
                    Enter your database connection URL to enable secure SQL generation, visual tree layout schema extraction, table data profiler reports, and real-time execution queries.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-950/40 border border-red-800/60 text-red-400 text-xs rounded-xl flex items-start gap-2.5">
                            <svg className="w-4.5 h-4.5 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span className="leading-relaxed">{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 text-xs rounded-xl flex items-center gap-2.5">
                            <svg className="w-4.5 h-4.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-semibold">Database connected successfully! Closing...</span>
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        <label className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider">
                            PostgreSQL Connection URL
                        </label>
                        <textarea
                            placeholder="postgresql://username:password@hostname:5432/dbname"
                            value={connectionString}
                            onChange={(e) => setConnectionString(e.target.value)}
                            disabled={submitting || success}
                            className="bg-[#0f1117] border border-[#2D3748] hover:border-gray-700 focus:border-blue-500 text-white p-3.5 rounded-xl text-xs w-full min-h-[100px] font-mono focus:outline-none transition-all leading-normal placeholder-gray-600"
                            required
                        />
                        <span className="text-[10px] text-gray-500 mt-1 select-none leading-relaxed">
                            Example: postgresql://postgres:authpass@myhost.neon.tech:5432/main?sslmode=require
                        </span>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-[#2D3748]/50">
                        {dbConnected && (
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={submitting || success}
                                className="px-4 py-2 bg-transparent hover:bg-[#2D3748]/50 border border-[#2D3748] text-white text-xs font-semibold rounded-lg transition-all"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={submitting || success}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-550 disabled:bg-blue-800/50 text-white text-xs font-bold rounded-lg transition-all shadow-md hover:shadow-blue-500/10 flex items-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Testing & Connecting...
                                </>
                            ) : (
                                "Connect Database"
                            )}
                        </button>
                    </div>
                </form>
            </div>
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
}
