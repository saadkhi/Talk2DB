"use client";

import React, { useState } from 'react';
import { useSession } from "next-auth/react";
import AuthPage from "@/components/AuthPage";
import ChatPage from "@/components/ChatPage";

export default function Home() {
  const { data: session, status } = useSession();
  const [showAuth, setShowAuth] = useState(false);

  if (status === "loading") {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000000',
      }}>
        <div style={{ color: '#39ff14', fontSize: '24px', fontWeight: '700', letterSpacing: '2px' }}>LOADING...</div>
      </div>
    );
  }

  // If user is authenticated, always show ChatPage
  if (status === "authenticated") {
    return <ChatPage />;
  }

  // For unauthenticated users, show ChatPage by default but allow switching to AuthPage
  if (showAuth) {
    return <AuthPage onBack={() => setShowAuth(false)} />;
  }

  return <ChatPage onRequireAuth={() => setShowAuth(true)} />;
}
