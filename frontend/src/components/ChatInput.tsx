// ChatInput component for message input

import { useState, useRef, useEffect } from 'react';
import './ChatInput.css';

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

export function ChatInput({ onSend, disabled = false, placeholder = 'Ask Lima about farming...' }: ChatInputProps) {
    const [value, setValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        }
    }, [value]);

    const handleSubmit = () => {
        const trimmed = value.trim();
        if (trimmed && !disabled) {
            onSend(trimmed);
            setValue('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="chat-input-wrapper">
            <div className="chat-input">
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    rows={1}
                    className="chat-input__textarea"
                />
                <button
                    onClick={handleSubmit}
                    disabled={disabled || !value.trim()}
                    className="chat-input__send"
                    aria-label="Send message"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 2L11 13" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>
            <p className="chat-input__disclaimer">
                Lima provides agricultural guidance based on available knowledge. Always verify critical decisions with local experts.
            </p>
        </div>
    );
}
