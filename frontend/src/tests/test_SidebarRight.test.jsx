/**
 * Tests for the SidebarRight component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SidebarRight from '../layout/SidebarRight';

/* Mock the Weather component to avoid real API calls */
vi.mock('../weather', () => ({
    default: () => <div data-testid="mock-weather">Weather Widget</div>,
}));

describe('SidebarRight', () => {
    /** Tests for the right sidebar (toolbox panel). */

    let handleOpenSatellite;
    let handleOpenWeather;

    beforeEach(() => {
        handleOpenSatellite = vi.fn();
        handleOpenWeather = vi.fn();
    });

    it('renders the Toolbox heading', () => {
        /** Verifies the sidebar title is displayed. */
        render(
            <SidebarRight
                handleOpenSatellite={handleOpenSatellite}
                handleOpenWeather={handleOpenWeather}
            />,
        );
        expect(screen.getByText('Toolbox')).toBeInTheDocument();
    });

    it('renders a button for each studio item', () => {
        /** Verifies the sidebar renders one button per STUDIO_ITEMS entry. */
        const { STUDIO_ITEMS } = require('../tools/toolMenu');
        render(
            <SidebarRight
                handleOpenSatellite={handleOpenSatellite}
                handleOpenWeather={handleOpenWeather}
            />,
        );

        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBe(STUDIO_ITEMS.length);
    });

    it('calls handleOpenSatellite when Add Farm is clicked', async () => {
        /** Verifies the satellite modal opens on Add Farm click. */
        render(
            <SidebarRight
                handleOpenSatellite={handleOpenSatellite}
                handleOpenWeather={handleOpenWeather}
            />,
        );
        const user = userEvent.setup();

        await user.click(screen.getByText('Add Farm'));
        expect(handleOpenSatellite).toHaveBeenCalledTimes(1);
    });

    it('calls handleOpenWeather when Weather Data is clicked', async () => {
        /** Verifies the weather modal opens on Weather Data click. */
        render(
            <SidebarRight
                handleOpenSatellite={handleOpenSatellite}
                handleOpenWeather={handleOpenWeather}
            />,
        );
        const user = userEvent.setup();

        await user.click(screen.getByText('Weather Data'));
        expect(handleOpenWeather).toHaveBeenCalledTimes(1);
    });
});
