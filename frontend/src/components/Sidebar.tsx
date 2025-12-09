// Sidebar component for conversation history

import type { Conversation } from '../types';
import './Sidebar.css';

interface SidebarProps {
    conversations: Conversation[];
    currentConversationId: string | null;
    onNewChat: () => void;
    onSelectConversation: (id: string) => void;
    isOpen: boolean;
    onToggle: () => void;
}

export function Sidebar({
    conversations,
    currentConversationId,
    onNewChat,
    onSelectConversation,
    isOpen,
    onToggle,
}: SidebarProps) {
    return (
        <>
            {/* Mobile overlay */}
            {isOpen && <div className="sidebar-overlay" onClick={onToggle} />}

            <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
                <div className="sidebar__header">
                    <button className="new-chat-btn" onClick={onNewChat}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        New Chat
                    </button>
                    <button className="sidebar__close" onClick={onToggle}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                <nav className="sidebar__nav">
                    <h3 className="sidebar__section-title">Recent</h3>
                    <ul className="conversation-list">
                        {conversations.length === 0 ? (
                            <li className="conversation-list__empty">No conversations yet</li>
                        ) : (
                            conversations.map((conv) => (
                                <li key={conv.id}>
                                    <button
                                        className={`conversation-item ${conv.id === currentConversationId ? 'conversation-item--active' : ''
                                            }`}
                                        onClick={() => onSelectConversation(conv.id)}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <span className="conversation-item__title">{conv.title}</span>
                                    </button>
                                </li>
                            ))
                        )}
                    </ul>
                </nav>

                <div className="sidebar__footer">
                    <div className="sidebar__brand">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>Lima v0.1</span>
                    </div>
                </div>
            </aside>
        </>
    );
}
