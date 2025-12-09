// Custom hook for chat functionality

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Message, Conversation, PlannerTask } from '../types';
import { sendChatMessage } from '../services/api';

function generateId(): string {
    return Math.random().toString(36).substring(2, 15);
}

function getConversationTitle(firstMessage: string): string {
    const maxLength = 30;
    const trimmed = firstMessage.trim();
    if (trimmed.length <= maxLength) return trimmed;
    return trimmed.substring(0, maxLength) + '...';
}

export function useChat() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Get current conversation
    const currentConversation = conversations.find(c => c.id === currentConversationId);
    const messages = currentConversation?.messages || [];

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Create a new conversation
    const createNewConversation = useCallback(() => {
        const newConv: Conversation = {
            id: generateId(),
            title: 'New Chat',
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        setConversations(prev => [newConv, ...prev]);
        setCurrentConversationId(newConv.id);
        setError(null);
        return newConv.id;
    }, []);

    // Send a message
    const sendMessage = useCallback(async (content: string) => {
        setError(null);

        // Create new conversation if none exists
        let convId = currentConversationId;
        if (!convId) {
            convId = createNewConversation();
        }

        // Add user message
        const userMessage: Message = {
            id: generateId(),
            role: 'user',
            content,
            timestamp: new Date(),
        };

        setConversations(prev => prev.map(conv => {
            if (conv.id === convId) {
                const isFirstMessage = conv.messages.length === 0;
                return {
                    ...conv,
                    title: isFirstMessage ? getConversationTitle(content) : conv.title,
                    messages: [...conv.messages, userMessage],
                    updatedAt: new Date(),
                };
            }
            return conv;
        }));

        // Call API
        setIsLoading(true);
        try {
            const response = await sendChatMessage({ message: content });

            const assistantMessage: Message = {
                id: generateId(),
                role: 'assistant',
                content: response.reply,
                tasks: response.tasks as PlannerTask[],
                citations: response.citations,
                timestamp: new Date(),
            };

            setConversations(prev => prev.map(conv => {
                if (conv.id === convId) {
                    return {
                        ...conv,
                        messages: [...conv.messages, assistantMessage],
                        updatedAt: new Date(),
                    };
                }
                return conv;
            }));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
            setError(errorMessage);
            console.error('Chat error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [currentConversationId, createNewConversation]);

    // Select a conversation
    const selectConversation = useCallback((id: string) => {
        setCurrentConversationId(id);
        setError(null);
    }, []);

    return {
        conversations,
        currentConversationId,
        messages,
        isLoading,
        error,
        messagesEndRef,
        sendMessage,
        createNewConversation,
        selectConversation,
    };
}
