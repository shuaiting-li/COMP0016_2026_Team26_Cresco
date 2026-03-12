/**
 * Tests for the Dashboard component.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../layout/Dashboard';

// Recharts ResizeObserver stub
class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver || ResizeObserverStub;

describe('Dashboard', () => {
    beforeEach(() => {
        fetch.mockReset();
    });

    it('renders page title', () => {
        render(<Dashboard farmLocation={null} messages={[]} />);
        expect(screen.getByText('Farm Overview')).toBeInTheDocument();
    });

    it('renders current season in subtitle', () => {
        render(<Dashboard farmLocation={null} messages={[]} />);
        expect(screen.getByText(/current season snapshot/i)).toBeInTheDocument();
    });

    it('renders empty task state when no messages', () => {
        render(<Dashboard farmLocation={null} messages={[]} />);
        expect(screen.getByText(/tasks suggested by the assistant/i)).toBeInTheDocument();
    });

    it('renders tasks from messages', () => {
        const messages = [
            {
                id: 1,
                role: 'assistant',
                content: 'plan',
                tasks: [
                    { title: 'Soil Test', detail: 'Check pH', priority: 'high' },
                    { title: 'Fertilise', detail: 'Apply NPK', priority: 'medium' },
                ],
            },
        ];
        render(<Dashboard farmLocation={null} messages={messages} />);
        expect(screen.getByText('Soil Test')).toBeInTheDocument();
        expect(screen.getByText('Fertilise')).toBeInTheDocument();
        expect(screen.getByText('Check pH')).toBeInTheDocument();
    });

    it('shows forecast placeholder when no farm location', () => {
        render(<Dashboard farmLocation={null} messages={[]} />);
        expect(screen.getByText(/set a farm location/i)).toBeInTheDocument();
    });

    it('shows forecast loading state when farm location provided', async () => {
        const farmLoc = { lat: 51.5, lng: -0.1, name: 'London' };
        // Don't resolve the fetch yet to capture loading state
        fetch.mockImplementation(() => new Promise(() => {}));
        render(<Dashboard farmLocation={farmLoc} messages={[]} />);
        expect(screen.getByText(/loading forecast/i)).toBeInTheDocument();
    });

    it('shows forecast error on fetch failure', async () => {
        const farmLoc = { lat: 51.5, lng: -0.1, name: 'London' };
        fetch.mockResolvedValueOnce({ ok: false, status: 502 });
        render(<Dashboard farmLocation={farmLoc} messages={[]} />);
        await waitFor(() => {
            expect(screen.getByText(/failed to load forecast/i)).toBeInTheDocument();
        });
    });

    it('shows field health placeholder when no NDVI image', () => {
        // Mock the NDVI images endpoint to return empty
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ images: [] }),
        });
        render(<Dashboard farmLocation={null} messages={[]} />);
        expect(screen.getByText(/upload drone images/i)).toBeInTheDocument();
    });

    it('renders NDVI image when available', async () => {
        const ndviData = {
            images: [
                { id: '1', filename: 'ndvi_001.png', timestamp: '2026-01-15T10:00:00Z' },
            ],
        };
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ndviData,
        });
        render(<Dashboard farmLocation={null} messages={[]} />);
        await waitFor(() => {
            expect(screen.getByAltText('NDVI Map')).toBeInTheDocument();
        });
    });

    it('displays farm location name in forecast header', () => {
        const farmLoc = { lat: 51.5, lng: -0.1, name: 'Cambridge' };
        fetch.mockImplementation(() => new Promise(() => {}));
        render(<Dashboard farmLocation={farmLoc} messages={[]} />);
        expect(screen.getByText('Cambridge')).toBeInTheDocument();
    });
});
