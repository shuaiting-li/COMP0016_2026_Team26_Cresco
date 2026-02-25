/**
 * Tests for the AuthPage component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthPage from '../layout/AuthPage';

/* Mock the dynamic import of api.js used inside AuthPage */
vi.mock('../services/api', () => ({
    login: vi.fn(),
}));

describe('AuthPage', () => {
    /** Tests for the authentication/login page. */

    let onAuth;

    beforeEach(() => {
        onAuth = vi.fn();
    });

    it('renders the login form', () => {
        /** Verifies the login form fields and submit button are present. */
        render(<AuthPage onAuth={onAuth} />);

        expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('renders the Cresco branding', () => {
        /** Verifies the logo text is displayed. */
        render(<AuthPage onAuth={onAuth} />);

        expect(screen.getByText('Cresco')).toBeInTheDocument();
        expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();
    });

    it('calls onAuth on successful login', async () => {
        /** Verifies successful login triggers the onAuth callback. */
        const { login } = await import('../services/api');
        login.mockResolvedValueOnce({ access_token: 'jwt', username: 'farmer' });

        render(<AuthPage onAuth={onAuth} />);
        const user = userEvent.setup();

        await user.type(screen.getByLabelText(/username/i), 'farmer');
        await user.type(screen.getByLabelText(/password/i), 'password123');
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(onAuth).toHaveBeenCalledTimes(1);
        });
        expect(login).toHaveBeenCalledWith('farmer', 'password123');
    });

    it('shows error message on login failure', async () => {
        /** Verifies error text is displayed when login throws. */
        const { login } = await import('../services/api');
        login.mockRejectedValueOnce(new Error('Invalid credentials'));

        render(<AuthPage onAuth={onAuth} />);
        const user = userEvent.setup();

        await user.type(screen.getByLabelText(/username/i), 'bad');
        await user.type(screen.getByLabelText(/password/i), 'wrongpass');
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
        });
        expect(onAuth).not.toHaveBeenCalled();
    });

    it('shows loading state while submitting', async () => {
        /** Verifies the button text changes during submission. */
        const { login } = await import('../services/api');
        // Never resolve — keeps the component in loading state
        login.mockReturnValueOnce(new Promise(() => {}));

        render(<AuthPage onAuth={onAuth} />);
        const user = userEvent.setup();

        await user.type(screen.getByLabelText(/username/i), 'farmer');
        await user.type(screen.getByLabelText(/password/i), 'password123');
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(screen.getByText(/please wait/i)).toBeInTheDocument();
        });
    });

    it('has required and minLength attributes on inputs', () => {
        /** Verifies HTML validation attributes are set. */
        render(<AuthPage onAuth={onAuth} />);

        const usernameInput = screen.getByLabelText(/username/i);
        const passwordInput = screen.getByLabelText(/password/i);

        expect(usernameInput).toBeRequired();
        expect(usernameInput).toHaveAttribute('minLength', '3');
        expect(passwordInput).toBeRequired();
        expect(passwordInput).toHaveAttribute('minLength', '8');
    });
});
