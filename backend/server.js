const express = require("express");
const path = require("path");
const https = require("https");
const dns = require("dns");

const app = express();

// ======================================================
// PORT
// ======================================================

const PORT = process.env.PORT || 3001;
const REQUEST_TIMEOUT_MS = 15000;

// ======================================================
// PROJECT STRUCTURE
// ======================================================
//
// weather application/
// │
// ├── backend/
// │   └── server.js
// │
// ├── frontend/
// │   ├── index.html
// │   ├── style.css
// │   └── script.js
// │
// ├── package.json
// └── package-lock.json
//
// ======================================================

const clientDir = path.join(__dirname, "..", "frontend");

dns.setDefaultResultOrder("ipv4first");

// ======================================================
// HTTPS JSON REQUEST
// ======================================================

function getJSON(url) {
    return new Promise((resolve, reject) => {

        const request = https.get(
            url,
            {
                family: 4,
                headers: {
                    "User-Agent": "SkyCast-Weather-App/1.0",
                    "Accept": "application/json"
                }
            },
            (response) => {

                let data = "";

                response.setEncoding("utf8");

                response.on("data", (chunk) => {
                    data += chunk;
                });

                response.on("end", () => {

                    let json;

                    try {
                        json = JSON.parse(data);
                    } catch (error) {

                        console.error(
                            "Invalid JSON from provider:"
                        );

                        console.error(data);

                        return reject(
                            new Error(
                                "Weather provider returned invalid JSON."
                            )
                        );
                    }

                    resolve({
                        statusCode: response.statusCode,
                        data: json
                    });
                });
            }
        );

        request.setTimeout(
            REQUEST_TIMEOUT_MS,
            () => {

                request.destroy(
                    new Error(
                        "Weather provider request timed out."
                    )
                );
            }
        );

        request.on("error", (error) => {
            reject(error);
        });
    });
}

// ======================================================
// FRONTEND STATIC FILES
// ======================================================

app.use(express.static(clientDir));

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/health", (req, res) => {

    console.log("HEALTH CHECK HIT");

    res.status(200).json({
        success: true,
        message: "SkyCast backend is running."
    });
});

// ======================================================
// WEATHER API
// GET /api/weather?city=Delhi
// ======================================================

app.get("/api/weather", async (req, res) => {

    console.log("=================================");
    console.log("WEATHER API REQUEST");
    console.log("City:", req.query.city);
    console.log("=================================");

    const city = req.query.city
        ? String(req.query.city).trim()
        : "";

    // ==================================================
    // VALIDATION
    // ==================================================

    if (!city) {

        return res.status(400).json({
            success: false,
            message: "City name is required."
        });
    }

    if (city.length > 100) {

        return res.status(400).json({
            success: false,
            message: "City name is too long."
        });
    }

    try {

        // ==================================================
        // STEP 1: GEOCODING
        // ==================================================

        const geoParams = new URLSearchParams({
            name: city,
            count: "1",
            language: "en",
            format: "json"
        });

        const geoUrl =
            "https://geocoding-api.open-meteo.com/v1/search?" +
            geoParams.toString();

        console.log("Calling Geocoding API...");
        console.log(geoUrl);

        const geoResponse = await getJSON(geoUrl);

        console.log(
            "Geocoding status:",
            geoResponse.statusCode
        );

        // ==================================================
        // GEOCODING ERROR
        // ==================================================

        if (geoResponse.statusCode !== 200) {

            console.error(
                "Geocoding error:",
                geoResponse.data
            );

            return res.status(502).json({
                success: false,
                message: "Location service returned an error.",
                providerStatus: geoResponse.statusCode,
                providerError: geoResponse.data
            });
        }

        // ==================================================
        // CITY NOT FOUND
        // ==================================================

        if (
            !geoResponse.data ||
            !Array.isArray(geoResponse.data.results) ||
            geoResponse.data.results.length === 0
        ) {

            return res.status(404).json({
                success: false,
                message: `City "${city}" not found.`
            });
        }

        const location =
            geoResponse.data.results[0];

        console.log(
            "Location found:",
            location.name,
            location.country
        );

        console.log(
            "Coordinates:",
            location.latitude,
            location.longitude
        );

        // ==================================================
        // STEP 2: WEATHER API
        // ==================================================

        const weatherParams = new URLSearchParams({

            latitude:
                String(location.latitude),

            longitude:
                String(location.longitude),

            current:
                "temperature_2m," +
                "relative_humidity_2m," +
                "apparent_temperature," +
                "is_day," +
                "precipitation," +
                "weather_code," +
                "wind_speed_10m," +
                "pressure_msl," +
                "visibility",

            hourly:
                "temperature_2m,weather_code",

            daily:
                "weather_code," +
                "temperature_2m_max," +
                "temperature_2m_min," +
                "sunrise," +
                "sunset",

            timezone: "auto"
        });

        const weatherUrl =
            "https://api.open-meteo.com/v1/forecast?" +
            weatherParams.toString();

        console.log("Calling Weather API...");
        console.log(weatherUrl);

        const weatherResponse =
            await getJSON(weatherUrl);

        console.log(
            "Weather API status:",
            weatherResponse.statusCode
        );

        // ==================================================
        // WEATHER API ERROR
        // ==================================================

        if (weatherResponse.statusCode !== 200) {

            console.error(
                "Weather provider error:",
                weatherResponse.data
            );

            return res.status(502).json({
                success: false,
                message: "Weather provider returned an error.",
                providerStatus: weatherResponse.statusCode,
                providerError: weatherResponse.data
            });
        }

        // ==================================================
        // VALIDATE WEATHER RESPONSE
        // ==================================================

        if (
            !weatherResponse.data ||
            !weatherResponse.data.current
        ) {

            console.error(
                "Invalid weather response:",
                weatherResponse.data
            );

            return res.status(502).json({
                success: false,
                message: "Weather provider returned an invalid response.",
                providerResponse: weatherResponse.data
            });
        }

        const weather =
            weatherResponse.data;

        console.log(
            "Weather data received successfully."
        );

        // ==================================================
        // SEND RESPONSE
        // ==================================================

        return res.status(200).json({

            success: true,

            name:
                location.name,

            country:
                location.country,

            latitude:
                location.latitude,

            longitude:
                location.longitude,

            current:
                weather.current,

            hourly:
                weather.hourly || null,

            daily:
                weather.daily || null
        });

    } catch (error) {

        console.error(
            "================================="
        );

        console.error(
            "WEATHER API ERROR"
        );

        console.error(
            error
        );

        console.error(
            "================================="
        );

        return res.status(502).json({
            success: false,
            message: "Unable to connect to the weather service.",
            error: error.message
        });
    }
});

// ======================================================
// UNKNOWN API ROUTES
// ======================================================

app.use("/api", (req, res) => {

    res.status(404).json({
        success: false,
        message: "API route not found.",
        path: req.originalUrl
    });
});

// ======================================================
// FRONTEND FALLBACK
// ======================================================

app.get("*", (req, res) => {

    res.sendFile(
        path.join(
            clientDir,
            "index.html"
        ),
        (error) => {

            if (error) {

                console.error(
                    "Frontend error:",
                    error
                );

                res.status(500).send(
                    "Frontend index.html not found."
                );
            }
        }
    );
});

// ======================================================
// SERVER START
// ======================================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "================================="
        );

        console.log(
            `SkyCast server running on port ${PORT}`
        );

        console.log(
            `Frontend directory: ${clientDir}`
        );

        console.log(
            "================================="
        );
    }
);