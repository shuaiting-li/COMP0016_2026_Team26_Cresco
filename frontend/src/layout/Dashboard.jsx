import { useEffect, useState } from 'react';
import {
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    CloudSun,
    Leaf,
    Loader,
    MapPin,
    Minus,
    Trash2,
} from 'lucide-react';
import { ClipboardList } from 'lucide-react';
import { fetchDroneImages, fetchWeather } from '../services/api';
import ChartRenderer from '../ChartRenderer';
import styles from './Dashboard.module.css';

const FIELD_HEALTH_THRESHOLD = 0.33;
const FIELD_HEALTH_MAX_BARS = 20;

const statCards = [
//     {
//         label: 'labl',
//         value: 'x%',
//         change: '+-x%',
//         trend: 'up / down / neutral',
//         icon: <#icon# size={18} />,
//     },
];

const alerts = [
    // { id: 1, severity: 'warning / info', message: 'mesage' },
];

const WEATHER_ICONS = {
    'clear sky': '☀️', 'few clouds': '🌤️', 'scattered clouds': '⛅',
    'broken clouds': '☁️', 'overcast clouds': '☁️', 'shower rain': '🌧️',
    rain: '🌦️', 'light rain': '🌦️', 'moderate rain': '🌧️', 'heavy intensity rain': '🌧️',
    thunderstorm: '⛈️', snow: '❄️', mist: '🌫️', fog: '🌫️',
};

function weatherIcon(description) {
    const key = description?.toLowerCase();
    return WEATHER_ICONS[key] ?? '🌡️';
}

function ForecastPanel({ farmLocation }) {
    const [days, setDays] = useState([]);
    const [status, setStatus] = useState('idle'); // idle | loading | error

    useEffect(() => {
        if (!farmLocation?.lat || !farmLocation?.lng) {
            return;
        }
        let cancelled = false;
        async function loadForecast() {
            setStatus('loading');
            try {
                const data = await fetchWeather(farmLocation.lat, farmLocation.lng);
                if (cancelled) return;
                const grouped = data.forecast.list.reduce((acc, entry) => {
                    const date = entry.dt_txt.split(' ')[0];
                    const hour = entry.dt_txt.split(' ')[1];
                    if (!acc[date] || hour === '12:00:00') acc[date] = entry;
                    return acc;
                }, {});
                setDays(Object.values(grouped).slice(0, 5));
                setStatus('ok');
            } catch {
                if (!cancelled) setStatus('error');
            }
        }
        loadForecast();
        return () => {
            cancelled = true;
        };
    }, [farmLocation]);

    if (status === 'idle') {
        return (
            <div className={styles.chartPlaceholder}>
                <MapPin size={36} className={styles.placeholderIcon} />
                <span className={styles.placeholderText}>Set a farm location to see the forecast</span>
            </div>
        );
    }

    if (status === 'loading') {
        return (
            <div className={styles.chartPlaceholder}>
                <Loader size={28} className={`${styles.placeholderIcon} ${styles.spin}`} />
                <span className={styles.placeholderText}>Loading forecast...</span>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className={styles.chartPlaceholder}>
                <CloudSun size={36} className={styles.placeholderIcon} />
                <span className={styles.placeholderText}>Failed to load forecast</span>
            </div>
        );
    }

    return (
        <div className={styles.forecastPanel}>
            <div className={styles.forecastGrid}>
                {days.map((entry, i) => {
                    const date = new Date(entry.dt * 1000);
                    const label = i === 0
                        ? 'Today'
                        : date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
                    const desc = entry.weather[0].description;
                    return (
                        <div key={i} className={styles.forecastDay}>
                            <span className={styles.forecastDayLabel}>{label}</span>
                            <span className={styles.forecastEmoji}>{weatherIcon(desc)}</span>
                            <span className={styles.forecastTemp}>{Math.round(entry.main.temp)}°C</span>
                            <span className={styles.forecastDesc}>{desc.replace(/\b\w/g, c => c.toUpperCase())}</span>
                            <span className={styles.forecastWind}>{entry.wind.speed} m/s</span>
                        </div>
                    );
                })}
            </div>
            <div className={styles.forecastChart}>
                <ChartRenderer
                    chartType="line"
                    height={180}
                    chartData={days.map((entry, i) => ({
                        day: i === 0
                            ? 'Today'
                            : new Date(entry.dt * 1000).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }),
                        'Temp (°C)': Math.round(entry.main.temp),
                        'Wind (m/s)': entry.wind.speed,
                    }))}
                    xKey="day"
                    yKey={['Temp (°C)', 'Wind (m/s)']}
                />
            </div>
        </div>
    );
}

function StatCard({ label, value, change, trend, icon }) {
    const isUp = trend === 'up';
    const isNeutral = trend === 'neutral';
    return (
        <div className={styles.statCard}>
            <div className={styles.statTop}>
                <span className={styles.statIcon}>{icon}</span>
                <span className={`${styles.statChange} ${isNeutral ? styles.changeNeutral : isUp ? styles.changeUp : styles.changeDown}`}>
                    {isNeutral ? <Minus size={13} /> : isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {change}
                </span>
            </div>
            <div className={styles.statValue}>{value}</div>
            <div className={styles.statLabel}>{label}</div>
        </div>
    );
}

function toSectionPercentages(histogram, sectionThreshold) {
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
        return { low: 0, medium: 0, high: 0 };
    }

    return {
        low: Number(((lowCount / total) * 100).toFixed(2)),
        medium: Number(((mediumCount / total) * 100).toFixed(2)),
        high: Number(((highCount / total) * 100).toFixed(2)),
    };
}

function compactDateLabel(timestamp) {
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) {
        return 'Unknown';
    }
    return parsed.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
    });
}

function toOverallIntervals(points) {
    if (points.length <= FIELD_HEALTH_MAX_BARS) {
        return points.map((point, index) => ({
            range: `${compactDateLabel(point.timestamp)} (${index + 1})`,
            low: point.low,
            medium: point.medium,
            high: point.high,
        }));
    }

    const intervals = [];
    for (let i = 0; i < FIELD_HEALTH_MAX_BARS; i += 1) {
        const start = Math.floor((i * points.length) / FIELD_HEALTH_MAX_BARS);
        const end = Math.floor(((i + 1) * points.length) / FIELD_HEALTH_MAX_BARS);
        const segment = points.slice(start, end);
        if (!segment.length) {
            continue;
        }

        const average = (key) => Number((segment.reduce((sum, item) => sum + item[key], 0) / segment.length).toFixed(2));
        const first = segment[0];
        const last = segment[segment.length - 1];
        const startLabel = compactDateLabel(first.timestamp);
        const endLabel = compactDateLabel(last.timestamp);

        intervals.push({
            range: `${startLabel}${startLabel === endLabel ? '' : ` - ${endLabel}`} (${i + 1})`,
            low: average('low'),
            medium: average('medium'),
            high: average('high'),
        });
    }

    return intervals;
}

export default function Dashboard({ farmLocation, messages = [], onDeleteTask = null }) {
    const [ndviChartData, setNdviChartData] = useState([]);
    const [isFieldHealthLoading, setIsFieldHealthLoading] = useState(false);
    const [dismissedTaskKeys, setDismissedTaskKeys] = useState([]);

    useEffect(() => {
        let cancelled = false;

        async function fetchNdviOverallChart() {
            setIsFieldHealthLoading(true);
            try {
                const images = await fetchDroneImages();
                if (cancelled) return;

                const ndviImages = images
                    .filter((image) => image?.index_type === 'NDVI' && image?.histogram)
                    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                if (ndviImages.length === 0) {
                    setNdviChartData([]);
                    return;
                }

                const points = ndviImages.map((image) => ({
                    timestamp: image.timestamp,
                    ...toSectionPercentages(image.histogram, FIELD_HEALTH_THRESHOLD),
                }));

                setNdviChartData(toOverallIntervals(points));
            } catch {
                if (!cancelled) {
                    setNdviChartData([]);
                }
            } finally {
                if (!cancelled) {
                    setIsFieldHealthLoading(false);
                }
            }
        }

        fetchNdviOverallChart();
        return () => {
            cancelled = true;
        };
    }, []);

    const allTasks = messages.flatMap((message, messageIndex) => (
        (message.tasks ?? []).map((task, taskIndex) => ({
            ...task,
            _taskKey: `${message.id ?? messageIndex}-${taskIndex}`,
            _messageKey: message.id ?? messageIndex,
            _taskIndex: taskIndex,
        }))
    ));

    const supportsPersistentDelete = typeof onDeleteTask === 'function';
    const visibleTasks = supportsPersistentDelete
        ? allTasks
        : allTasks.filter((task) => !dismissedTaskKeys.includes(task._taskKey));

    const handleDismissTask = (task) => {
        if (supportsPersistentDelete) {
            onDeleteTask(task._messageKey, task._taskIndex);
            return;
        }
        setDismissedTaskKeys((prev) => (prev.includes(task._taskKey) ? prev : [...prev, task._taskKey]));
    };

    function getCurrentSeason() {
        const now = new Date();
        const month = now.getMonth();
        const year = now.getFullYear();
        let season;
        if (month >= 2 && month <= 4) {
            season = 'Spring';
        } else if (month >= 5 && month <= 7) {
            season = 'Summer';
        } else if (month >= 8 && month <= 10) {
            season = 'Autumn';
        } else {
            season = 'Winter';
        }
        return `${season} ${year}`;
    }

    return (
        <div className={styles.dashboard}>
            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>Farm Overview</h1>
                <p className={styles.pageSubtitle}>Current season snapshot — {getCurrentSeason()}</p>
            </div>

            <section className={styles.statsGrid}>
                {statCards.map((card) => (
                    <StatCard key={card.label} {...card} />
                ))}
            </section>

            <div className={styles.bottomGrid}>
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <AlertTriangle size={16} className={styles.panelIcon} />
                        <span className={styles.panelTitle}>Alerts</span>
                        <span className={styles.badge}>{alerts.length}</span>
                    </div>
                    <ul className={styles.alertList}>
                        {alerts.map((alert) => (
                            <li key={alert.id} className={`${styles.alertItem} ${styles[alert.severity]}`}>
                                <span className={styles.alertDot} />
                                <span className={styles.alertMessage}>{alert.message}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className={styles.panel}>
                <div className={styles.panelHeader}>
                    <ClipboardList size={16} className={styles.panelIcon} />
                    <span className={styles.panelTitle}>Tasks</span>
                    {visibleTasks.length > 0 && <span className={styles.badge}>{visibleTasks.length}</span>}
                </div>
                {visibleTasks.length === 0 ? (
                    <p className={styles.emptyState}>Tasks suggested by the assistant will appear here.</p>
                ) : (
                    <ul className={styles.taskList}>
                        {visibleTasks.map((task, idx) => (
                            <li key={task._taskKey || idx} className={styles.taskItem}>
                                <div className={styles.taskHeader}>
                                    <span className={styles.taskTitle}>{task.title}</span>
                                    <div className={styles.taskMeta}>
                                        {task.priority && (
                                            <span className={`${styles.priorityTag} ${styles[`priority-${task.priority.toLowerCase()}`]}`}>
                                                {task.priority}
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            className={styles.taskDeleteBtn}
                                            aria-label={`Delete task ${task.title}`}
                                            onClick={() => handleDismissTask(task)}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                {task.detail && <p className={styles.taskDetail}>{task.detail}</p>}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className={styles.contentGrid}>
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <CloudSun size={16} className={styles.panelIcon} />
                        <span className={styles.panelTitle}>5-Day Forecast</span>
                        {farmLocation?.name && (
                            <span className={styles.forecastLocation}>
                                <MapPin size={11} /> {farmLocation.name}
                            </span>
                        )}
                    </div>
                    <ForecastPanel farmLocation={farmLocation} />
                </div>

                <div className={`${styles.panel} ${styles.fieldHealthPanel}`}>
                    <div className={styles.panelHeader}>
                        <Leaf size={16} className={styles.panelIcon} />
                        <span className={styles.panelTitle}>Field Health</span>
                    </div>
                    <div className={styles.chartPlaceholder}>
                        {isFieldHealthLoading ? (
                            <>
                                <Loader size={28} className={`${styles.placeholderIcon} ${styles.spin}`} />
                                <span className={styles.placeholderText}>Loading NDVI time series...</span>
                            </>
                        ) : ndviChartData.length > 0 ? (
                            <>
                                <div className={styles.fieldHealthChartWrap}>
                                    <ChartRenderer
                                        chartType="bar-stacked"
                                        height={220}
                                        chartData={ndviChartData}
                                        xKey="range"
                                        yKey={['low', 'medium', 'high']}
                                        colors={['#22c55e', '#f59e0b', '#ef4444']}
                                    />
                                </div>
                                <span className={styles.placeholderText}>
                                    NDVI overall time series (low/medium/high distribution)
                                </span>
                            </>
                        ) : (
                            <>
                                <Leaf size={40} className={styles.placeholderIcon} />
                                <span className={styles.placeholderText}>Please upload drone images to recieve analysis</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
