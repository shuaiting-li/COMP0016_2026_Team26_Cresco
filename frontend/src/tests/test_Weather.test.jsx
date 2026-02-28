/**
 * Tests for the Weather component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Weather from '../weather';
import { fetchWeather } from '../services/api';

vi.mock('../services/api', () => ({
    fetchWeather: vi.fn(),
}));

const MOCK_WEATHER_DATA = {
    current_weather: {
        name: 'Cambridge',
        main: { temp: 14, humidity: 72 },
        weather: [{ description: 'light rain' }],
        wind: { speed: 3.5 },
    },
    forecast: {
        list: [
            {
                dt: 1700000000,
                dt_txt: '2025-11-14 12:00:00',
                main: { temp: 13 },
                weather: [{ description: 'cloudy' }],
                wind: { speed: 4.0 },
            },
            {
                dt: 1700086400,
                dt_txt: '2025-11-15 12:00:00',
                main: { temp: 11 },
                weather: [{ description: 'sunny' }],
                wind: { speed: 2.1 },
                rain: { '3h': 0.5 },
            },
        ],
    },
};

describe('Weather', () => {
    /** Tests for the weather display component. */

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows loading state initially', () => {
        /** Verifies Loading... text while data is being fetched. */
        fetchWeather.mockReturnValue(new Promise(() => {})); // never resolves

        render(<Weather lat={52.2} lon={0.12} />);
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('renders weather data after fetch', async () => {
        /** Verifies weather information is displayed once data loads. */
        fetchWeather.mockResolvedValueOnce(MOCK_WEATHER_DATA);

        render(<Weather lat={52.2} lon={0.12} />);

        await waitFor(() => {
            expect(screen.getByText(/cambridge/i)).toBeInTheDocument();
        });

        expect(screen.getByText(/14°C/)).toBeInTheDocument();
        expect(screen.getByText(/Light Rain/i)).toBeInTheDocument();
        expect(screen.getByText(/72%/)).toBeInTheDocument();
        expect(screen.getByText(/3.5 m\/s/)).toBeInTheDocument();
    });

    it('renders forecast section', async () => {
        /** Verifies the 5-day forecast section is shown. */
        fetchWeather.mockResolvedValueOnce(MOCK_WEATHER_DATA);

        render(<Weather lat={52.2} lon={0.12} />);

        await waitFor(() => {
            expect(screen.getByText(/5-Day Forecast/i)).toBeInTheDocument();
        });
    });

    it('shows error message on fetch failure', async () => {
        /** Verifies error state is displayed when API fails. */
        fetchWeather.mockRejectedValueOnce(new Error('Network error'));

        render(<Weather lat={52.2} lon={0.12} />);

        await waitFor(() => {
            expect(screen.getByText(/error.*network error/i)).toBeInTheDocument();
        });
    });

    it('does not fetch when lat/lon are missing', () => {
        /** Verifies no API call is made without coordinates. */
        render(<Weather lat={null} lon={null} />);
        expect(fetchWeather).not.toHaveBeenCalled();
    });
});
