const mysql = require('mysql2');

// Create a connection pool to the MySQL database
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'weather_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Function to insert weather data into the database
const insertWeatherData = (weatherData) => {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO weather_reports (temperature, humidity, wind_speed, city, timestamp)
            VALUES (?, ?, ?, ?, ?)
        `;

        const { temperature, humidity, wind_speed, city, timestamp } = weatherData;

        pool.query(sql, [temperature, humidity, wind_speed, city, timestamp], (error, results) => {
            if (error) {
                return reject(error);
            }
            resolve(results);
        });
    });
};

// Function to fetch the latest weather data from the database
const getLatestWeatherData = () => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM weather_reports ORDER BY timestamp DESC LIMIT 10`;  // Fetch the latest 10 records
        pool.query(sql, (error, results) => {
            if (error) {
                return reject(error);
            }
            resolve(results);
        });
    });
};

// Export the functions for usage in other parts of the project
module.exports = {
    insertWeatherData,
    getLatestWeatherData
};
