// Typing indicator component

import './TypingIndicator.css';

export function TypingIndicator() {
    return (
        <div className="typing-indicator">
            <div className="typing-indicator__avatar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 17l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
            <div className="typing-indicator__content">
                <span className="typing-indicator__role">Lima</span>
                <div className="typing-indicator__dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        </div>
    );
}
