// API Service for communicating with the FastAPI backend

import type { ChatRequest, ChatResponse } from '../types';

const API_BASE = '/api';

class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorText = await response.text();
        throw new ApiError(response.status, errorText || 'An error occurred');
    }
    return response.json();
}

export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });
    return handleResponse<ChatResponse>(response);
}

export async function checkHealth(): Promise<{ status: string }> {
    const response = await fetch(`${API_BASE}/health`);
    return handleResponse<{ status: string }>(response);
}

export { ApiError };
