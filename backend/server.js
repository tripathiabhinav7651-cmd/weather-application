const express = require("express");
const path = require("path");
const https = require("https");
const dns = require("dns");

const app = express();

const PORT = process.env.PORT || 3001;
const REQUEST_TIMEOUT_MS = 10000;
const clientDir = path.join(__dirname, "..", "wether application");

dns.setDefaultResultOrder("ipv4first");

function getJSON(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        family: 4,
        headers: {
          "User-Agent": "SkyCast-Weather-App/1.0"
        }
      },
      (response) => {
        let data = "";

        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          try {
            const json = JSON.parse(data);

            resolve({
              statusCode: response.statusCode,
              data: json
            });
          } catch (error) {
            reject(new Error("Weather provider returned invalid JSON."));
          }
        });
      }
    );

    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error("Weather provider request timed out."));
    });

    request.on("error", (error) => {
      reject(error);
    });
  });
}

app.use(express.static(clientDir));

app.get("/api/weather", async (req, res) => {
  const city = req.query.city
    ? req.query.city.trim()
    : "";

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
    const geoUrl =
      "https://geocoding-api.open-meteo.com/v1/search" +
      `?name=${encodeURIComponent(city)}` +
      "&count=1&language=en&format=json";

    const geoResponse = await getJSON(geoUrl);

    if (
      geoResponse.statusCode !== 200 ||
      !geoResponse.data.results ||
      geoResponse.data.results.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message: `City "${city}" not found.`
      });
    }

    const location = geoResponse.data.results[0];
    const weatherUrl =
      "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${location.latitude}` +
      `&longitude=${location.longitude}` +
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,pressure_msl,visibility" +
      "&hourly=temperature_2m,weather_code" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset" +
      "&timezone=auto";

    const weatherResponse = await getJSON(weatherUrl);

    if (
      weatherResponse.statusCode !== 200 ||
      !weatherResponse.data.current
    ) {
      return res.status(502).json({
        success: false,
        message: "Weather service returned an invalid response."
      });
    }

    const weather = weatherResponse.data;

    res.json({
      success: true,
      name: location.name,
      country: location.country,
      latitude: location.latitude,
      longitude: location.longitude,
      current: weather.current,
      hourly: weather.hourly,
      daily: weather.daily
    });
  } catch (error) {
    console.error("Weather API Error:", error.message);

    res.status(502).json({
      success: false,
      message: "Unable to connect to the weather service."
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(clientDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});