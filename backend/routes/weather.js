const express = require('express');
const router = express.Router();
const weatherService = require('../services/weatherService');

// Endpoint to get current weather data for all cities
router.get('/current', async (req, res) => {
    try {
        const weatherData = await weatherService.fetchWeatherData();
        res.json(weatherData); // Send the current weather data as a response
    } catch (error) {
        console.error("Error fetching current weather data:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// Endpoint to send email alerts
app.post('/api/send-email', (req, res) => {
    const { recipient, subject, message } = req.body;
    if (!recipient || !subject || !message) {
        return res.status(400).json({ error: 'Recipient, subject, and message are required.' });
    }

    sendAlertEmail(recipient, subject, message);
    res.json({ message: 'Email sent successfully!' });
});

// Endpoint to get historical weather trends for a specific city
router.get('/historical/:city', (req, res) => {
    const city = req.params.city;
    const trends = weatherService.getHistoricalTrends(city);
    if (trends.startsWith("No historical data")) {
        return res.status(404).json({ message: trends });
    }
    res.json({ trends });
});

// Endpoint to fetch weather forecast for a specific city
router.get('/forecast/:city', async (req, res) => {
    const city = req.params.city;
    try {
        const forecastData = await weatherService.fetchWeatherForecast(city);
        res.json(forecastData); // Send the forecast data as a response
    } catch (error) {
        console.error(`Error fetching forecast data for ${city}:`, error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint to fetch forecasts for all cities
router.get('/forecasts', async (req, res) => {
    try {
        const forecasts = await weatherService.fetchAllForecasts();
        res.json(forecasts); // Send the forecasts for all cities as a response
    } catch (error) {
        console.error("Error fetching forecasts:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
