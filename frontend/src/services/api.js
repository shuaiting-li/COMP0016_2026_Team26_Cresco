/**
 * API service for communicating with the Cresco backend
 */

// Use environment variable or default to localhost:8000
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// --- Auth helpers ---

const TOKEN_KEY = 'cresco_token';
const USERNAME_KEY = 'cresco_username';

/** Get the stored JWT token. */
export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

/** Get the stored username. */
export function getUsername() {
    return localStorage.getItem(USERNAME_KEY);
}

/** Check whether the user is logged in. */
export function isLoggedIn() {
    return !!getToken();
}

/** Clear auth state (logout). */
export function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
}

function saveAuth(data) {
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USERNAME_KEY, data.username);
}

/** Build standard headers, attaching the Bearer token when available. */
function authHeaders(extra = {}) {
    const headers = { 'Content-Type': 'application/json', ...extra };
    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

/**
 * Register a new user (admin-only endpoint — called from admin tools, not the login page).
 * @param {string} username
 * @param {string} password
 * @param {boolean} isAdmin
 * @returns {Promise<{access_token: string, username: string}>}
 */
export async function register(username, password, isAdmin = false) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ username, password, is_admin: isAdmin }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Registration failed (${response.status})`);
    }

    const data = await response.json();
    saveAuth(data);
    return data;
}

/**
 * Log in an existing user.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{access_token: string, username: string}>}
 */
export async function login(username, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Login failed (${response.status})`);
    }

    const data = await response.json();
    saveAuth(data);
    return data;
}

/**
 * Delete the currently authenticated user account.
 * @returns {Promise<{message: string, username: string}>}
 */
export async function deleteAccount() {
    const response = await fetch(`${API_BASE_URL}/account`, {
        method: 'DELETE',
        headers: authHeaders(),
    });

    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Account deletion failed (${response.status})`);
    }

    const data = await response.json();
    logout();
    return data;
}

/**
 * Send a message to the chatbot and get a response
 * @param {string} message - The user's message
 * @param {string} conversationId - Optional conversation ID for context
 * @param {Array<File>} files - Optional array of uploaded files
 * @param {boolean} enableInternetSearch - Whether the agent can use internet search
 * @returns {Promise<{reply: string, tasks: Array, citations: Array, charts: Array, conversationId: string}>}
 */
export async function sendMessage(message, conversationId = null, files = [], enableInternetSearch = true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout for LLM

    try {
        // Send only file names — content is already indexed in the
        // knowledge base via the upload endpoint, so the agent
        // retrieves it through the RAG tool.
        const fileData = files.map((file) => ({ name: file.name }));

        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                message,
                conversation_id: conversationId,
                files: fileData.length > 0 ? fileData : null,
                enable_internet_search: enableInternetSearch,
            }),
            signal: controller.signal,
        });

        if (response.status === 401 || response.status === 403) {
            logout();
            throw new Error('Session expired. Please log in again.');
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Transform backend response to frontend format
        // Backend returns: { answer: string, sources: string[], tasks: array, charts: array, conversation_id?: string }
        // Frontend expects: { reply: string, tasks: Array, citations: Array, charts: Array }
        return {
            reply: data.answer,
            tasks: data.tasks || [], // Backend now provides tasks
            charts: data.charts || [], // Backend now provides charts
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
            headers: authHeaders(),
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

/**
 * Forward geocode a search query (city, address, postcode) via the backend proxy.
 * @param {string} query
 * @returns {Promise<Array<{ lat: string, lon: string, display_name: string }>>}
 */
export async function geocodeSearch(query) {
    const params = new URLSearchParams({ q: query });
    const response = await fetch(`${API_BASE_URL}/geocode/search?${params}`, {
        headers: authHeaders(),
    });

    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
        throw new Error(`Geocode search failed (${response.status})`);
    }

    return await response.json();
}

/**
 * Reverse geocode coordinates via the backend proxy.
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{ display_name: string }>}
 */
export async function geocodeReverse(lat, lon) {
    const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
    const response = await fetch(`${API_BASE_URL}/geocode/reverse?${params}`, {
        headers: authHeaders(),
    });

    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
        throw new Error(`Reverse geocode failed (${response.status})`);
    }

    return await response.json();
}

/**
 * Save farm location and area data to the backend.
 * @param {{ location: string, area: string }} farmData
 * @returns {Promise<{ message: string, data: object }>}
 */
export async function saveFarmData(farmData) {
    const response = await fetch(`${API_BASE_URL}/farm-data`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(farmData),
    });

    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
        throw new Error(`Failed to save farm data (${response.status})`);
    }

    return await response.json();
}

/**
 * Fetch saved farm data for the current user.
 * @returns {Promise<object|null>} The farm data object, or null if none exists.
 */
export async function fetchFarmData() {
    const response = await fetch(`${API_BASE_URL}/farm-data`, {
        headers: authHeaders(),
    });

    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error('Session expired. Please log in again.');
    }

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw new Error(`Failed to fetch farm data (${response.status})`);
    }

    const json = await response.json();
    return json.data;
}

/**
 * Fetch current weather and forecast for given coordinates via the backend proxy.
 * The backend fetches from OpenWeatherMap (keeping the API key server-side) and stores the data.
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{ current_weather: object, forecast: object }>}
 */
export async function fetchWeather(lat, lon) {
    const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
    const response = await fetch(`${API_BASE_URL}/weather?${params}`, {
        headers: authHeaders(),
    });

    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
        throw new Error(`Failed to fetch weather data (${response.status})`);
    }

    return await response.json();
}

/**
 * Delete the last user-assistant exchange from the agent's conversation memory.
 * @returns {Promise<{status: string}>}
 */
export async function deleteLastExchange() {
    const token = getToken();
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/chat/last-exchange`, {
        method: 'DELETE',
        headers,
    });

    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
        throw new Error(`Delete exchange failed (${response.status})`);
    }

    return await response.json();
}

/**
 * Fetch the list of uploaded files for the current user.
 * @returns {Promise<Array<{name: string}>>}
 */
export async function fetchUploadedFiles() {
    const response = await fetch(`${API_BASE_URL}/uploads`, {
        headers: authHeaders(),
    });

    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
        throw new Error(`Failed to fetch uploaded files (${response.status})`);
    }

    const data = await response.json();
    return data.files;
}

export const deleteUploadedFile = async (filename) => {
    const response = await fetch(`${API_BASE_URL}/upload/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers: authHeaders(),
    });

    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error('Session expired');
    }

    if (!response.ok) {
        throw new Error(`Delete failed (${response.status})`);
    }

    return await response.json();
};

export const uploadAndIndexFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const token = getToken();
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers,
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
};

export const deleteDroneImage = async (filename) => {
    const response = await fetch(`${API_BASE_URL}/images/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers: authHeaders(),
    });

    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error('Session expired');
    }

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Delete image failed (${response.status})`);
    }

    return await response.json();
};

export const fetchDroneImages = async () => {
    const response = await fetch(`${API_BASE_URL}/images`, {
        method: 'GET',
        headers: authHeaders(),
    });

    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error('Session expired');
    }

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Fetch images failed (${response.status})`);
    }

    const data = await response.json();
    return data.images || [];
};

export const fetchDroneImageBlob = async (filename) => {
    const response = await fetch(`${API_BASE_URL}/images/${encodeURIComponent(filename)}`, {
        method: 'GET',
        headers: authHeaders(),
    });

    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error('Session expired');
    }

    if (!response.ok) {
        const err = typeof response.json === 'function'
            ? await response.json().catch(() => ({}))
            : {};
        throw new Error(err.detail || `Fetch image failed (${response.status})`);
    }

    return await response.blob();
};

export const uploadDroneImage = async (indexType, rgbFile, nirFile) => {
    const formData = new FormData();
    formData.append('files', rgbFile);
    formData.append('files', nirFile);

    const token = getToken();
    const headers = {};
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
        `${API_BASE_URL}/droneimage?index_type=${encodeURIComponent(indexType.toLowerCase())}`,
        {
            method: 'POST',
            body: formData,
            headers,
        },
    );

    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error('Session expired');
    }

    if (!response.ok) {
        const err = typeof response.json === 'function'
            ? await response.json().catch(() => ({}))
            : {};
        throw new Error(err.detail || `Upload image failed (${response.status})`);
    }

    return await response.blob();
};

export const updateDroneImageTimestamp = async (filename, timestamp) => {
    const response = await fetch(`${API_BASE_URL}/images/${encodeURIComponent(filename)}/timestamp`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ timestamp }),
    });

    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error('Session expired');
    }

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Update timestamp failed (${response.status})`);
    }

    return await response.json();
};


/**
 * handle satellite image upload and processing
 */
export async function handleSatelliteImage() {
    try {
        const response = await fetch(`${API_BASE_URL}/satellite-image`, {
            method: 'POST',
            headers: authHeaders(),
            // body: JSON.stringify({
            //     force_reindex: forceReindex,
            // }),
        });


        if (response.ok) {
            // Return the raw Blob so the caller can manage createObjectURL/revokeObjectURL.
            return await response.blob();
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

    } catch (error) {
        console.error('Error handling satellite image:', error);
        throw error;
    }
}