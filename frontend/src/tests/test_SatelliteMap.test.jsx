/**
 * Tests for the SatelliteMap component.
 *
 * Leaflet/react-leaflet is mocked to avoid JSDOM canvas limitations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/* --- Heavy Leaflet / react-leaflet mocks --- */
vi.mock('react-leaflet', () => ({
    MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
    TileLayer: () => <div data-testid="tile-layer" />,
    Polygon: () => <div data-testid="polygon" />,
    Marker: () => <div data-testid="marker" />,
    useMap: () => ({
        flyTo: vi.fn(),
        setView: vi.fn(),
    }),
}));

vi.mock('leaflet', () => {
    const divIcon = vi.fn(() => ({}));
    return {
        default: {
            divIcon,
            DomEvent: { stopPropagation: vi.fn() },
            Icon: { Default: { prototype: { _getIconUrl: '' }, mergeOptions: vi.fn() } },
        },
        divIcon,
        DomEvent: { stopPropagation: vi.fn() },
        Icon: { Default: { prototype: { _getIconUrl: '' }, mergeOptions: vi.fn() } },
    };
});

vi.mock('leaflet/dist/images/marker-icon-2x.png', () => ({ default: '' }));
vi.mock('leaflet/dist/images/marker-icon.png', () => ({ default: '' }));
vi.mock('leaflet/dist/images/marker-shadow.png', () => ({ default: '' }));

vi.mock('../services/api', () => ({
    saveFarmData: vi.fn(),
    geocodeSearch: vi.fn(),
    geocodeReverse: vi.fn(),
}));

vi.mock('@turf/area', () => ({ default: vi.fn(() => 50000) }));
vi.mock('@turf/helpers', () => ({ polygon: vi.fn((coords) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: coords } })) }));

import SatelliteMap from '../satellite';

describe('SatelliteMap', () => {
    /** Tests for the satellite/farm map component. */

    let setFarmLocation;

    beforeEach(() => {
        setFarmLocation = vi.fn();
    });

    it('renders the map container', () => {
        /** Verifies the map placeholder is present. */
        render(<SatelliteMap farmLocation={null} setFarmLocation={setFarmLocation} />);
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });

    it('renders control buttons', () => {
        /** Verifies control buttons are displayed. */
        render(<SatelliteMap farmLocation={null} setFarmLocation={setFarmLocation} />);
        expect(screen.getByText(/use my location/i)).toBeInTheDocument();
        expect(screen.getByText('Search')).toBeInTheDocument();
        expect(screen.getByText('Select as Farm')).toBeInTheDocument();
    });

    it('renders search input', () => {
        /** Verifies the search input is displayed. */
        render(<SatelliteMap farmLocation={null} setFarmLocation={setFarmLocation} />);
        expect(screen.getByPlaceholderText(/city.*address.*postcode/i)).toBeInTheDocument();
    });

    it('renders calculated area section', () => {
        /** Verifies the area calculation section is shown. */
        render(<SatelliteMap farmLocation={null} setFarmLocation={setFarmLocation} />);
        expect(screen.getByText(/calculated area/i)).toBeInTheDocument();
    });

    it('performs geocode search on button click', async () => {
        /** Verifies search calls geocodeSearch and updates the map. */
        const { geocodeSearch } = await import('../services/api');
        geocodeSearch.mockResolvedValueOnce([{ lat: '51.5', lon: '-0.1' }]);

        render(<SatelliteMap farmLocation={null} setFarmLocation={setFarmLocation} />);
        const user = userEvent.setup();

        const input = screen.getByPlaceholderText(/city.*address.*postcode/i);
        await user.type(input, 'London');
        await user.click(screen.getByText('Search'));

        await waitFor(() => {
            expect(geocodeSearch).toHaveBeenCalledWith('London');
        });
    });

    it('performs geocode search on Enter key', async () => {
        /** Verifies Enter key triggers search. */
        const { geocodeSearch } = await import('../services/api');
        geocodeSearch.mockResolvedValueOnce([{ lat: '52.2', lon: '0.12' }]);

        render(<SatelliteMap farmLocation={null} setFarmLocation={setFarmLocation} />);
        const user = userEvent.setup();

        const input = screen.getByPlaceholderText(/city.*address.*postcode/i);
        await user.type(input, 'Cambridge{Enter}');

        await waitFor(() => {
            expect(geocodeSearch).toHaveBeenCalledWith('Cambridge');
        });
    });

    it('calls saveFarmData on Select as Farm click', async () => {
        /** Verifies farm selection triggers save call. */
        const { saveFarmData, geocodeReverse } = await import('../services/api');
        geocodeReverse.mockResolvedValueOnce({ display_name: 'Test Location' });
        saveFarmData.mockResolvedValueOnce({ message: 'saved' });

        // Suppress alert
        vi.spyOn(window, 'alert').mockImplementation(() => {});

        render(<SatelliteMap farmLocation={null} setFarmLocation={setFarmLocation} />);
        const user = userEvent.setup();

        await user.click(screen.getByText('Select as Farm'));

        await waitFor(() => {
            expect(saveFarmData).toHaveBeenCalled();
        });
        expect(setFarmLocation).toHaveBeenCalled();
    });

    it('displays farm location when provided', () => {
        /** Verifies farm coordinates are shown when set. */
        render(
            <SatelliteMap
                farmLocation={{ lat: 51.5236, lng: -0.136 }}
                setFarmLocation={setFarmLocation}
            />,
        );

        expect(screen.getByText(/farm location/i)).toBeInTheDocument();
        expect(screen.getByText(/51\.523600/)).toBeInTheDocument();
    });

    it('does not display farm location when null', () => {
        /** Verifies no coordinates shown with no farm location. */
        render(<SatelliteMap farmLocation={null} setFarmLocation={setFarmLocation} />);
        expect(screen.queryByText(/farm location/i)).not.toBeInTheDocument();
    });
});
