/**
 * Tests for ChartRenderer component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChartRenderer from '../ChartRenderer';

// Recharts uses SVG — stub ResizeObserver which ResponsiveContainer needs
class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver || ResizeObserverStub;

const barData = [
    { name: 'Wheat', value: 50 },
    { name: 'Barley', value: 30 },
];

describe('ChartRenderer', () => {
    it('renders bar chart without crashing', () => {
        const { container } = render(
            <ChartRenderer chartData={barData} chartType="bar" xKey="name" yKey="value" />,
        );
        // ResponsiveContainer renders a div wrapper
        expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('renders bar chart with multiple yKeys', () => {
        const data = [{ name: 'A', x: 10, y: 20 }];
        const { container } = render(
            <ChartRenderer chartData={data} chartType="bar" xKey="name" yKey={['x', 'y']} />,
        );
        expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('renders bar-stacked chart', () => {
        const data = [{ name: 'A', x: 10, y: 20 }];
        const { container } = render(
            <ChartRenderer chartData={data} chartType="bar-stacked" xKey="name" yKey={['x', 'y']} />,
        );
        expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('renders line chart', () => {
        const data = [{ day: 'Mon', temp: 15 }, { day: 'Tue', temp: 18 }];
        const { container } = render(
            <ChartRenderer chartData={data} chartType="line" xKey="day" yKey="temp" />,
        );
        expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('renders line chart with multiple yKeys', () => {
        const data = [{ day: 'Mon', temp: 15, wind: 5 }];
        const { container } = render(
            <ChartRenderer chartData={data} chartType="line" xKey="day" yKey={['temp', 'wind']} />,
        );
        expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('renders pie chart', () => {
        const data = [{ name: 'Wheat', value: 60 }, { name: 'Barley', value: 40 }];
        const { container } = render(
            <ChartRenderer chartData={data} chartType="pie" xKey="name" yKey="value" />,
        );
        expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

    it('renders fallback for unsupported chart type', () => {
        render(
            <ChartRenderer chartData={barData} chartType="unknown" xKey="name" yKey="value" />,
        );
        expect(screen.getByText('Unsupported chart type')).toBeInTheDocument();
    });

    it('renders with default props when xKey and yKey omitted', () => {
        const { container } = render(
            <ChartRenderer chartData={barData} chartType="bar" />,
        );
        expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });
});
