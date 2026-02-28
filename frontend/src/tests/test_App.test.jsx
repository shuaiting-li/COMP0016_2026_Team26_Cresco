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
    isLoggedIn: vi.fn(() => false),
    logout: vi.fn(),
    getUsername: vi.fn(() => 'testuser'),
    login: vi.fn(),
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

        // Open profile dropdown
        const avatarBtn = screen.getByText('TE').closest('button');
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

        // Close via X button
        const closeButtons = screen.getAllByText('X');
        await user.click(closeButtons[0]);
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

        // Close via X button
        const closeButtons = screen.getAllByText('X');
        await user.click(closeButtons[0]);

        expect(screen.queryByText(/please select a farm location first/i)).not.toBeInTheDocument();
    });

    it('deletes last user–assistant exchange', async () => {
        /** Verifies the delete button removes the last user+assistant message pair. */
        api.isLoggedIn.mockReturnValue(true);
        api.sendMessage.mockResolvedValueOnce({
            reply: 'Response text',
            tasks: [],
            citations: [],
        });

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
    });
});
