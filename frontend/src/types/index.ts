// API Types matching the FastAPI backend schemas

export interface PlannerTask {
    title: string;
    detail: string;
    priority: 'low' | 'medium' | 'high';
    due?: string;
}

export interface ChatRequest {
    message: string;
    location?: string;
    farm_type?: string;
    force_refresh?: boolean;
}

export interface ChatResponse {
    reply: string;
    tasks: PlannerTask[];
    citations: string[];
}

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    tasks?: PlannerTask[];
    citations?: string[];
    timestamp: Date;
}

export interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    createdAt: Date;
    updatedAt: Date;
}

export interface UserSettings {
    location?: string;
    farmType?: string;
}
