/**
 * Tests for the DroneImagery component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DroneImagery from '../DroneFrontend/drone_imagery';

// Stub URL.createObjectURL / revokeObjectURL for image previews
globalThis.URL.createObjectURL = globalThis.URL.createObjectURL || vi.fn(() => 'blob:fake-url');
globalThis.URL.revokeObjectURL = globalThis.URL.revokeObjectURL || vi.fn();

describe('DroneImagery', () => {
    beforeEach(() => {
        fetch.mockReset();
        // Default: NDVI images gallery fetch returns empty
        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ images: [] }),
        });
    });

    it('renders upload form with two file inputs', () => {
        render(<DroneImagery />);
        expect(screen.getByRole('tab', { name: /upload/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /gallery/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /time series/i })).toBeInTheDocument();
        expect(screen.getByText(/rgb image/i)).toBeInTheDocument();
        expect(screen.getByText(/nir image/i)).toBeInTheDocument();
    });

    it('renders upload button', () => {
        render(<DroneImagery />);
        expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
    });

    it('shows validation message when uploading without files', async () => {
        render(<DroneImagery />);
        fireEvent.click(screen.getByRole('button', { name: /upload/i }));
        expect(screen.getByText(/please select both images/i)).toBeInTheDocument();
    });

    it('shows previews after selecting files', async () => {
        render(<DroneImagery />);

        const rgbFile = new File(['rgb'], 'rgb.png', { type: 'image/png' });
        const nirFile = new File(['nir'], 'nir.png', { type: 'image/png' });

        fireEvent.change(screen.getByLabelText(/rgb image/i), { target: { files: [rgbFile] } });
        fireEvent.change(screen.getByLabelText(/nir image/i), { target: { files: [nirFile] } });

        expect(screen.getByAltText('RGB Preview')).toBeInTheDocument();
        expect(screen.getByAltText('NIR Preview')).toBeInTheDocument();
    });

    it('performs upload and shows result image on success', async () => {
        // First call: gallery fetch; Second call: upload; Third call: refresh gallery
        fetch.mockReset();
        fetch
            .mockResolvedValueOnce({ ok: true, json: async () => ({ images: [] }) })
            .mockResolvedValueOnce({ ok: true, blob: async () => new Blob(['png'], { type: 'image/png' }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ images: [] }) });

        render(<DroneImagery />);

        const rgbFile = new File(['rgb'], 'rgb.png', { type: 'image/png' });
        const nirFile = new File(['nir'], 'nir.png', { type: 'image/png' });

        fireEvent.change(screen.getByLabelText(/rgb image/i), { target: { files: [rgbFile] } });
        fireEvent.change(screen.getByLabelText(/nir image/i), { target: { files: [nirFile] } });
        fireEvent.click(screen.getByRole('button', { name: /upload/i }));

        await waitFor(() => {
            expect(screen.getByText(/upload successful/i)).toBeInTheDocument();
        });
    });

    it('shows error message on upload failure', async () => {
        fetch.mockReset();
        fetch
            .mockResolvedValueOnce({ ok: true, json: async () => ({ images: [] }) })
            .mockResolvedValueOnce({ ok: false, status: 500 });

        render(<DroneImagery />);

        fireEvent.change(screen.getByLabelText(/rgb image/i), { target: { files: [new File(['r'], 'r.png', { type: 'image/png' })] } });
        fireEvent.change(screen.getByLabelText(/nir image/i), { target: { files: [new File(['n'], 'n.png', { type: 'image/png' })] } });
        fireEvent.click(screen.getByRole('button', { name: /upload/i }));

        await waitFor(() => {
            expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
        });
    });

    it('renders saved images gallery heading', () => {
        render(<DroneImagery />);
        fireEvent.click(screen.getByRole('tab', { name: /gallery/i }));
        expect(screen.getByText(/saved vegetation index images/i)).toBeInTheDocument();
    });

    it('renders time series placeholder when tab is selected', () => {
        render(<DroneImagery />);
        fireEvent.click(screen.getByRole('tab', { name: /time series/i }));
        expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
    });
});
