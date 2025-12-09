// ChatMessage component for displaying individual messages

import type { Message, PlannerTask } from '../types';
import './ChatMessage.css';

interface ChatMessageProps {
    message: Message;
}

function TaskCard({ task }: { task: PlannerTask }) {
    const priorityClass = `task-card__priority--${task.priority}`;

    return (
        <div className="task-card">
            <div className="task-card__header">
                <span className="task-card__title">{task.title}</span>
                <span className={`task-card__priority ${priorityClass}`}>
                    {task.priority}
                </span>
            </div>
            <p className="task-card__detail">{task.detail}</p>
        </div>
    );
}

function CitationList({ citations }: { citations: string[] }) {
    if (citations.length === 0) return null;

    return (
        <div className="citations">
            <span className="citations__label">Sources:</span>
            {citations.map((citation, index) => (
                <span key={index} className="citation-badge">
                    {citation}
                </span>
            ))}
        </div>
    );
}

export function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === 'user';

    return (
        <div className={`chat-message chat-message--${message.role}`}>
            <div className="chat-message__avatar">
                {isUser ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M2 17l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
            </div>

            <div className="chat-message__content">
                <div className="chat-message__role">
                    {isUser ? 'You' : 'Lima'}
                </div>
                <div className="chat-message__text">
                    {message.content}
                </div>

                {/* Tasks display */}
                {message.tasks && message.tasks.length > 0 && (
                    <div className="chat-message__tasks">
                        <h4 className="tasks-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Recommended Tasks
                        </h4>
                        <div className="tasks-grid">
                            {message.tasks.map((task, index) => (
                                <TaskCard key={index} task={task} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Citations */}
                {message.citations && <CitationList citations={message.citations} />}
            </div>
        </div>
    );
}
