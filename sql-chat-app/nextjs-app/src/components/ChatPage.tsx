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

    useEffect(() => {
        if (isAuthenticated) {
            fetchConversations();
        } else {
            setConversations([]);
        }
    }, [isAuthenticated]);

    const loadConversation = async (id: string) => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await fetch(`/api/conversations/${id}`);
            if (response.ok) {
                const data = await response.json();
                setMessages(data.messages);
                setCurrentConversationId(id);
                setSidebarOpen(false);
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
        e.stopPropagation();
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

        if (!isAuthenticated && guestPromptCount >= 5) {
            setShowLimitReached(true);
            return;
        }

        const userMessage = message;
        setMessage('');
        setIsLoading(true);
        setError(null);

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

                    if (!isAuthenticated) {
                        const newCount = guestPromptCount + 1;
                        setGuestPromptCount(newCount);
                        localStorage.setItem('guest_prompt_count', newCount.toString());

                        if (newCount >= 5) {
                            setShowLimitReached(true);
                        }
                    }

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

    // A luxurious custom renderer that parses markdown code blocks
    const renderMessageContent = (content: string) => {
        if (!content.includes('```')) {
            return <div className="message-content">{content}</div>;
        }

        const parts = content.split(/(```[\s\S]*?```)/g);
        return (
            <div className="message-content">
                {parts.map((part, index) => {
                    if (part.startsWith('```') && part.endsWith('```')) {
                        const lines = part.split('\n');
                        const header = lines[0].replace('```', '').trim() || 'sql';
                        const code = lines.slice(1, -1).join('\n');

                        return (
                            <div key={index} className="code-block-container" style={{
                                margin: '14px 0',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: '1px solid var(--border-default)',
                                background: '#0a0a0f',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                            }}>
                                <div className="code-block-header" style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '8px 14px',
                                    background: 'rgba(255,255,255,0.02)',
                                    borderBottom: '1px solid var(--border-default)',
                                    fontSize: '11px',
                                    fontFamily: "'JetBrains Mono', monospace",
                                    color: 'var(--text-secondary)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    fontWeight: 700
                                }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            backgroundColor: header === 'sql' ? 'var(--accent-primary)' : 'var(--accent-secondary)'
                                        }} />
                                        {header}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(code);
                                        }}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            border: '1px solid var(--border-default)',
                                            color: 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            fontSize: '11px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '3px 8px',
                                            borderRadius: '4px',
                                            transition: 'all 0.2s',
                                            fontFamily: 'inherit'
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.color = '#fff';
                                            e.currentTarget.style.borderColor = 'var(--accent-primary)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.color = 'var(--text-secondary)';
                                            e.currentTarget.style.borderColor = 'var(--border-default)';
                                        }}
                                    >
                                        Copy
                                    </button>
                                </div>
                                <pre style={{
                                    margin: 0,
                                    padding: '16px',
                                    overflowX: 'auto',
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: '13px',
                                    lineHeight: '1.6',
                                    color: '#e2e8f0',
                                    background: '#040406'
                                }}><code>{code}</code></pre>
                            </div>
                        );
                    }
                    return <span key={index} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
                })}
            </div>
        );
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
                onToggle={() => setSidebarOpen(!sidebarOpen)}
            />

            <main className="main-content">
                <div className="app-card">
                    <header className="app-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="3" y1="12" x2="21" y2="12"></line>
                                    <line x1="3" y1="6" x2="21" y2="6"></line>
                                    <line x1="3" y1="18" x2="21" y2="18"></line>
                                </svg>
                            </button>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Image src={logo} alt="Talk2DB Logo" width={18} height={18} />
                                    <p className="eyebrow">Talk2DB Studio</p>
                                </div>
                                <h1 style={{ marginTop: '2px', fontSize: '20px' }}>Ask Database Questions</h1>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div className="status-pill">
                                <span className={`dot ${isLoading ? 'warning' : 'ok'}`} />
                                {isLoading ? 'Generating Query...' : 'Connected'}
                            </div>

                            {isAuthenticated ? (
                                <button
                                    onClick={() => signOut()}
                                    className="logout-btn"
                                >
                                    Log Out
                                </button>
                            ) : (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={onRequireAuth}
                                        className="login-btn"
                                    >
                                        Log In
                                    </button>
                                    <button
                                        onClick={onRequireAuth}
                                        className="register-btn"
                                    >
                                        Sign Up
                                    </button>
                                </div>
                            )}
                        </div>
                    </header>

                    <p className="subtext">
                        {isAuthenticated ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ color: 'var(--accent-primary)' }}>⚡</span> Authorized session: {user?.username}
                            </span>
                        ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ color: 'var(--accent-secondary)' }}>✦</span> Sandbox Mode: {Math.max(0, 5 - guestPromptCount)} free queries remaining.
                            </span>
                        )}
                    </p>

                    <div className="chat-window">
                        {messages.length === 0 ? (
                            <div className="empty-state">
                                <div style={{ color: 'var(--accent-primary)', fontSize: '24px', marginBottom: '12px' }}>📊</div>
                                <h3 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '15px', fontWeight: 600 }}>Explore your Database</h3>
                                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                    Ask for SQL schema explanations, execute optimized analytical queries, or troubleshoot structure tables in real-time.
                                </p>
                            </div>
                        ) : (
                            messages.map((msg, i) => (
                                <div key={i} className={`message ${msg.role}`}>
                                    <div className="message-role">
                                        {msg.role === 'user' ? 'You' : 'Talk2DB Assistant'}
                                    </div>

                                    {renderMessageContent(msg.content)}

                                    {msg.role === 'user' && (
                                        <button
                                            className="edit-btn"
                                            onClick={() => editMessage(msg.content)}
                                            title="Edit & Resend"
                                            aria-label="Edit and Resend prompt"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"></path>
                                            </svg>
                                        </button>
                                    )}
                                    {msg.role === 'assistant' && (
                                        <button
                                            className="copy-btn"
                                            onClick={(e) => {
                                                navigator.clipboard.writeText(msg.content);
                                                const btn = e.currentTarget;
                                                const label = btn.querySelector('.copy-label');
                                                if (label) {
                                                    label.textContent = 'Copied!';
                                                    setTimeout(() => { label.textContent = 'Copy'; }, 2000);
                                                }
                                            }}
                                            title="Copy response"
                                            aria-label="Copy response text"
                                        >
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                            </svg>
                                            <span className="copy-label">Copy</span>
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {error && (
                        <div className="error-banner">
                            <span style={{ marginRight: '6px' }}>⚠</span> {error}
                        </div>
                    )}

                    <div className="input-row">
                        <textarea
                            ref={textareaRef}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="Type a database question or SQL query description..."
                            disabled={isLoading}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={isLoading || !message.trim() || (!isAuthenticated && guestPromptCount >= 5)}
                            className={(!isAuthenticated && guestPromptCount >= 5) ? 'disabled-btn' : ''}
                        >
                            {isLoading ? (
                                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)"></circle>
                                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"></path>
                                </svg>
                            ) : (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(45deg)' }}>
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                            )}
                        </button>
                    </div>

                    {!isAuthenticated && showLimitReached && (
                        <div className="limit-overlay" style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(2,2,4,0.94)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            padding: '40px',
                            backdropFilter: 'blur(12px)',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔒</div>
                            <h2 style={{ color: 'var(--accent-primary)', marginBottom: '12px', fontSize: '24px', fontWeight: 800 }}>Prompt Limit Reached</h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', maxWidth: '420px', fontSize: '14px', lineHeight: '1.5' }}>
                                You&apos;ve reached the limit of 5 free guest prompts. Unlock unlimited history tracking and high-performance querying options by subscribing.
                            </p>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <button
                                    onClick={onRequireAuth}
                                    className="auth-submit"
                                    style={{ padding: '14px 28px' }}
                                >
                                    Get Free Account
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
