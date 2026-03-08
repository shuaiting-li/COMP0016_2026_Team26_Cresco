import React, { useEffect, useState } from "react";
import "./Weather.css"; // Weather.css for styling
import styles from './weather.module.css';
import { MapPin, CloudSun, Loader } from 'lucide-react';
import ChartRenderer from './ChartRenderer';
import { fetchWeather } from './services/api';



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

const Weather = ({ lat, lon }) => {
    const [weather, setWeather] = useState(null);
    const [forecast, setForecast] = useState(null);
    const [locationName, setLocationName] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!lat || !lon) return;

        let cancelled = false;

        const loadWeather = async () => {
            try {
                const data = await fetchWeather(lat, lon);
                if (cancelled) return;
                setWeather(data.current_weather);
                setForecast(data.forecast);
                setLocationName(data.current_weather?.name);
            } catch (err) {
                if (cancelled) return;
                console.error("Error loading weather:", err);
                setError(err.message);
            }
        };

        loadWeather();
        return () => { cancelled = true; };
    }, [lat, lon]);

    if (error) {
        return <div className="weather-container">Error: {error}</div>;
    }

    if (!weather || !forecast) {
        return <div className="weather-container">Loading...</div>;
    }



    return (
        <div className="weather-container scrollable">
            <h1 className="weather-title">Weather in {locationName || "Selected Location"}</h1>
            <ForecastPanel farmLocation={{ lat, lng: lon }} />
        </div>
    );
};

export default Weather;





