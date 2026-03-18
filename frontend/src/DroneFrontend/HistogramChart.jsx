import React, { useState } from "react";

const HistogramChart = ({ histogram, title = "Histogram" }) => {
    const counts = Array.isArray(histogram?.counts) ? histogram.counts : [];
    const binEdges = Array.isArray(histogram?.bin_edges) ? histogram.bin_edges : [];
    const [activeBinIndex, setActiveBinIndex] = useState(null);

    if (counts.length === 0 || binEdges.length !== counts.length + 1) {
        return null;
    }

    const maxCount = Math.max(...counts, 1);
    const totalCount = counts.reduce((sum, count) => sum + count, 0);
    let activeBin = null;
    if (activeBinIndex !== null) {
        const start = binEdges[activeBinIndex];
        const end = binEdges[activeBinIndex + 1];
        const count = counts[activeBinIndex];

        if (start !== undefined && end !== undefined && count !== undefined) {
            activeBin = {
                start,
                end,
                count,
                percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
            };
        }
    }

    return (
        <div className="histogram-chart" aria-label={title}>
            <div className="histogram-chart-header">{title}</div>
            <div className="histogram-bars" role="img" aria-label={`${title} distribution`}>
                {counts.map((count, index) => {
                    const start = binEdges[index];
                    const end = binEdges[index + 1];
                    const heightPercent = (count / maxCount) * 100;
                    const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
                    const binLabel = `${start.toFixed(2)} to ${end.toFixed(2)}`;

                    return (
                        <div className="histogram-bar-wrapper" key={`${start}-${end}-${index}`}>
                            <div
                                className="histogram-bar"
                                style={{ height: `${heightPercent}%` }}
                                title={`${binLabel}: ${percentage.toFixed(2)}%`}
                                role="button"
                                tabIndex={0}
                                aria-label={`${binLabel} has ${percentage.toFixed(2)} percent`}
                                onMouseEnter={() => setActiveBinIndex(index)}
                                onMouseLeave={() => setActiveBinIndex(null)}
                                onFocus={() => setActiveBinIndex(index)}
                                onBlur={() => setActiveBinIndex(null)}
                            />
                        </div>
                    );
                })}
            </div>
            <div className="histogram-hover-value" aria-live="polite">
                {activeBin ? (
                    <span>
                        Bin: {activeBin.start.toFixed(4)} to {activeBin.end.toFixed(4)} | Percentage: {activeBin.percentage.toFixed(2)}%
                    </span>
                ) : (
                    <span>Hover a bar to see precise values</span>
                )}
            </div>
            <div className="histogram-axis">
                <span>{binEdges[0].toFixed(2)}</span>
                <span>{binEdges[binEdges.length - 1].toFixed(2)}</span>
            </div>
        </div>
    );
};

export default HistogramChart;
