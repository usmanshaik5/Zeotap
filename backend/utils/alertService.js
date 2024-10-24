let lastTemperatures = {};

function checkThreshold(city, temperature, threshold) {
    if (!lastTemperatures[city]) {
        lastTemperatures[city] = [];
    }

    lastTemperatures[city].push(temperature);
    // Keep only the last two readings
    if (lastTemperatures[city].length > 2) {
        lastTemperatures[city].shift();
    }

    if (lastTemperatures[city].length === 2) {
        if (lastTemperatures[city][0] > threshold && lastTemperatures[city][1] > threshold) {
            console.log(`Alert: ${city} temperature exceeded ${threshold}°C`);
        }
    }
}

module.exports = { checkThreshold };
