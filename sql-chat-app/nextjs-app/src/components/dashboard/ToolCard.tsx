"use client";

import React from "react";
import Link from "next/link";

interface ToolCardProps {
    href: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    dbConnected: boolean;
    onConnectPrompt: () => void;
}

export default function ToolCard({
    href,
    title,
    description,
    icon,
    color,
    dbConnected,
    onConnectPrompt,
}: ToolCardProps) {
    const CardContent = (
        <div
            className={`h-full bg-[#1A1D27] border ${dbConnected
                    ? "border-[#2C3142]/80 hover:border-blue-500/50 cursor-pointer shadow-md hover:shadow-lg hover:shadow-blue-500/5"
                    : "border-red-950/40 opacity-60 cursor-pointer hover:border-red-500/20 shadow-sm"
                } rounded-2xl p-6 transition-all duration-300 group flex flex-col justify-between relative overflow-hidden`}
            style={{
                transform: "translateY(0px)",
            }}
            onMouseEnter={(e) => {
                if (dbConnected) {
                    e.currentTarget.style.transform = "translateY(-4px)";
                }
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0px)";
            }}
        >
            {/* Top decorative line showing tool theme color */}
            <div
                className="absolute top-0 left-0 right-0 h-[2px] transition-all duration-300"
                style={{
                    backgroundColor: color,
                    opacity: dbConnected ? 0.3 : 0.1,
                }}
            />

            <div>
                {/* Icon Container */}
                <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                    style={{
                        backgroundColor: `${color}15`,
                        color: color,
                        border: `1px solid ${color}30`,
                    }}
                >
                    {icon}
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-1.5 transition-colors duration-300 group-hover:text-blue-400">
                    {title}
                    {!dbConnected && (
                        <svg className="w-3.5 h-3.5 text-red-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                    )}
                </h3>

                {/* Description */}
                <p className="text-xs text-[#9CA3AF] leading-relaxed font-sans font-normal mb-6">
                    {description}
                </p>
            </div>

            {/* Action text */}
            <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-blue-400 group-hover:text-blue-300 select-none mt-auto">
                {dbConnected ? (
                    <>
                        Open Tool
                        <svg className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                    </>
                ) : (
                    <span className="text-red-400 group-hover:text-red-300 flex items-center gap-1 font-semibold">
                        Requires Connection
                    </span>
                )}
            </div>
        </div>
    );

    if (dbConnected) {
        return <Link href={href} className="no-underline">{CardContent}</Link>;
    }

    return (
        <div onClick={onConnectPrompt} className="no-underline select-none">
            {CardContent}
        </div>
    );
}
