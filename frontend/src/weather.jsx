import React, { useEffect, useState } from "react";
import "./Weather.css"; // Importing Weather.css for styling

const Weather = ({ lat, lon }) => {
    const [weather, setWeather] = useState(null);
    const [forecast, setForecast] = useState(null);
    const [locationName, setLocationName] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!lat || !lon) return;

        const fetchWeather = async () => {
            const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;

            if (!apiKey) {
                setError("API key is missing. Please set VITE_OPENWEATHER_API_KEY in your .env file.");
                return;
            }

            try {
                // Fetch current weather
                const weatherResponse = await fetch(
                    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
                );
                if (!weatherResponse.ok) {
                    throw new Error("Failed to fetch current weather data");
                }
                const weatherData = await weatherResponse.json();
                setWeather(weatherData);

                // Extract location name from weather data
                setLocationName(weatherData.name);

                // Fetch forecast weather
                const forecastResponse = await fetch(
                    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
                );
                if (!forecastResponse.ok) {
                    throw new Error("Failed to fetch forecast data");
                }
                const forecastData = await forecastResponse.json();
                setForecast(forecastData);

                // Send weather and forecast data to the backend
                const backendResponse = await fetch("http://127.0.0.1:8000/api/v1/weather-data", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        location: weatherData.name,
                        currentWeather: weatherData,
                        forecast: forecastData
                    })
                });

                if (!backendResponse.ok) {
                    throw new Error("Failed to send weather data to the backend");
                }

                console.log("Weather data sent to backend successfully", weatherData, forecastData);
            } catch (err) {
                console.error("Error in fetchWeather:", err); // Debugging log for errors
                setError(err.message);
            }
        };

        fetchWeather();
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