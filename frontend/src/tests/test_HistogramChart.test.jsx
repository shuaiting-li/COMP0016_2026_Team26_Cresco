import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import HistogramChart from "../DroneFrontend/HistogramChart";

describe("HistogramChart", () => {
    it("renders bars from histogram counts and edges", () => {
        const histogram = {
            counts: [2, 5, 3],
            bin_edges: [-1.0, -0.33, 0.33, 1.0],
        };

        const { container } = render(
            <HistogramChart histogram={histogram} title="NDVI Histogram" />
        );

        expect(screen.getByLabelText("NDVI Histogram")).toBeInTheDocument();
        expect(screen.getByLabelText("NDVI Histogram distribution")).toBeInTheDocument();
        expect(container.querySelectorAll(".histogram-bar")).toHaveLength(3);
        expect(screen.getByText("Hover a bar to see precise values")).toBeInTheDocument();
    });

    it("shows precise bin values while hovering a bar", () => {
        const histogram = {
            counts: [2, 5, 3],
            bin_edges: [-1.0, -0.33, 0.33, 1.0],
        };

        render(<HistogramChart histogram={histogram} title="NDVI Histogram" />);

        const firstBar = screen.getByLabelText("-1.00 to -0.33 has 20.00 percent");
        fireEvent.mouseEnter(firstBar);

        expect(screen.getByText("Bin: -1.0000 to -0.3300 | Percentage: 20.00%")).toBeInTheDocument();

        fireEvent.mouseLeave(firstBar);
        expect(screen.getByText("Hover a bar to see precise values")).toBeInTheDocument();
    });

    it("renders nothing for invalid histogram shape", () => {
        const { container } = render(
            <HistogramChart
                histogram={{ counts: [1, 2], bin_edges: [-1.0, 1.0] }}
                title="Invalid Histogram"
            />
        );

        expect(container.firstChild).toBeNull();
    });
});
