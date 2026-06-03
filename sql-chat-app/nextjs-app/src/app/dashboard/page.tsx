"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Sidebar from "@/components/Sidebar";
import ChatThread from "@/components/ChatThread";
import ChatInput from "@/components/ChatInput";
import ContextPanel from "@/components/ContextPanel";

interface Message {
    role: "user" | "assistant";
    content: string;
}

interface Conversation {
    id: string;
    title: string;
    updatedAt: string;
}

export default function DashboardPage() {
    const { data: session } = useSession();
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConvId, setCurrentConvId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isContextOpen, setIsContextOpen] = useState(true);

    useEffect(() => {
        fetchConversations();
    }, []);

    const fetchConversations = async () => {
        try {
            const res = await fetch("/api/conversations");
            if (res.ok) {
                const data = await res.json();
                setConversations(data);
            }
        } catch (err) {
            console.error("Error fetching conversations:", err);
        }
    };

    const loadConversation = async (id: string) => {
        try {
            setIsLoading(true);
            const res = await fetch(`/api/conversations/${id}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages);
                setCurrentConvId(id);
            }
        } catch (err) {
            console.error("Error loading conversation:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (content: string) => {
        setMessages((prev) => [...prev, { role: "user", content }]);
        setIsLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: content,
                    conversation_id: currentConvId
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
                if (!currentConvId && data.conversation_id) {
                    setCurrentConvId(data.conversation_id);
                    fetchConversations();
                }
            }
        } catch (err) {
            console.error("Error sending message:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this conversation?")) return;

        try {
            const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
            if (res.ok) {
                setConversations((prev) => prev.filter((c) => c.id !== id));
                if (currentConvId === id) {
                    setMessages([]);
                    setCurrentConvId(null);
                }
            }
        } catch (err) {
            console.error("Error deleting conversation:", err);
        }
    };

    const [isMobile, setIsMobile] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const mobile = width < 768;
            setIsMobile(mobile);
            if (mobile) {
                setIsContextOpen(false);
                setIsSidebarOpen(false);
            }
            else if (width < 1280) setIsContextOpen(false);
            else setIsContextOpen(true);
        };

        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : `260px 1fr ${isContextOpen ? "320px" : "0px"}`,
            height: "100vh",
            width: "100vw",
            overflow: "hidden",
            transition: "grid-template-columns 300ms cubic-bezier(0.4, 0, 0.2, 1)"
        }}>
            <Sidebar
                conversations={conversations}
                currentConversationId={currentConvId}
                onSelectConversation={(id) => {
                    loadConversation(id);
                    if (isMobile) setIsSidebarOpen(false);
                }}
                onNewChat={() => {
                    setCurrentConvId(null);
                    setMessages([]);
                    if (isMobile) setIsSidebarOpen(false);
                }}
                onDeleteConversation={handleDeleteConversation}
                username={session?.user?.name || "User"}
                isOpen={isSidebarOpen}
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            />

            <main style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                <ChatThread
                    messages={messages}
                    isLoading={isLoading}
                    onSuggest={handleSendMessage}
                    onEditMessage={(c) => console.log("Edit", c)} // Placeholder
                    title={conversations.find(c => c.id === currentConvId)?.title}
                    onToggleContext={() => setIsContextOpen(!isContextOpen)}
                    isMobile={isMobile}
                    onOpenSidebar={() => setIsSidebarOpen(true)}
                />
                <ChatInput onSend={handleSendMessage} disabled={isLoading} />
            </main>

            {!isMobile && (
                <ContextPanel
                    isOpen={isContextOpen}
                    onToggle={() => setIsContextOpen(!isContextOpen)}
                />
            )}
        </div>
    );
}
