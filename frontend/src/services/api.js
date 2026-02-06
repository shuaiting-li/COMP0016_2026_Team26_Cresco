/**
 * API service for communicating with the Cresco backend
 */

// Use environment variable or default to localhost:8000
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

/**
 * Send a message to the chatbot and get a response
 * @param {string} message - The user's message
 * @param {string} conversationId - Optional conversation ID for context
 * @param {Array<File>} files - Optional array of uploaded files
 * @returns {Promise<{reply: string, tasks: Array, citations: Array}>}
 */
export async function sendMessage(message, conversationId = null, files = []) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout for LLM

    try {
        // Read file contents if files are provided
        const fileData = await Promise.all(
            files.map(async (file) => {
                const content = await file.text();
                return {
                    name: file.name,
                    content: content,
                };
            })
        );

        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                conversation_id: conversationId,
                files: fileData.length > 0 ? fileData : null,
            }),
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Transform backend response to frontend format
        // Backend returns: { answer: string, sources: string[], tasks: array, conversation_id?: string }
        // Frontend expects: { reply: string, tasks: Array, citations: Array }
        return {
            reply: data.answer,
            tasks: data.tasks || [], // Backend now provides tasks
            citations: data.sources || [],
            conversationId: data.conversation_id,
        };
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('Request timed out');
            throw new Error('Request timed out. The server took too long to respond.');
        }
        console.error('Error sending message:', error);
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Check the health status of the backend
 * @returns {Promise<{status: string, version: string, knowledge_base_loaded: boolean}>}
 */
export async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error checking health:', error);
        throw error;
    }
}

/**
 * Trigger indexing of the knowledge base
 * @param {boolean} forceReindex - Whether to force re-indexing
 * @returns {Promise<{status: string, documents_indexed: number, message: string}>}
 */
export async function indexKnowledgeBase(forceReindex = false) {
    try {
        const response = await fetch(`${API_BASE_URL}/index`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                force_reindex: forceReindex,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error indexing knowledge base:', error);
        throw error;
    }
}

/**
 * Trigger indexing of the knowledge base
 * @param {file} file - The file to upload and index
 * @returns {Promise<{filename: string, status: string}>}
 */

export const uploadAndIndexFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
};

