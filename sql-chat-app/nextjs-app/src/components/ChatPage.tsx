"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Sidebar from './Sidebar';
import Image from 'next/image';
import logo from '../media/logo_talk2db.png';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface Conversation {
    id: string;
    title: string;
    updatedAt: string;
    createdAt: string;
}

interface ChatPageProps {
    onRequireAuth?: () => void;
}

const ChatPage: React.FC<ChatPageProps> = ({ onRequireAuth }) => {
    const { data: session, status } = useSession();
    const isAuthenticated = status === "authenticated";
    const user = session?.user as any;

    const [guestPromptCount, setGuestPromptCount] = useState<number>(0);
    const [showLimitReached, setShowLimitReached] = useState(false);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const count = parseInt(localStorage.getItem('guest_prompt_count') || '0', 10);
            setGuestPromptCount(count);
            if (!isAuthenticated && count >= 5) {
                setShowLimitReached(true);
            }
        }
    }, [isAuthenticated]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fetch conversations on mount or when auth state changes
    useEffect(() => {
        if (isAuthenticated) {
            fetchConversations();
        } else {
            setConversations([]);
        }
    }, [isAuthenticated]);

    const fetchConversations = async () => {
        try {
            const response = await fetch('/api/conversations');
            if (response.ok) {
                const data = await response.json();
                setConversations(data);
            }
        } catch (err) {
            console.error('Error fetching conversations:', err);
        }
    };

    const loadConversation = async (id: string) => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await fetch(`/api/conversations/${id}`);
            if (response.ok) {
                const data = await response.json();
                setMessages(data.messages);
                setCurrentConversationId(id);
                setSidebarOpen(false); // Close sidebar on mobile after selection
                setTimeout(scrollToBottom, 100);
            } else {
                setError('Failed to load conversation history.');
            }
        } catch (err) {
            console.error('Error loading conversation:', err);
            setError('Failed to load conversation history.');
        } finally {
            setIsLoading(false);
        }
    };

    const deleteConversation = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent selecting the conversation triggers

        try {
            const response = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
            if (response.ok) {
                setConversations(conversations.filter(c => c.id !== id));
                if (currentConversationId === id) {
                    startNewChat();
                }
            } else {
                setError('Failed to delete conversation.');
            }
        } catch (err) {
            console.error('Error deleting conversation:', err);
            setError('Failed to delete conversation.');
        }
    };

    const startNewChat = () => {
        setCurrentConversationId(null);
        setMessages([]);
        setError(null);
        setSidebarOpen(false);
    };

    const editMessage = (content: string) => {
        setMessage(content);
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    };

    const sendMessage = async () => {
        if (!message.trim() || isLoading) return;

        // Limit for unauthenticated users
        if (!isAuthenticated && guestPromptCount >= 5) {
            setShowLimitReached(true);
            return;
        }

        const userMessage = message;
        setMessage('');
        setIsLoading(true);
        setError(null);

        // Add user message to chat immediately
        setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

        try {
            const payload: any = { message: userMessage };
            if (currentConversationId) {
                payload.conversation_id = currentConversationId;
            }

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.response) {
                    setMessages((prev) => [
                        ...prev,
                        { role: 'assistant', content: data.response },
                    ]);

                    // If guest, increment count
                    if (!isAuthenticated) {
                        const newCount = guestPromptCount + 1;
                        setGuestPromptCount(newCount);
                        localStorage.setItem('guest_prompt_count', newCount.toString());

                        if (newCount >= 5) {
                            setShowLimitReached(true);
                        }
                    }

                    // If this was a new conversation, update state and fetch list
                    if (!currentConversationId && data.conversation_id && isAuthenticated) {
                        setCurrentConversationId(data.conversation_id);
                        fetchConversations();
                    } else if (isAuthenticated) {
                        fetchConversations();
                    }
                }
            } else {
                throw new Error('Failed to send message');
            }
        } catch (err) {
            console.error('Error sending message:', err);
            setError(
                'Failed to get a response from the server. Please check your connection and try again.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="app-container">
            <Sidebar
                conversations={conversations}
                currentConversationId={currentConversationId}
                onSelectConversation={loadConversation}
                onNewChat={startNewChat}
                onDeleteConversation={deleteConversation}
                username={user?.username || 'User'}
                isOpen={sidebarOpen}
                toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            />

            <main className="main-content">
                <div className="app-card">
                    <header className="app-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button className="menu-toggle" onClick={() => setSidebarOpen(true)} style={{ background: 'transparent', border: '1px solid #333', color: '#fff', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
                                <span>☰</span>
                            </button>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Image src={logo} alt="Talk2DB Logo" width={20} height={20} />
                                    <p className="eyebrow" style={{ margin: 0 }}>Talk2DB</p>
                                </div>
                                <h1 style={{ marginTop: '4px' }}>Ask database questions</h1>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div className="status-pill">
                                <span className={`dot ${isLoading ? 'warning' : 'ok'}`} />
                                {isLoading ? 'Waiting for response...' : 'Ready'}
                            </div>
                            <button
                                onClick={() => signOut()}
                                className="logout-btn"
                                style={{ display: isAuthenticated ? 'block' : 'none' }}
                            >
                                Logout
                            </button>
                        </div>
                    </header>

                    <p className="subtext" style={{ padding: '20px 24px 0', margin: 0, fontSize: '13px', color: '#888' }}>
                        {isAuthenticated ? (
                            <>hey {user?.username || 'User'}</>
                        ) : (
                            <>Welcome! You have {Math.max(0, 5 - guestPromptCount)} free prompts remaining.</>
                        )}
                    </p>


                    <div className="chat-window">
                        {messages.length === 0 ? (
                            <div className="empty-state">
                                Start a conversation by typing a message below
                            </div>
                        ) : (
                            messages.map((msg, i) => (
                                <div key={i} className={`message ${msg.role}`}>
                                    <div className="message-role">
                                        {msg.role === 'user' ? 'You' : 'Assistant'}
                                    </div>
                                    <div className="message-content" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                                    {msg.role === 'user' && (
                                        <button
                                            className="edit-btn"
                                            onClick={() => editMessage(msg.content)}
                                            title="Edit & Resend"
                                        >
                                            ✏️
                                        </button>
                                    )}
                                    {msg.role === 'assistant' && (
                                        <button
                                            className="copy-btn"
                                            onClick={() => navigator.clipboard.writeText(msg.content)}
                                            title="Copy Response"
                                        >
                                            📋
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {error && (
                        <div className="error-banner">
                            {error}
                        </div>
                    )}

                    <div className="input-row">
                        <textarea
                            ref={textareaRef}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="Type your SQL query or question here..."
                            disabled={isLoading}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={isLoading || !message.trim() || (!isAuthenticated && guestPromptCount >= 5)}
                            className={(!isAuthenticated && guestPromptCount >= 5) ? 'disabled-btn' : ''}
                        >
                            {isLoading ? '...' : 'Send'}
                        </button>
                    </div>

                    {!isAuthenticated && showLimitReached && (
                        <div className="limit-overlay" style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.85)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            borderRadius: '16px',
                            textAlign: 'center',
                            padding: '40px'
                        }}>
                            <h2 style={{ color: '#39ff14', marginBottom: '16px' }}>Prompt Limit Reached</h2>
                            <p style={{ color: '#fff', marginBottom: '24px', maxWidth: '400px' }}>
                                You've used all 5 of your free guest prompts. Please login or register to continue using Talk2DB.
                            </p>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <button
                                    onClick={onRequireAuth}
                                    className="auth-submit"
                                    style={{ padding: '12px 24px' }}
                                >
                                    Login / Register
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ChatPage;
