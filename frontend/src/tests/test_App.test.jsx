/**
 * Tests for the root App component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/* ---------- Mocks ---------- */

vi.mock('../services/api', () => ({
    sendMessage: vi.fn(),
    uploadAndIndexFile: vi.fn(),
    deleteUploadedFile: vi.fn(),
    fetchUploadedFiles: vi.fn(() => Promise.resolve([])),
    fetchFarmData: vi.fn(() => Promise.resolve(null)),
    fetchChatHistory: vi.fn(() => Promise.resolve([])),
    clearChatHistory: vi.fn(() => Promise.resolve({ status: 'cleared' })),
    isLoggedIn: vi.fn(() => false),
    logout: vi.fn(),
    getUsername: vi.fn(() => 'testuser'),
    login: vi.fn(),
    deleteLastExchange: vi.fn(),
    deleteAccount: vi.fn(),
}));

// Avoid rendering heavy sub-components that require Leaflet / canvas
vi.mock('../satellite', () => ({
    default: () => <div data-testid="satellite-map">SatelliteMap</div>,
}));

vi.mock('../weather', () => ({
    default: () => <div data-testid="weather-widget">Weather</div>,
}));

import App from '../App';
import * as api from '../services/api';

describe('App', () => {
    /** Tests for the root application component. */

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders AuthPage when not authenticated', () => {
        /** Verifies the login page is shown for unauthenticated users. */
        api.isLoggedIn.mockReturnValue(false);
        render(<App />);

        expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();
    });

    it('renders main layout when authenticated', () => {
        /** Verifies the chat interface is shown after login. */
        api.isLoggedIn.mockReturnValue(true);
        render(<App />);

        expect(screen.getByText('Cresco')).toBeInTheDocument();
        expect(screen.getByText('Data Sources')).toBeInTheDocument();
        expect(screen.getByText('Toolbox')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/message cresco/i)).toBeInTheDocument();
    });

    it('transitions from auth to main on successful login', async () => {
        /** Verifies login flow navigates to the chat UI. */
        api.isLoggedIn.mockReturnValue(false);
        api.login.mockResolvedValueOnce({ access_token: 'jwt', username: 'farmer' });

        render(<App />);
        const user = userEvent.setup();

        await user.type(screen.getByLabelText(/username/i), 'farmer');
        await user.type(screen.getByLabelText(/password/i), 'password123');
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/message cresco/i)).toBeInTheDocument();
        });
    });

    it('handles logout flow', async () => {
        /** Verifies logout returns to the login screen. */
        api.isLoggedIn.mockReturnValue(true);
        render(<App />);
        const user = userEvent.setup();

        // Open profile dropdown — initials derived from mock username
        const initials = 'testuser'.slice(0, 2).toUpperCase();
        const avatarBtn = screen.getByText(initials).closest('button');
        await user.click(avatarBtn);

        // Click sign out
        await user.click(screen.getByText(/sign out/i));

        expect(api.logout).toHaveBeenCalled();
        expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();
    });

    it('sends a message and displays response', async () => {
        /** Verifies end-to-end message flow. */
        api.isLoggedIn.mockReturnValue(true);
        api.sendMessage.mockResolvedValueOnce({
            reply: 'Wheat should be planted in October.',
            tasks: [],
            citations: ['wheat_guide.md'],
            conversationId: 'conv-1',
        });

        render(<App />);
        const user = userEvent.setup();

        const input = screen.getByPlaceholderText(/message cresco/i);
        await user.type(input, 'When to plant wheat?{Enter}');

        // User message should appear immediately
        expect(screen.getByText('When to plant wheat?')).toBeInTheDocument();

        // Wait for assistant response
        await waitFor(() => {
            expect(screen.getByText(/wheat should be planted in october/i)).toBeInTheDocument();
        });
    });

    it('shows error message when sendMessage fails', async () => {
        /** Verifies error handling in the chat flow. */
        api.isLoggedIn.mockReturnValue(true);
        api.sendMessage.mockRejectedValueOnce(new Error('Server down'));

        render(<App />);
        const user = userEvent.setup();

        const input = screen.getByPlaceholderText(/message cresco/i);
        await user.type(input, 'hello{Enter}');

        await waitFor(() => {
            expect(screen.getByText(/error communicating with the server/i)).toBeInTheDocument();
        });
    });

    it('opens and closes satellite modal', async () => {
        /** Verifies the satellite map modal lifecycle. */
        api.isLoggedIn.mockReturnValue(true);
        render(<App />);
        const user = userEvent.setup();

        // Open satellite
        await user.click(screen.getByText('Add Farm'));
        expect(screen.getByTestId('satellite-map')).toBeInTheDocument();

        // Close via icon button
        const closeBtn = screen.getByRole('button', { name: /close/i });
        await user.click(closeBtn);
        expect(screen.queryByTestId('satellite-map')).not.toBeInTheDocument();
    });

    it('opens and closes weather modal', async () => {
        /** Verifies the weather modal lifecycle without farm location. */
        api.isLoggedIn.mockReturnValue(true);
        render(<App />);
        const user = userEvent.setup();

        // Open weather
        await user.click(screen.getByText('Weather Data'));

        // Should show "select farm location" message since no farm is set
        await waitFor(() => {
            expect(screen.getByText(/please select a farm location first/i)).toBeInTheDocument();
        });

        // Close via icon button
        const closeBtn = screen.getByRole('button', { name: /close/i });
        await user.click(closeBtn);

        expect(screen.queryByText(/please select a farm location first/i)).not.toBeInTheDocument();
    });

    it('deletes last user–assistant exchange and calls backend', async () => {
        /** Verifies UI removal and backend API call when deleting the last exchange. */
        api.isLoggedIn.mockReturnValue(true);
        api.sendMessage.mockResolvedValueOnce({
            reply: 'Response text',
            tasks: [],
            citations: [],
        });
        api.deleteLastExchange.mockResolvedValueOnce({ status: 'deleted' });

        render(<App />);
        const user = userEvent.setup();

        const input = screen.getByPlaceholderText(/message cresco/i);
        await user.type(input, 'hello{Enter}');

        // Wait for assistant response
        await waitFor(() => {
            expect(screen.getByText('Response text')).toBeInTheDocument();
        });

        // Delete button should now be visible
        const deleteBtn = screen.getByRole('button', { name: /delete last exchange/i });
        await user.click(deleteBtn);

        // Both messages should be removed
        expect(screen.queryByText('hello')).not.toBeInTheDocument();
        expect(screen.queryByText('Response text')).not.toBeInTheDocument();

        // Empty state should return
        expect(screen.getByText('Cresco Intelligence')).toBeInTheDocument();

        // Backend API should have been called
        await waitFor(() => {
            expect(api.deleteLastExchange).toHaveBeenCalledTimes(1);
        });
    });

    it('shows delete confirmation and cancels on No', async () => {
        /** Verifies account deletion prompt closes without API call when cancelled. */
        api.isLoggedIn.mockReturnValue(true);
        render(<App />);
        const user = userEvent.setup();

        const initials = 'testuser'.slice(0, 2).toUpperCase();
        const avatarBtn = screen.getByText(initials).closest('button');
        await user.click(avatarBtn);
        await user.click(screen.getByText(/delete account/i));

        expect(screen.getByText(/delete account\?/i)).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: /^no$/i }));

        expect(api.deleteAccount).not.toHaveBeenCalled();
        expect(screen.queryByText(/delete account\?/i)).not.toBeInTheDocument();
        expect(screen.getByPlaceholderText(/message cresco/i)).toBeInTheDocument();
    });

    it('deletes account on Yes and returns to auth page', async () => {
        /** Verifies account deletion API runs only after confirmation and logs user out. */
        api.isLoggedIn.mockReturnValue(true);
        api.deleteAccount.mockResolvedValueOnce({ message: 'Account deleted successfully' });

        render(<App />);
        const user = userEvent.setup();

        const initials = 'testuser'.slice(0, 2).toUpperCase();
        const avatarBtn = screen.getByText(initials).closest('button');
        await user.click(avatarBtn);
        await user.click(screen.getByText(/delete account/i));
        await user.click(screen.getByRole('button', { name: /^yes$/i }));

        await waitFor(() => {
            expect(api.deleteAccount).toHaveBeenCalledTimes(1);
            expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();
        });
    }, 10000);

    it('does not reuse previous user farm location after re-login', async () => {
        /** Verifies farm location state is cleared across user switch in a single app session. */
        api.isLoggedIn.mockReturnValue(true);
        api.fetchFarmData
            .mockResolvedValueOnce({ lat: 51.5, lon: -0.12, nodes: [{ lat: 51.5, lon: -0.12 }] })
            .mockResolvedValueOnce(null);
        api.login.mockResolvedValueOnce({ access_token: 'jwt', username: 'seconduser' });

        render(<App />);
        const user = userEvent.setup();

        // User 1 logs out
        const initials = 'testuser'.slice(0, 2).toUpperCase();
        const avatarBtn = screen.getByText(initials).closest('button');
        await user.click(avatarBtn);
        await user.click(screen.getByText(/sign out/i));

        // User 2 logs in
        await user.type(screen.getByLabelText(/username/i), 'seconduser');
        await user.type(screen.getByLabelText(/password/i), 'password123');
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/message cresco/i)).toBeInTheDocument();
        });

        // If stale farm location leaks, Weather component renders; correct behavior is location prompt.
        await user.click(screen.getByText('Weather Data'));
        await waitFor(() => {
            expect(screen.getByText(/please select a farm location first/i)).toBeInTheDocument();
        });
    });
});
