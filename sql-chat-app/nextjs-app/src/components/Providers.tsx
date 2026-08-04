"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { GuestProvider } from "@/context/GuestContext";
import GuestLimitModal from "@/components/guest/GuestLimitModal";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <GuestProvider>
                {children}
                {/* Global guest-limit modal — rendered here so it works on every page */}
                <GuestLimitModal />
            </GuestProvider>
        </SessionProvider>
    );
}
