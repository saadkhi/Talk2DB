"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import logo from '../media/logo_talk2db.png';

interface Conversation {
    id: string;
    title: string;
    updatedAt: string;
    createdAt: string;
}

interface SidebarProps {
    conversations: Conversation[];
    currentConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onNewChat: () => void;
    onDeleteConversation: (id: string, e: React.MouseEvent) => void;
    username: string;
    isOpen: boolean;
    toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    conversations,
    currentConversationId,
    onSelectConversation,
    onNewChat,
    onDeleteConversation,
    username,
    isOpen,
    toggleSidebar,
}) => {
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const confirmDelete = (e: React.MouseEvent) => {
        if (deleteId) {
            onDeleteConversation(deleteId, e);
            setDeleteId(null);
        }
    };

    const cancelDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteId(null);
    };

    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteId(id);
    };

    return (
        <>
            <div className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(255,255,255,0.03)',
                            padding: '6px',
                            borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <Image src={logo} alt="Talk2DB Logo" width={28} height={28} priority />
                        </div>
                        <span style={{ fontSize: '18px', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>
                            Talk2<span style={{ color: 'var(--accent-primary)' }}>DB</span>
                        </span>
                    </div>

                    <div className="user-profile">
                        <span>●</span> {username}
                    </div>

                    <button onClick={onNewChat} className="new-chat-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        New Chat
                    </button>
                </div>

                <div className="conversation-list">
                    {conversations.length === 0 ? (
                        <div style={{
                            padding: '24px 16px',
                            textAlign: 'center',
                            fontSize: '12px',
                            color: 'var(--text-muted)'
                        }}>
                            No recent conversations
                        </div>
                    ) : (
                        conversations.map((conv) => (
                            <div
                                key={conv.id}
                                className={`conversation-item ${currentConversationId === conv.id ? 'active' : ''}`}
                                onClick={() => onSelectConversation(conv.id)}
                            >
                                <div style={{
                                    marginRight: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    color: currentConversationId === conv.id ? 'var(--accent-primary)' : 'var(--text-muted)'
                                }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                </div>

                                <div className="conversation-info">
                                    <div className="conversation-title">{conv.title || 'Untitled Chat'}</div>
                                    <div className="conversation-date">
                                        {new Date(conv.updatedAt).toLocaleDateString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>
                                </div>

                                <button
                                    className="delete-btn"
                                    onClick={(e) => handleDeleteClick(conv.id, e)}
                                    title="Delete Chat"
                                    aria-label="Delete recent chat"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
            {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar} />}

            {deleteId && (
                <div className="modal-overlay">
                    <div className="delete-modal">
                        <h3>Delete Chat?</h3>
                        <p>This action cannot be undone. All database history associated with this chat will be lost.</p>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={cancelDelete}>Cancel</button>
                            <button className="confirm-delete-btn" onClick={confirmDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Sidebar;
