import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DroneTimeSeriesSection from '../DroneFrontend/DroneTimeSeriesSection';

const sampleHistogram = {
    counts: [10, 20, 30, 40],
    bin_edges: [-1, -0.5, 0, 0.5, 1],
};

describe('DroneTimeSeriesSection', () => {
    it('renders three index chart sections', () => {
        render(<DroneTimeSeriesSection savedImages={[]} />);

        expect(screen.getByText(/ndvi distribution over time/i)).toBeInTheDocument();
        expect(screen.getByText(/savi distribution over time/i)).toBeInTheDocument();
        expect(screen.getByText(/evi distribution over time/i)).toBeInTheDocument();
        expect(screen.getByText(/recommended: 0.33/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/time series data configuration/i)).toHaveValue('latest');
        expect(screen.getByText(/upload indexed images to see ndvi, savi, and evi distribution trends/i)).toBeInTheDocument();
    });

    it('renders stacked charts when histogram data exists for each index', () => {
        const savedImages = [
            {
                id: 1,
                filename: 'ndvi_image_1.png',
                index_type: 'NDVI',
                timestamp: '2026-03-01T10:00:00Z',
                histogram: sampleHistogram,
            },
            {
                id: 2,
                filename: 'savi_image_1.png',
                index_type: 'SAVI',
                timestamp: '2026-03-02T10:00:00Z',
                histogram: sampleHistogram,
            },
            {
                id: 3,
                filename: 'evi_image_1.png',
                index_type: 'EVI',
                timestamp: '2026-03-03T10:00:00Z',
                histogram: sampleHistogram,
            },
        ];

        const { container } = render(<DroneTimeSeriesSection savedImages={savedImages} />);

        expect(container.querySelectorAll('.recharts-responsive-container')).toHaveLength(3);
        expect(screen.getAllByText(/showing 1 of 1 points/i)).toHaveLength(3);
    });

    it('allows changing threshold and resetting to recommended value', () => {
        render(<DroneTimeSeriesSection savedImages={[]} />);

        const thresholdInput = screen.getByLabelText(/time series threshold value/i);
        fireEvent.change(thresholdInput, { target: { value: '0.4' } });
        expect(thresholdInput).toHaveValue(0.4);

        fireEvent.click(screen.getByRole('button', { name: /use recommended/i }));
        expect(thresholdInput).toHaveValue(0.33);
    });

    it('allows toggling low medium and high stack visibility', () => {
        const savedImages = [
            {
                id: 1,
                filename: 'ndvi_image_1.png',
                index_type: 'NDVI',
                timestamp: '2026-03-01T10:00:00Z',
                histogram: sampleHistogram,
            },
            {
                id: 2,
                filename: 'savi_image_1.png',
                index_type: 'SAVI',
                timestamp: '2026-03-02T10:00:00Z',
                histogram: sampleHistogram,
            },
            {
                id: 3,
                filename: 'evi_image_1.png',
                index_type: 'EVI',
                timestamp: '2026-03-03T10:00:00Z',
                histogram: sampleHistogram,
            },
        ];

        render(<DroneTimeSeriesSection savedImages={savedImages} />);

        const lowToggle = screen.getByRole('button', { name: /hide low/i });
        const mediumToggle = screen.getByRole('button', { name: /hide medium/i });
        const highToggle = screen.getByRole('button', { name: /hide high/i });

        fireEvent.click(lowToggle);
        fireEvent.click(mediumToggle);
        fireEvent.click(highToggle);

        expect(screen.getByRole('button', { name: /show low/i })).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByRole('button', { name: /show medium/i })).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getByRole('button', { name: /show high/i })).toHaveAttribute('aria-pressed', 'false');
        expect(screen.getAllByText(/enable at least one stack to render bars/i)).toHaveLength(3);
    });

    it('limits each chart to latest 20 points', () => {
        const savedImages = Array.from({ length: 25 }, (_, idx) => ({
            id: idx + 1,
            filename: `ndvi_image_${idx + 1}.png`,
            index_type: 'NDVI',
            timestamp: new Date(Date.UTC(2026, 2, 1, idx, 0, 0)).toISOString(),
            histogram: sampleHistogram,
        }));

        render(<DroneTimeSeriesSection savedImages={savedImages} />);

        expect(screen.getByText(/showing 20 of 25 points \(latest 20\)/i)).toBeInTheDocument();
    });

    it('supports overall mode with interval averaging capped to 20 points', () => {
        const savedImages = Array.from({ length: 25 }, (_, idx) => ({
            id: idx + 1,
            filename: `ndvi_image_${idx + 1}.png`,
            index_type: 'NDVI',
            timestamp: new Date(Date.UTC(2026, 2, 1, idx, 0, 0)).toISOString(),
            histogram: sampleHistogram,
        }));

        render(<DroneTimeSeriesSection savedImages={savedImages} />);

        fireEvent.change(screen.getByLabelText(/time series data configuration/i), {
            target: { value: 'overall' },
        });

        expect(screen.getByText(/showing 20 of 25 points \(overall averaged intervals\)/i)).toBeInTheDocument();
    });
});
