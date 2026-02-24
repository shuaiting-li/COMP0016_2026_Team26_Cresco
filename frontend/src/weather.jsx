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

        const loadWeather = async () => {
            try {
                const data = await fetchWeather(lat, lon);

                setWeather(data.current_weather);
                setForecast(data.forecast);
                setLocationName(data.current_weather?.name);

                console.log("Weather data loaded successfully", data);
            } catch (err) {
                console.error("Error loading weather:", err);
                setError(err.message);
            }
        };

        loadWeather();
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
                <p>Condition: {weather.weather[0].description}</p>
                <p>Humidity: {weather.main.humidity}%</p>
                <p>Wind Speed: {weather.wind.speed} m/s</p>
            </div>

            <h2 className="weather-title">10-Day Forecast</h2>
            <div className="forecast-grid">
                {forecast.list.slice(0, 10).map((entry, index) => (
                    <div key={index} className="forecast-card">
                        <p><strong>{new Date(entry.dt * 1000).toLocaleString()}</strong></p>
                        <p>Temp: {entry.main.temp}°C</p>
                        <p>{entry.weather[0].description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Weather;