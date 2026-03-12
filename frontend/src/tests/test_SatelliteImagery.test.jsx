/**
 * Tests for the SatelliteImagery component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SatelliteImagery from '../satellite_imagery';

// Mock the api module
vi.mock('../services/api', () => ({
    handleSatelliteImage: vi.fn(),
}));

import { handleSatelliteImage } from '../services/api';

// Stub URL APIs
globalThis.URL.createObjectURL = globalThis.URL.createObjectURL || vi.fn(() => 'blob:sat-url');
globalThis.URL.revokeObjectURL = globalThis.URL.revokeObjectURL || vi.fn();

describe('SatelliteImagery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the fetch button', () => {
        render(<SatelliteImagery />);
        expect(screen.getByRole('button', { name: /fetch satellite analysis/i })).toBeInTheDocument();
    });

    it('renders heading', () => {
        render(<SatelliteImagery />);
        expect(screen.getByText(/upload satellite images/i)).toBeInTheDocument();
    });

    it('shows uploading status while fetching', async () => {
        handleSatelliteImage.mockImplementation(() => new Promise(() => {}));
        render(<SatelliteImagery />);
        fireEvent.click(screen.getByRole('button', { name: /fetch satellite analysis/i }));
        expect(screen.getByText(/uploading/i)).toBeInTheDocument();
    });

    it('shows success and result image on successful fetch', async () => {
        const blob = new Blob(['png'], { type: 'image/png' });
        handleSatelliteImage.mockResolvedValueOnce(blob);

        render(<SatelliteImagery />);
        fireEvent.click(screen.getByRole('button', { name: /fetch satellite analysis/i }));

        await waitFor(() => {
            expect(screen.getByText(/upload successful/i)).toBeInTheDocument();
        });
    });

    it('shows failure when blob is null', async () => {
        handleSatelliteImage.mockResolvedValueOnce(null);

        render(<SatelliteImagery />);
        fireEvent.click(screen.getByRole('button', { name: /fetch satellite analysis/i }));

        await waitFor(() => {
            expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
        });
    });

    it('shows error on exception', async () => {
        handleSatelliteImage.mockRejectedValueOnce(new Error('Network error'));

        render(<SatelliteImagery />);
        fireEvent.click(screen.getByRole('button', { name: /fetch satellite analysis/i }));

        await waitFor(() => {
            expect(screen.getByText(/error uploading/i)).toBeInTheDocument();
        });
    });
});
