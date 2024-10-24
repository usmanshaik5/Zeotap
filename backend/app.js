const express = require('express');
const axios = require('axios');
const schedule = require('node-schedule');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { createConnection } = require('mysql2/promise'); // Assuming you're using mysql2 or similar DB
const nodemailer = require('nodemailer'); // Import nodemailer
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const cities = ["Delhi", "Mumbai", "Chennai", "Bangalore", "Kolkata", "Hyderabad"];
const apiKey = process.env.OPENWEATHER_API_KEY; // Store your API key in .env
let weatherData = []; // Array to store the current weather data
let historicalWeatherData = {}; // Object to store historical weather data

const historicalDataFilePath = path.join(__dirname, 'historicalWeatherData.json');

// Load existing historical data if available
if (fs.existsSync(historicalDataFilePath)) {
    const historicalData = fs.readFileSync(historicalDataFilePath, 'utf-8');
    historicalWeatherData = JSON.parse(historicalData);
}

// Function to connect to the database
const connectToDB = async () => {
    try {
        const connection = await createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });
        console.log('Successfully connected to the database'); // Log confirmation
        return connection;
    } catch (error) {
        console.error('Error connecting to the database:', error.message);
        process.exit(1); // Exit if the DB connection fails
    }
};

// Configure the SMTP transport for sending emails
const transporter = nodemailer.createTransport({
    host: 'smtp.example.com', // Use your SMTP server (e.g., Gmail, SendGrid)
    port: 587, // Use 465 for SSL, or 587 for TLS
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER, // your email from .env
        pass: process.env.EMAIL_PASSWORD, // your email password from .env
    },
});

// Function to send alert email
const sendAlertEmail = (recipient, subject, message) => {
    const mailOptions = {
        from: process.env.EMAIL_USER, // your email from .env
        to: recipient,
        subject: subject,
        text: message,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
};

// Function to fetch weather data
const fetchWeatherData = async () => {
    weatherData = []; // Reset weatherData on each fetch
    for (const city of cities) {
        try {
            const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`);
            const data = {
                city: response.data.name,
                main: response.data.weather[0].main,
                temp: response.data.main.temp,
                feels_like: response.data.main.feels_like,
                dt: response.data.dt * 1000, // Convert to milliseconds for Date object
                humidity: response.data.main.humidity,
                wind_speed: response.data.wind.speed,
            };
            weatherData.push(data);
            updateHistoricalData(data); // Update historical data
            console.log(`Fetched weather data for ${city}:`, data);

            // Check if the temperature exceeds a certain threshold (e.g., 30°C)
            if (data.temp > 30) {
                sendAlertEmail(
                    'recipient@example.com', // Change this to the actual recipient
                    `Temperature Alert for ${city}`,
                    `The temperature has exceeded the threshold! Current Temperature: ${data.temp}°C`
                );
            }
        } catch (error) {
            console.error(`Error fetching weather data for ${city}:`, error.message);
        }
    }

    saveHistoricalData(); // Save updated historical data to file
};


// Update historical weather data for a city
const updateHistoricalData = (cityWeather) => {
    const city = cityWeather.city;

    // Initialize historical data for the city if it doesn't exist
    if (!historicalWeatherData[city]) {
        historicalWeatherData[city] = [];
    }

    // Push the current weather data to the historical data for the city
    historicalWeatherData[city].push({
        dt: cityWeather.dt,
        temp: cityWeather.temp,
        humidity: cityWeather.humidity,
        wind_speed: cityWeather.wind_speed,
    });

    // Keep only the last 7 records for historical trends
    if (historicalWeatherData[city].length > 7) {
        historicalWeatherData[city].shift(); // Remove the oldest entry
    }
};

// Save historical weather data to file
const saveHistoricalData = () => {
    fs.writeFileSync(historicalDataFilePath, JSON.stringify(historicalWeatherData, null, 2), 'utf-8');
};

// Endpoint to get current weather data
app.get('/api/weather', (req, res) => {
    res.json(weatherData);
});

// Endpoint to get historical weather trends for a specific city
app.get('/api/weather/historical/:city', (req, res) => {
    const city = req.params.city;
    if (!historicalWeatherData[city]) {
        return res.status(404).json({ message: `No historical data available for ${city}.` });
    }

    const trends = historicalWeatherData[city].map(entry => {
        const date = new Date(entry.dt);
        return {
            date: `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`,
            temp: entry.temp,
            humidity: entry.humidity,
            wind_speed: entry.wind_speed,
        };
    });

    res.json({ city, trends });
});

// Endpoint to fetch weather forecast for all cities
app.get('/api/forecast', async (req, res) => {
    try {
        const forecasts = await Promise.all(cities.map(async (city) => {
            try {
                const response = await axios.get(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`);
                // Return only the necessary data
                return {
                    city: city,
                    temp: response.data.list[0].main.temp, // Current temp from the forecast
                    condition: response.data.list[0].weather[0].main, // Current weather condition
                };
            } catch (error) {
                console.error(`Error fetching forecast data for ${city}:`, error.message);
                return { city: city, temp: null, condition: 'No data available' }; // Handle city-specific error
            }
        }));

        res.json(forecasts);
    } catch (error) {
        console.error(`Error fetching forecast data:`, error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint to fetch weather forecast for a specific city
app.get('/api/weather/forecast/:city', async (req, res) => {
    const city = req.params.city;
    try {
        const response = await axios.get(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`);
        const forecast = response.data.list.map(item => ({
            dt: new Date(item.dt * 1000).toLocaleString(), // Convert to local date and time format
            temp: item.main.temp,
            humidity: item.main.humidity,
            wind_speed: item.wind.speed,
            main: item.weather[0].main,
        }));
        res.json({ city, forecast });
    } catch (error) {
        console.error(`Error fetching forecast data for ${city}:`, error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Schedule fetching weather data every 5 minutes
schedule.scheduleJob('*/5 * * * *', fetchWeatherData);

// Start server and establish DB connection
app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);

    // Connect to the database on server start
    await connectToDB();

    fetchWeatherData(); // Initial fetch on server start
});
