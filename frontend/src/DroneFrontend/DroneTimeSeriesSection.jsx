import React, { useMemo, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

const RECOMMENDED_THRESHOLD = 0.33;
const MIN_THRESHOLD = 0.1;
const MAX_THRESHOLD = 0.8;
const THRESHOLD_STEP = 0.01;
const MAX_POINTS_PER_CHART = 20;
const DEFAULT_CHART_MODE = "latest";

const clampThreshold = (value) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
        return RECOMMENDED_THRESHOLD;
    }
    return Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, numeric));
};

const getIndexType = (image) => (
    image.index_type || image.filename?.split("_")[0]?.toUpperCase() || "NDVI"
);

const hasHistogramData = (image) => {
    const counts = image?.histogram?.counts;
    const binEdges = image?.histogram?.bin_edges;
    return Array.isArray(counts) && Array.isArray(binEdges) && binEdges.length === counts.length + 1;
};

const timestampLabel = (timestamp) => {
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) {
        return "Unknown time";
    }
    return parsed.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const compactDateLabel = (timestamp) => {
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) {
        return "Unknown";
    }
    return parsed.toLocaleDateString([], {
        month: "short",
        day: "numeric",
    });
};

const formatDateRangeLabel = (startTimestamp, endTimestamp) => {
    const start = compactDateLabel(startTimestamp);
    const end = compactDateLabel(endTimestamp);
    return start === end ? start : `${start} - ${end}`;
};

const toSectionPercentages = (histogram, sectionThreshold) => {
    const counts = histogram?.counts || [];
    const edges = histogram?.bin_edges || [];

    let lowCount = 0;
    let mediumCount = 0;
    let highCount = 0;

    counts.forEach((count, index) => {
        const left = edges[index];
        const right = edges[index + 1];
        const midpoint = (left + right) / 2;

        if (midpoint < -sectionThreshold) {
            lowCount += count;
        } else if (midpoint <= sectionThreshold) {
            mediumCount += count;
        } else {
            highCount += count;
        }
    });

    const total = lowCount + mediumCount + highCount;
    if (total <= 0) {
        return { lowPct: 0, mediumPct: 0, highPct: 0 };
    }

    return {
        lowPct: Number(((lowCount / total) * 100).toFixed(2)),
        mediumPct: Number(((mediumCount / total) * 100).toFixed(2)),
        highPct: Number(((highCount / total) * 100).toFixed(2)),
    };
};

const toOverallIntervals = (points) => {
    if (points.length <= MAX_POINTS_PER_CHART) {
        return points.map((point, index) => ({
            ...point,
            sequence: `${formatDateRangeLabel(point.rawTimestamp, point.rawTimestamp)} (${index + 1})`,
        }));
    }

    const intervals = [];
    for (let i = 0; i < MAX_POINTS_PER_CHART; i += 1) {
        const start = Math.floor((i * points.length) / MAX_POINTS_PER_CHART);
        const end = Math.floor(((i + 1) * points.length) / MAX_POINTS_PER_CHART);
        const segment = points.slice(start, end);
        if (!segment.length) {
            continue;
        }

        const average = (key) => (
            Number((segment.reduce((sum, item) => sum + item[key], 0) / segment.length).toFixed(2))
        );

        const first = segment[0];
        const last = segment[segment.length - 1];

        intervals.push({
            id: `${first.id}-${last.id}`,
            indexType: first.indexType,
            sequence: `${formatDateRangeLabel(first.rawTimestamp, last.rawTimestamp)} (${i + 1})`,
            label: `${first.label} -> ${last.label}`,
            lowPct: average("lowPct"),
            mediumPct: average("mediumPct"),
            highPct: average("highPct"),
        });
    }

    return intervals;
};

const buildSeriesData = (savedImages, indexType, sectionThreshold, chartMode) => {
    const filtered = savedImages
        .filter((image) => getIndexType(image) === indexType && hasHistogramData(image))
        .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());

    const basePoints = filtered.map((image, index) => {
        const percentages = toSectionPercentages(image.histogram, sectionThreshold);
        return {
            id: image.id,
            indexType,
            sequence: `${indexType} ${index + 1}`,
            label: timestampLabel(image.timestamp),
            rawTimestamp: image.timestamp,
            lowPct: percentages.lowPct,
            mediumPct: percentages.mediumPct,
            highPct: percentages.highPct,
        };
    });

    const data = chartMode === "overall"
        ? toOverallIntervals(basePoints)
        : basePoints.slice(-MAX_POINTS_PER_CHART).map((point, index) => ({
            ...point,
            sequence: `${compactDateLabel(point.rawTimestamp)} (${index + 1})`,
        }));

    return {
        totalCount: filtered.length,
        data,
    };
};

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) {
        return null;
    }

    return (
        <div className="time-series-tooltip">
            <div className="time-series-tooltip-title">{label}</div>
            {payload.map((entry) => (
                <div key={entry.dataKey} className="time-series-tooltip-row">
                    <span>{entry.name}:</span>
                    <strong>{Number(entry.value).toFixed(2)}%</strong>
                </div>
            ))}
        </div>
    );
};

const StackedSectionChart = ({ title, chart, sectionThreshold, visibleStacks, chartMode }) => {
    const thresholdText = sectionThreshold.toFixed(2);
    const { data, totalCount } = chart;
    const visibleStackCount = Object.values(visibleStacks).filter(Boolean).length;

    if (!data.length) {
        return (
            <div className="time-series-card">
                <h3 className="time-series-card-title">{title}</h3>
                <div className="time-series-empty">No saved histogram data for this index yet.</div>
            </div>
        );
    }

    return (
        <div className="time-series-card">
            <h3 className="time-series-card-title">{title}</h3>
            <div className="time-series-card-meta">
                Showing {data.length} of {totalCount} points
                {totalCount > MAX_POINTS_PER_CHART && chartMode === "latest" ? " (latest 20)" : ""}
                {totalCount > MAX_POINTS_PER_CHART && chartMode === "overall" ? " (overall averaged intervals)" : ""}
            </div>
            {visibleStackCount === 0 && (
                <div className="time-series-empty">Enable at least one stack to render bars.</div>
            )}
            <div className="time-series-chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(203, 213, 225, 0.2)" />
                        <XAxis dataKey="sequence" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                        <YAxis
                            domain={[0, 100]}
                            tickFormatter={(value) => `${value}%`}
                            tick={{ fill: "#cbd5e1", fontSize: 11 }}
                        />
                        <Tooltip content={<CustomTooltip />} labelFormatter={(_, payload) => payload?.[0]?.payload?.label || "Timestamp"} />
                        <Legend wrapperStyle={{ color: "#e2e8f0", fontSize: 12 }} />
                        {visibleStacks.low && (
                            <Bar dataKey="lowPct" stackId="a" name={`Low (-1 to -${thresholdText})`} fill="#ef4444" />
                        )}
                        {visibleStacks.medium && (
                            <Bar dataKey="mediumPct" stackId="a" name={`Medium (-${thresholdText} to ${thresholdText})`} fill="#f59e0b" />
                        )}
                        {visibleStacks.high && (
                            <Bar dataKey="highPct" stackId="a" name={`High (${thresholdText} to 1)`} fill="#22c55e" />
                        )}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const DroneTimeSeriesSection = ({ savedImages = [] }) => {
    const [sectionThreshold, setSectionThreshold] = useState(RECOMMENDED_THRESHOLD);
    const [chartMode, setChartMode] = useState(DEFAULT_CHART_MODE);
    const [visibleStacks, setVisibleStacks] = useState({
        low: true,
        medium: true,
        high: true,
    });

    const toggleStackVisibility = (key) => {
        setVisibleStacks((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const ndviChart = useMemo(
        () => buildSeriesData(savedImages, "NDVI", sectionThreshold, chartMode),
        [savedImages, sectionThreshold, chartMode]
    );
    const saviChart = useMemo(
        () => buildSeriesData(savedImages, "SAVI", sectionThreshold, chartMode),
        [savedImages, sectionThreshold, chartMode]
    );
    const eviChart = useMemo(
        () => buildSeriesData(savedImages, "EVI", sectionThreshold, chartMode),
        [savedImages, sectionThreshold, chartMode]
    );

    const hasAnyData = ndviChart.data.length > 0 || saviChart.data.length > 0 || eviChart.data.length > 0;

    return (
        <section className="time-series-section">
            <h2 className="drone-imagery-title">Time Series</h2>
            <p className="time-series-description">
                Stacked histogram percentages split into low, medium, and high value sections for each
                saved image.
            </p>
            <div className="time-series-threshold-controls">
                <label htmlFor="time-series-threshold" className="time-series-threshold-label">
                    Section threshold (+/-):
                </label>
                <input
                    id="time-series-threshold"
                    type="range"
                    min={MIN_THRESHOLD}
                    max={MAX_THRESHOLD}
                    step={THRESHOLD_STEP}
                    value={sectionThreshold}
                    onChange={(event) => setSectionThreshold(clampThreshold(event.target.value))}
                    className="time-series-threshold-slider"
                />
                <input
                    type="number"
                    min={MIN_THRESHOLD}
                    max={MAX_THRESHOLD}
                    step={THRESHOLD_STEP}
                    value={sectionThreshold}
                    onChange={(event) => setSectionThreshold(clampThreshold(event.target.value))}
                    className="time-series-threshold-number"
                    aria-label="Time series threshold value"
                />
                <button
                    type="button"
                    className="time-series-threshold-reset"
                    onClick={() => setSectionThreshold(RECOMMENDED_THRESHOLD)}
                >
                    Use Recommended
                </button>
                <div className="time-series-threshold-help">
                    Recommended: {RECOMMENDED_THRESHOLD.toFixed(2)}
                </div>
            </div>
            <div className="time-series-mode-controls">
                <label htmlFor="time-series-chart-mode" className="time-series-threshold-label">
                    Data configuration:
                </label>
                <select
                    id="time-series-chart-mode"
                    value={chartMode}
                    onChange={(event) => setChartMode(event.target.value)}
                    className="time-series-mode-select"
                    aria-label="Time series data configuration"
                >
                    <option value="latest">Latest</option>
                    <option value="overall">Overall</option>
                </select>
            </div>
            <div className="time-series-stack-controls" aria-label="Visible stacks">
                <span className="time-series-stack-controls-label">Visible stacks:</span>
                <button
                    type="button"
                    className={`time-series-stack-toggle ${visibleStacks.low ? "active" : ""}`}
                    onClick={() => toggleStackVisibility("low")}
                    aria-pressed={visibleStacks.low}
                >
                    {visibleStacks.low ? "Hide" : "Show"} Low
                </button>
                <button
                    type="button"
                    className={`time-series-stack-toggle ${visibleStacks.medium ? "active" : ""}`}
                    onClick={() => toggleStackVisibility("medium")}
                    aria-pressed={visibleStacks.medium}
                >
                    {visibleStacks.medium ? "Hide" : "Show"} Medium
                </button>
                <button
                    type="button"
                    className={`time-series-stack-toggle ${visibleStacks.high ? "active" : ""}`}
                    onClick={() => toggleStackVisibility("high")}
                    aria-pressed={visibleStacks.high}
                >
                    {visibleStacks.high ? "Hide" : "Show"} High
                </button>
            </div>
            {!hasAnyData && (
                <div className="time-series-empty-overall">
                    Upload indexed images to see NDVI, SAVI, and EVI distribution trends.
                </div>
            )}
            <div className="time-series-grid">
                <StackedSectionChart
                    title="NDVI Distribution Over Time"
                    chart={ndviChart}
                    sectionThreshold={sectionThreshold}
                    visibleStacks={visibleStacks}
                    chartMode={chartMode}
                />
                <StackedSectionChart
                    title="SAVI Distribution Over Time"
                    chart={saviChart}
                    sectionThreshold={sectionThreshold}
                    visibleStacks={visibleStacks}
                    chartMode={chartMode}
                />
                <StackedSectionChart
                    title="EVI Distribution Over Time"
                    chart={eviChart}
                    sectionThreshold={sectionThreshold}
                    visibleStacks={visibleStacks}
                    chartMode={chartMode}
                />
            </div>
        </section>
    );
};

export default DroneTimeSeriesSection;
