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
    let handleOpenDroneImagery;
    let handleOpenSatelliteImagery;
    let toggleWebSearch;
    let onCollapse;

    beforeEach(() => {
        handleOpenSatellite = vi.fn();
        handleOpenWeather = vi.fn();
        handleOpenDroneImagery = vi.fn();
        handleOpenSatelliteImagery = vi.fn();
        toggleWebSearch = vi.fn();
        onCollapse = vi.fn();
    });

    it('renders the Toolbox heading', () => {
        /** Verifies the sidebar title is displayed. */
        render(
            <SidebarRight
                handleOpenSatellite={handleOpenSatellite}
                handleOpenWeather={handleOpenWeather}
                handleOpenDroneImagery={handleOpenDroneImagery}
                handleOpenSatelliteImagery={handleOpenSatelliteImagery}
                internetSearchEnabled={true}
                toggleWebSearch={toggleWebSearch}
                onCollapse={onCollapse}
            />,
        );
        expect(screen.getByText('Toolbox')).toBeInTheDocument();
    });

    it('renders a button for each studio item', async () => {
        /** Verifies the sidebar renders one button per STUDIO_ITEMS entry. */
        const { STUDIO_ITEMS } = await import('../tools/toolMenu');
        render(
            <SidebarRight
                handleOpenSatellite={handleOpenSatellite}
                handleOpenWeather={handleOpenWeather}
                handleOpenDroneImagery={handleOpenDroneImagery}
                handleOpenSatelliteImagery={handleOpenSatelliteImagery}
                internetSearchEnabled={true}
                toggleWebSearch={toggleWebSearch}
                onCollapse={onCollapse}
            />,
        );

        const buttons = screen.getAllByTestId('studio-item');
        expect(buttons.length).toBe(STUDIO_ITEMS.length);
    });

    it('calls handleOpenSatellite when Add Farm is clicked', async () => {
        /** Verifies the satellite modal opens on Add Farm click. */
        render(
            <SidebarRight
                handleOpenSatellite={handleOpenSatellite}
                handleOpenWeather={handleOpenWeather}
                handleOpenDroneImagery={handleOpenDroneImagery}
                handleOpenSatelliteImagery={handleOpenSatelliteImagery}
                internetSearchEnabled={true}
                toggleWebSearch={toggleWebSearch}
                onCollapse={onCollapse}
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
                handleOpenDroneImagery={handleOpenDroneImagery}
                handleOpenSatelliteImagery={handleOpenSatelliteImagery}
                internetSearchEnabled={true}
                toggleWebSearch={toggleWebSearch}
                onCollapse={onCollapse}
            />,
        );
        const user = userEvent.setup();

        await user.click(screen.getByText('Weather Data'));
        expect(handleOpenWeather).toHaveBeenCalledTimes(1);
    });

    it('shows Disable Web Search when internet search is enabled', () => {
        /** Verifies the Web Search card displays the enabled label. */
        render(
            <SidebarRight
                handleOpenSatellite={handleOpenSatellite}
                handleOpenWeather={handleOpenWeather}
                handleOpenDroneImagery={handleOpenDroneImagery}
                handleOpenSatelliteImagery={handleOpenSatelliteImagery}
                internetSearchEnabled={true}
                toggleWebSearch={toggleWebSearch}
                onCollapse={onCollapse}
            />,
        );
        expect(screen.getByText('Disable Web Search')).toBeInTheDocument();
    });

    it('shows Enable Web Search when internet search is disabled', () => {
        /** Verifies the Web Search card displays the disabled label. */
        render(
            <SidebarRight
                handleOpenSatellite={handleOpenSatellite}
                handleOpenWeather={handleOpenWeather}
                handleOpenDroneImagery={handleOpenDroneImagery}
                handleOpenSatelliteImagery={handleOpenSatelliteImagery}
                internetSearchEnabled={false}
                toggleWebSearch={toggleWebSearch}
                onCollapse={onCollapse}
            />,
        );
        expect(screen.getByText('Enable Web Search')).toBeInTheDocument();
    });

    it('calls toggleWebSearch when Web Search card is clicked', async () => {
        /** Verifies the toggle callback fires when the Web Search card is clicked. */
        render(
            <SidebarRight
                handleOpenSatellite={handleOpenSatellite}
                handleOpenWeather={handleOpenWeather}
                handleOpenDroneImagery={handleOpenDroneImagery}
                handleOpenSatelliteImagery={handleOpenSatelliteImagery}
                internetSearchEnabled={true}
                toggleWebSearch={toggleWebSearch}
                onCollapse={onCollapse}
            />,
        );
        const user = userEvent.setup();

        await user.click(screen.getByText('Disable Web Search'));
        expect(toggleWebSearch).toHaveBeenCalledTimes(1);
    });
});
