"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { GuestProvider } from "@/context/GuestContext";
import GuestLimitModal from "@/components/guest/GuestLimitModal";
import { ThemeProvider } from "@/components/ThemeProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
                <GuestProvider>
                    {children}
                    {/* Global guest-limit modal — rendered here so it works on every page */}
                    <GuestLimitModal />
                </GuestProvider>
            </ThemeProvider>
        </SessionProvider>
    );
}
