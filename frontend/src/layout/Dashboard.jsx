import { useEffect, useState } from 'react';
import { CloudSun, Sprout, BarChart2, AlertTriangle, ArrowUpRight, ArrowDownRight, Minus, Leaf, Droplets, Thermometer, Wind, MapPin, Loader } from 'lucide-react';
import { ClipboardList } from 'lucide-react';
import { fetchWeather } from '../services/api';
import ChartRenderer from '../ChartRenderer';
import styles from './Dashboard.module.css';

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

const recentActivity = [
    // { id: 1, action: 'short-message', detail: 'detail text', time: 'x min ago / x hr ago / idk just the actual time?' },
];

const WEATHER_ICONS = {
    'clear sky': '☀️', 'few clouds': '🌤️', 'scattered clouds': '⛅',
    'broken clouds': '☁️', 'overcast clouds': '☁️', 'shower rain': '🌧️',
    'rain': '🌦️', 'light rain': '🌦️', 'moderate rain': '🌧️', 'heavy intensity rain': '🌧️',
    'thunderstorm': '⛈️', 'snow': '❄️', 'mist': '🌫️', 'fog': '🌫️',
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
        return () => { cancelled = true; };
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
                <span className={styles.placeholderText}>Loading forecast…</span>
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
                    const label = i === 0 ? 'Today'
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
                        day: i === 0 ? 'Today'
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

export default function Dashboard({ farmLocation, messages = [] }) {
    const allTasks = messages.flatMap(m => m.tasks ?? []);
    return (
        <div className={styles.dashboard}>

            {/* Page Header */}
            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>Farm Overview</h1>
                <p className={styles.pageSubtitle}>Current season snapshot — Spring 2026</p>  {/* Change this to real time data in the future */}
            </div>

            {/* Stat Cards */}
            <section className={styles.statsGrid}>
                {statCards.map((card) => (
                    <StatCard key={card.label} {...card} />
                ))}
            </section>

            {/* Top row */}
            <div className={styles.bottomGrid}>

                {/* Alerts */}
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

                {/* Recent activity */}
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <Sprout size={16} className={styles.panelIcon} />
                        <span className={styles.panelTitle}>Recent Activity</span>
                    </div>
                    <ul className={styles.activityList}>
                        {recentActivity.map((item) => (
                            <li key={item.id} className={styles.activityItem}>
                                <div className={styles.activityContent}>
                                    <span className={styles.activityAction}>{item.action}</span>
                                    <span className={styles.activityDetail}>{item.detail}</span>
                                </div>
                                <span className={styles.activityTime}>{item.time}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                

            </div>



            {/* Task activity */}
            <div className={styles.panel}>
                <div className={styles.panelHeader}>
                    <ClipboardList size={16} className={styles.panelIcon} />
                    <span className={styles.panelTitle}>Tasks</span>
                    {allTasks.length > 0 && <span className={styles.badge}>{allTasks.length}</span>}
                </div>
                {allTasks.length === 0 ? (
                    <p className={styles.emptyState}>Tasks suggested by the assistant will appear here.</p>
                ) : (
                    <ul className={styles.taskList}>
                        {allTasks.map((task, idx) => (
                            <li key={idx} className={styles.taskItem}>
                                <div className={styles.taskHeader}>
                                    <span className={styles.taskTitle}>{task.title}</span>
                                    {task.priority && (
                                        <span className={`${styles.priorityTag} ${styles[`priority-${task.priority.toLowerCase()}`]}`}>
                                            {task.priority}
                                        </span>
                                    )}
                                </div>
                                {task.detail && <p className={styles.taskDetail}>{task.detail}</p>}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Main content grid */}
            <div className={styles.contentGrid}>

                {/* 5-Day Weather Forecast */}
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

                {/* Yield chart placeholder */}
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <BarChart2 size={16} className={styles.panelIcon} />
                        <span className={styles.panelTitle}>Yield Forecast</span>
                    </div>
                    <div className={styles.chartPlaceholder}>
                        <BarChart2 size={40} className={styles.placeholderIcon} />
                        <span className={styles.placeholderText}>Chart coming soon</span>
                    </div>
                </div>

                {/* Field health — right */}
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <Leaf size={16} className={styles.panelIcon} />
                        <span className={styles.panelTitle}>Field Health</span>
                    </div>
                    <div className={styles.chartPlaceholder}>
                        <Leaf size={40} className={styles.placeholderIcon} />
                        <span className={styles.placeholderText}>NDVI map coming soon</span>
                    </div>
                </div>

            </div>


        </div>
    );
}
