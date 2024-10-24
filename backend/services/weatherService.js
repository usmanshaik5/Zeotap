const axios = require('axios');
const { OPENWEATHER_API_KEY } = process.env;
const fs = require('fs');
const path = require('path');

// List of cities to fetch weather data for
const cities = ['Delhi', 'Mumbai', 'Chennai', 'Bangalore', 'Kolkata', 'Hyderabad'];
const historicalDataFilePath = path.join(__dirname, 'historicalWeatherData.json');

// Load historical weather data from file
let historicalWeatherData = {};

// Load existing historical data if available
if (fs.existsSync(historicalDataFilePath)) {
    const historicalData = fs.readFileSync(historicalDataFilePath, 'utf-8');
    historicalWeatherData = JSON.parse(historicalData);
}

// Fetch current weather data for all cities
async function fetchWeatherData() {
    const weatherData = [];

    for (const city of cities) {
        try {
            const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_API_KEY}&units=metric`);
            const data = response.data;

            // Extract and format the required data
            const cityWeather = {
                city: data.name,
                temp: data.main.temp, // Temperature in Celsius
                feels_like: data.main.feels_like, // Perceived temperature
                main: data.weather[0].main, // Main weather condition
                dt: data.dt * 1000, // Convert to milliseconds for Date object
                humidity: data.main.humidity !== undefined ? data.main.humidity : "Data unavailable", // Humidity with default value
                wind_speed: data.wind.speed !== undefined ? data.wind.speed : "Data unavailable", // Wind speed with default value
            };

            // Store the current weather data in the array
            weatherData.push(cityWeather);

            // Update historical weather data for this city
            updateHistoricalData(cityWeather);
        } catch (error) {
            console.error(`Error fetching weather data for ${city}:`, error.message);
        }
    }

    // Save the updated historical weather data to file
    saveHistoricalData();

    return weatherData; // Return the accumulated weather data
}

// Update historical weather data for a city
function updateHistoricalData(cityWeather) {
    const city = cityWeather.city;

    // Initialize historical data for the city if it doesn't exist
    if (!historicalWeatherData[city]) {
        historicalWeatherData[city] = [];
    }

    // Push the current weather data to the historical data for the city
    historicalWeatherData[city].push({
        dt: cityWeather.dt,
        temp: cityWeather.temp,
        humidity: cityWeather.humidity !== undefined ? cityWeather.humidity : "Data unavailable", // Store humidity with default
        wind_speed: cityWeather.wind_speed !== undefined ? cityWeather.wind_speed : "Data unavailable", // Store wind speed with default
    });

    // Keep only the last 7 records for historical trends
    if (historicalWeatherData[city].length > 7) {
        historicalWeatherData[city].shift(); // Remove the oldest entry
    }
}

// Save historical weather data to file
function saveHistoricalData() {
    fs.writeFileSync(historicalDataFilePath, JSON.stringify(historicalWeatherData, null, 2), 'utf-8');
}

// Get historical weather trends for a specific city
function getHistoricalTrends(city) {
    if (!historicalWeatherData[city]) {
        return `No historical data available for ${city}.`;
    }

    const trends = historicalWeatherData[city].map(entry => {
        const date = new Date(entry.dt);
        const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}: ${entry.temp.toFixed(2)}°C, Humidity: ${entry.humidity}, Wind Speed: ${entry.wind_speed} m/s`;
        return formattedDate;
    });

    return `${city} - Last 7 Days\n${trends.join('\n')}`;
}

// Fetch weather forecast data for a city
async function fetchWeatherForecast(city) {
    try {
        const response = await axios.get(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${OPENWEATHER_API_KEY}&units=metric`);
        return response.data; // Return forecast data
    } catch (error) {
        console.error(`Error fetching forecast data for ${city}:`, error.message);
    }
}

// Generate summaries based on forecast data
function generateForecastSummary(forecastData) {
    const summaries = forecastData.list.map(entry => {
        const date = entry.dt_txt.split(" ")[0]; // Extract date
        const temp = entry.main.temp;
        const weather = entry.weather[0].main;
        const humidity = entry.main.humidity !== undefined ? entry.main.humidity : "Data unavailable"; // Handle humidity
        const windSpeed = entry.wind.speed !== undefined ? entry.wind.speed : "Data unavailable"; // Handle wind speed

        return {
            date: date,
            temp: temp,
            weather: weather,
            humidity: humidity,
            windSpeed: windSpeed
        };
    });
    return summaries;
}

// Fetch and summarize forecasts for all cities
async function fetchAllForecasts() {
    const forecasts = {};

    for (const city of cities) {
        const forecastData = await fetchWeatherForecast(city);
        if (forecastData) {
            forecasts[city] = generateForecastSummary(forecastData);
        }
    }

    return forecasts;
}

// Export the functions
module.exports = {
    fetchWeatherData,
    getHistoricalTrends,
    fetchWeatherForecast,
    generateForecastSummary,
    fetchAllForecasts // Added new function to fetch forecasts for all cities
};
