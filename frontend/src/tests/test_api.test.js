/**
 * Tests for the API service layer (services/api.js).
 *
 * Mirrors the backend testing convention of grouping related tests
 * inside describe blocks (analogous to Python test classes).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as api from '../services/api.js';

const API_BASE = 'http://localhost:8000/api/v1';

describe('Auth helpers', () => {
    /** Tests for getToken, getUsername, isLoggedIn, logout. */

    it('getToken returns null when no token stored', () => {
        /** Verifies getToken returns null for unauthenticated state. */
        expect(api.getToken()).toBeNull();
    });

    it('getToken returns stored token', () => {
        /** Verifies getToken reads the correct localStorage key. */
        localStorage.setItem('cresco_token', 'tok123');
        expect(api.getToken()).toBe('tok123');
    });

    it('getUsername returns null when no username stored', () => {
        /** Verifies getUsername returns null for unauthenticated state. */
        expect(api.getUsername()).toBeNull();
    });

    it('getUsername returns stored username', () => {
        /** Verifies getUsername reads the correct localStorage key. */
        localStorage.setItem('cresco_username', 'farmer');
        expect(api.getUsername()).toBe('farmer');
    });

    it('isLoggedIn returns false without token', () => {
        /** Verifies isLoggedIn is false when no token is present. */
        expect(api.isLoggedIn()).toBe(false);
    });

    it('isLoggedIn returns true with token', () => {
        /** Verifies isLoggedIn is true when token exists. */
        localStorage.setItem('cresco_token', 'tok');
        expect(api.isLoggedIn()).toBe(true);
    });

    it('logout clears token and username', () => {
        /** Verifies logout removes both auth keys from localStorage. */
        localStorage.setItem('cresco_token', 'tok');
        localStorage.setItem('cresco_username', 'farmer');
        api.logout();
        expect(localStorage.removeItem).toHaveBeenCalledWith('cresco_token');
        expect(localStorage.removeItem).toHaveBeenCalledWith('cresco_username');
    });
});


describe('login', () => {
    /** Tests for the login() API call. */

    it('sends correct request and saves auth on success', async () => {
        /** Verifies login POSTs credentials and persists the JWT. */
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ access_token: 'jwt123', username: 'farmer' }),
        });

        const result = await api.login('farmer', 'password123');

        expect(fetch).toHaveBeenCalledWith(
            `${API_BASE}/auth/login`,
            expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'farmer', password: 'password123' }),
            }),
        );
        expect(result).toEqual({ access_token: 'jwt123', username: 'farmer' });
        expect(localStorage.setItem).toHaveBeenCalledWith('cresco_token', 'jwt123');
        expect(localStorage.setItem).toHaveBeenCalledWith('cresco_username', 'farmer');
    });

    it('throws on failed login', async () => {
        /** Verifies login throws an error with the backend detail. */
        fetch.mockResolvedValueOnce({
            ok: false,
            status: 401,
            json: async () => ({ detail: 'Invalid credentials' }),
        });

        await expect(api.login('bad', 'creds')).rejects.toThrow('Invalid credentials');
    });

    it('throws generic message when response has no detail', async () => {
        /** Verifies login throws a fallback message on non-JSON error. */
        fetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => { throw new Error('not json'); },
        });

        await expect(api.login('u', 'p')).rejects.toThrow('Login failed (500)');
    });
});


describe('register', () => {
    /** Tests for the register() API call. */

    it('sends registration request with auth header', async () => {
        /** Verifies register attaches Bearer token (admin-only endpoint). */
        localStorage.setItem('cresco_token', 'admin-token');

        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ access_token: 'new-jwt', username: 'newuser' }),
        });

        await api.register('newuser', 'pass1234', false);

        const [url, opts] = fetch.mock.calls[0];
        expect(url).toBe(`${API_BASE}/auth/register`);
        expect(opts.headers).toMatchObject({ Authorization: 'Bearer admin-token' });
        expect(JSON.parse(opts.body)).toEqual({
            username: 'newuser',
            password: 'pass1234',
            is_admin: false,
        });
    });

    it('throws on registration failure', async () => {
        /** Verifies register throws with backend error detail. */
        fetch.mockResolvedValueOnce({
            ok: false,
            status: 409,
            json: async () => ({ detail: 'Username already exists' }),
        });

        await expect(api.register('dup', 'pass')).rejects.toThrow('Username already exists');
    });
});


describe('sendMessage', () => {
    /** Tests for the sendMessage() chat endpoint call. */

    beforeEach(() => {
        localStorage.setItem('cresco_token', 'tok');
    });

    it('sends message and maps response to frontend format', async () => {
        /** Verifies backend {answer,sources,tasks} → frontend {reply,citations,tasks}. */
        fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({
                answer: 'Plant wheat in October.',
                sources: ['wheat_guide.md'],
                tasks: [{ title: 'Plant', detail: 'Sow seeds', priority: 'high' }],
                conversation_id: 'conv-1',
            }),
        });

        const result = await api.sendMessage('When to plant wheat?');

        expect(result).toEqual({
            reply: 'Plant wheat in October.',
            citations: ['wheat_guide.md'],
            tasks: [{ title: 'Plant', detail: 'Sow seeds', priority: 'high' }],
            conversationId: 'conv-1',
        });
    });

    it('includes conversation_id and files in request body', async () => {
        /** Verifies optional fields are forwarded correctly. */
        const file = new File(['field data'], 'soil.txt', { type: 'text/plain' });

        fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ answer: 'ok', sources: [], tasks: [] }),
        });

        await api.sendMessage('Check my soil', 'conv-1', [file]);

        const body = JSON.parse(fetch.mock.calls[0][1].body);
        expect(body.conversation_id).toBe('conv-1');
        expect(body.files).toHaveLength(1);
        expect(body.files[0].name).toBe('soil.txt');
        expect(body.files[0].content).toBe('field data');
    });

    it('logs out on 401 response', async () => {
        /** Verifies auto-logout when session expires. */
        fetch.mockResolvedValueOnce({ ok: false, status: 401 });

        await expect(api.sendMessage('hi')).rejects.toThrow('Session expired');
        expect(localStorage.removeItem).toHaveBeenCalledWith('cresco_token');
    });

    it('logs out on 403 response', async () => {
        /** Verifies auto-logout on forbidden status. */
        fetch.mockResolvedValueOnce({ ok: false, status: 403 });

        await expect(api.sendMessage('hi')).rejects.toThrow('Session expired');
    });

    it('throws on generic HTTP error', async () => {
        /** Verifies non-auth errors are re-thrown. */
        fetch.mockResolvedValueOnce({ ok: false, status: 500 });

        await expect(api.sendMessage('hi')).rejects.toThrow('HTTP error! status: 500');
    });
});


describe('checkHealth', () => {
    /** Tests for the checkHealth() endpoint call. */

    it('returns health data on success', async () => {
        /** Verifies health check returns backend payload. */
        const payload = { status: 'healthy', version: '0.1.0', knowledge_base_loaded: true };
        fetch.mockResolvedValueOnce({ ok: true, json: async () => payload });

        const result = await api.checkHealth();
        expect(result).toEqual(payload);
    });

    it('throws on failure', async () => {
        /** Verifies health check propagates errors. */
        fetch.mockResolvedValueOnce({ ok: false, status: 503 });

        await expect(api.checkHealth()).rejects.toThrow('HTTP error! status: 503');
    });
});


describe('indexKnowledgeBase', () => {
    /** Tests for the indexKnowledgeBase() endpoint call. */

    beforeEach(() => {
        localStorage.setItem('cresco_token', 'tok');
    });

    it('forwards force_reindex flag', async () => {
        /** Verifies the reindex flag is included in the request. */
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ status: 'ok', documents_indexed: 42, message: 'done' }),
        });

        await api.indexKnowledgeBase(true);

        const body = JSON.parse(fetch.mock.calls[0][1].body);
        expect(body.force_reindex).toBe(true);
    });
});


describe('geocodeSearch', () => {
    /** Tests for the geocodeSearch() proxy call. */

    beforeEach(() => {
        localStorage.setItem('cresco_token', 'tok');
    });

    it('passes query as URL parameter', async () => {
        /** Verifies query is sent as a query string via the proxy. */
        fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => [{ lat: '51.5', lon: '-0.1', display_name: 'London' }],
        });

        const result = await api.geocodeSearch('London');
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/geocode/search?q=London'),
            expect.any(Object),
        );
        expect(result[0].display_name).toBe('London');
    });

    it('logs out on 401', async () => {
        /** Verifies auto-logout for expired sessions on geocode. */
        fetch.mockResolvedValueOnce({ ok: false, status: 401 });

        await expect(api.geocodeSearch('x')).rejects.toThrow('Session expired');
    });
});


describe('geocodeReverse', () => {
    /** Tests for the geocodeReverse() proxy call. */

    beforeEach(() => {
        localStorage.setItem('cresco_token', 'tok');
    });

    it('passes lat and lon as URL parameters', async () => {
        /** Verifies coordinates are sent as query params. */
        fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ display_name: 'Somewhere, UK' }),
        });

        const result = await api.geocodeReverse(51.5, -0.1);
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('lat=51.5'),
            expect.any(Object),
        );
        expect(result.display_name).toBe('Somewhere, UK');
    });

    it('logs out on 403', async () => {
        /** Verifies auto-logout on forbidden. */
        fetch.mockResolvedValueOnce({ ok: false, status: 403 });

        await expect(api.geocodeReverse(0, 0)).rejects.toThrow('Session expired');
    });
});


describe('saveFarmData', () => {
    /** Tests for the saveFarmData() call. */

    beforeEach(() => {
        localStorage.setItem('cresco_token', 'tok');
    });

    it('posts farm data with auth header', async () => {
        /** Verifies farm data is sent as JSON with Bearer token. */
        const farmData = { location: 'Cambridge', area: '1.5' };
        fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ message: 'saved', data: farmData }),
        });

        const result = await api.saveFarmData(farmData);

        const [url, opts] = fetch.mock.calls[0];
        expect(url).toBe(`${API_BASE}/farm-data`);
        expect(opts.method).toBe('POST');
        expect(opts.headers.Authorization).toBe('Bearer tok');
        expect(result.message).toBe('saved');
    });

    it('logs out on 401', async () => {
        /** Verifies auto-logout on expired session. */
        fetch.mockResolvedValueOnce({ ok: false, status: 401 });

        await expect(api.saveFarmData({})).rejects.toThrow('Session expired');
    });
});


describe('fetchWeather', () => {
    /** Tests for the fetchWeather() proxy call. */

    beforeEach(() => {
        localStorage.setItem('cresco_token', 'tok');
    });

    it('passes lat and lon and returns weather data', async () => {
        /** Verifies weather proxy returns complete payload. */
        const payload = { current_weather: { main: { temp: 12 } }, forecast: { list: [] } };
        fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => payload,
        });

        const result = await api.fetchWeather(51.5, -0.1);
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/weather?lat=51.5'),
            expect.any(Object),
        );
        expect(result).toEqual(payload);
    });

    it('logs out on 401', async () => {
        /** Verifies auto-logout on expired session. */
        fetch.mockResolvedValueOnce({ ok: false, status: 401 });

        await expect(api.fetchWeather(0, 0)).rejects.toThrow('Session expired');
    });

    it('throws on non-auth failure', async () => {
        /** Verifies generic errors are propagated. */
        fetch.mockResolvedValueOnce({ ok: false, status: 502 });

        await expect(api.fetchWeather(0, 0)).rejects.toThrow('Failed to fetch weather data (502)');
    });
});


describe('uploadAndIndexFile', () => {
    /** Tests for the uploadAndIndexFile() call. */

    beforeEach(() => {
        localStorage.setItem('cresco_token', 'tok');
    });

    it('uploads file as FormData with auth header', async () => {
        /** Verifies file is sent as multipart form data. */
        const file = new File(['content'], 'report.md', { type: 'text/markdown' });
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ filename: 'report.md', status: 'indexed' }),
        });

        const result = await api.uploadAndIndexFile(file);

        const [url, opts] = fetch.mock.calls[0];
        expect(url).toBe(`${API_BASE}/upload`);
        expect(opts.method).toBe('POST');
        expect(opts.headers.Authorization).toBe('Bearer tok');
        // FormData — no Content-Type header (browser sets boundary)
        expect(opts.headers['Content-Type']).toBeUndefined();
        expect(opts.body).toBeInstanceOf(FormData);
        expect(result.filename).toBe('report.md');
    });

    it('throws on upload failure', async () => {
        /** Verifies HTTP errors are propagated. */
        const file = new File(['x'], 'bad.md');
        fetch.mockResolvedValueOnce({ ok: false, status: 413 });

        await expect(api.uploadAndIndexFile(file)).rejects.toThrow('HTTP error! status: 413');
    });
});


describe('deleteLastExchange', () => {
    /** Tests for the deleteLastExchange() call. */

    beforeEach(() => {
        localStorage.setItem('cresco_token', 'tok');
    });

    it('sends DELETE request with auth header', async () => {
        /** Verifies the correct method, URL, and Bearer token. */
        fetch.mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => ({ status: 'deleted' }),
        });

        const result = await api.deleteLastExchange();

        const [url, opts] = fetch.mock.calls[0];
        expect(url).toBe(`${API_BASE}/chat/last-exchange`);
        expect(opts.method).toBe('DELETE');
        expect(opts.headers.Authorization).toBe('Bearer tok');
        expect(opts.headers['Content-Type']).toBeUndefined();
        expect(result.status).toBe('deleted');
    });

    it('logs out on 401 response', async () => {
        /** Verifies auto-logout on expired session. */
        fetch.mockResolvedValueOnce({ ok: false, status: 401 });

        await expect(api.deleteLastExchange()).rejects.toThrow('Session expired');
        expect(localStorage.getItem('cresco_token')).toBeNull();
    });

    it('throws on generic failure', async () => {
        /** Verifies non-auth HTTP errors are propagated. */
        fetch.mockResolvedValueOnce({ ok: false, status: 404 });

        await expect(api.deleteLastExchange()).rejects.toThrow('Delete exchange failed (404)');
    });
});
