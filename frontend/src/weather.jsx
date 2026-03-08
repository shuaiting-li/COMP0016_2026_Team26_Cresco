import React, { useEffect, useState } from "react";
import styles from './weather.module.css';
import { CloudSun } from 'lucide-react';
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

// Receives pre-fetched forecast data from the parent Weather component.
function ForecastPanel({ forecast }) {
    if (!forecast?.list) {
        return (
            <div className={styles.chartPlaceholder}>
                <CloudSun size={36} className={styles.placeholderIcon} />
                <span className={styles.placeholderText}>No forecast data available</span>
            </div>
        );
    }

    const grouped = forecast.list.reduce((acc, entry) => {
        const date = entry.dt_txt.split(' ')[0];
        const hour = entry.dt_txt.split(' ')[1];
        if (!acc[date] || hour === '12:00:00') acc[date] = entry;
        return acc;
    }, {});
    const days = Object.values(grouped).slice(0, 5);

    return (
        <div className={styles.forecastPanel}>
            <h2>5-Day Forecast</h2>
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
        return <div className={styles.weatherContainer}>Error: {error}</div>;
    }

    if (!weather || !forecast) {
        return <div className={styles.weatherContainer}>Loading...</div>;
    }

    return (
        <div className={styles.weatherContainer}>
            <h1 className={styles.weatherTitle}>Weather in {locationName || "Selected Location"}</h1>
            <ForecastPanel forecast={forecast} />
        </div>
    );
};

export default Weather;





