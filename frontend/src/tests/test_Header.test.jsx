/**
 * Tests for the Header component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Header from '../layout/Header';

describe('Header', () => {
    /** Tests for the top navigation header. */

    let onLogout;

    beforeEach(() => {
        onLogout = vi.fn();
    });

    it('renders Cresco branding', () => {
        /** Verifies the app title is shown in the header. */
        render(<Header onLogout={onLogout} username="farmer" />);
        expect(screen.getByText('Cresco')).toBeInTheDocument();
    });

    it('displays user initials in avatar', () => {
        /** Verifies the avatar shows the first two characters upper-cased. */
        render(<Header onLogout={onLogout} username="farmer" />);
        expect(screen.getByText('FA')).toBeInTheDocument();
    });

    it('displays default initials when no username', () => {
        /** Verifies fallback initials when username is falsy. */
        render(<Header onLogout={onLogout} username="" />);
        expect(screen.getByText('CR')).toBeInTheDocument();
    });

    it('opens dropdown on profile button click', async () => {
        /** Verifies the dropdown menu appears on click. */
        render(<Header onLogout={onLogout} username="farmer" />);
        const user = userEvent.setup();

        // Click the profile button (the one with initials)
        const profileBtn = screen.getByText('FA').closest('button');
        await user.click(profileBtn);

        expect(screen.getByText('farmer')).toBeInTheDocument();
        expect(screen.getByText(/sign out/i)).toBeInTheDocument();
    });

    it('calls onLogout when sign out is clicked', async () => {
        /** Verifies the logout callback fires. */
        render(<Header onLogout={onLogout} username="farmer" />);
        const user = userEvent.setup();

        // Open dropdown
        const profileBtn = screen.getByText('FA').closest('button');
        await user.click(profileBtn);

        // Click sign out
        await user.click(screen.getByText(/sign out/i));
        expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it('closes dropdown when clicking outside', async () => {
        /** Verifies the dropdown dismisses on outside click. */
        render(<Header onLogout={onLogout} username="farmer" />);
        const user = userEvent.setup();

        // Open dropdown
        const profileBtn = screen.getByText('FA').closest('button');
        await user.click(profileBtn);
        expect(screen.getByText(/sign out/i)).toBeInTheDocument();

        // Click outside
        await user.click(document.body);
        expect(screen.queryByText(/sign out/i)).not.toBeInTheDocument();
    });
});
