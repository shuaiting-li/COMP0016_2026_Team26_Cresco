import React, { useEffect, useState } from "react";
import "./Weather.css"; // Importing Weather.css for styling
import { fetchWeather } from './services/api';

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
            <div className="weather-card">
                <p>Temperature: {weather.main.temp}°C</p>
                <p>Condition: {weather.weather[0].description.replace(/\b\w/g, c => c.toUpperCase())}</p>
                <p>Humidity: {weather.main.humidity}%</p>
                <p>Wind Speed: {weather.wind.speed} m/s</p>
            </div>

            <h2 className="weather-title">5-Day Forecast</h2>
            <div className="forecast-grid">
                {Object.values(
                    forecast.list.reduce((days, entry) => {
                        const date = entry.dt_txt.split(' ')[0];
                        const hour = entry.dt_txt.split(' ')[1];
                        // Prefer the midday entry; fall back to first entry seen for the day
                        if (!days[date] || hour === '12:00:00') days[date] = entry;
                        return days;
                    }, {})
                ).slice(0, 5).map((entry, index) => (
                    <div key={index} className="forecast-card">
                        <p><strong>{new Date(entry.dt * 1000).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</strong></p>
                        <p>Temp: {entry.main.temp}°C</p>
                        <p>{entry.weather[0].description.replace(/\b\w/g, c => c.toUpperCase())}</p>
                        <p>Wind: {entry.wind.speed} m/s</p>
                        {entry.rain?.['3h'] && <p>Rain: {entry.rain['3h']} mm</p>}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Weather;