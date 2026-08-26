// ===============================
// SkyCast - Weather Application
// ===============================

const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const currentDateTime = document.getElementById("currentDateTime");


// ===============================
// REQUEST CONTROL
// ===============================

let isLoading = false;


// ===============================
// CURRENT DATE & TIME
// ===============================

function updateCurrentDateTime() {

    if (!currentDateTime) {
        return;
    }

    currentDateTime.textContent = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
    }).format(new Date());
}


// ===============================
// SEARCH WEATHER
// ===============================

async function searchWeather() {

    if (isLoading || !cityInput) {
        return;
    }

    const city = cityInput.value.trim();

    if (city === "") {
        alert("Please enter a city name.");
        return;
    }

    await getWeather(city);
}

// ===============================
// SEARCH BUTTON
// ===============================

if (searchBtn) {

    searchBtn.addEventListener("click", searchWeather);
}


// ===============================
// ENTER KEY
// ===============================

if (cityInput) {

    cityInput.addEventListener("keydown", async function (event) {

        if (event.key === "Enter") {

            event.preventDefault();

            if (!isLoading) {
                await searchWeather();
            }
        }

    });
}


// ===============================
// GET WEATHER FROM BACKEND
// ===============================

async function getWeather(city) {

    if (isLoading) {
        return;
    }

    isLoading = true;

    showLoading();


    // Disable search button
    if (searchBtn) {

        searchBtn.disabled = true;
        searchBtn.style.opacity = "0.6";
        searchBtn.style.cursor = "not-allowed";
    }


    try {

        console.log("Searching weather for:", city);


        // ===============================
        // BACKEND API REQUEST
        // ===============================

        const response = await fetch(
            `/api/weather?city=${encodeURIComponent(city)}`,
            {
                method: "GET",
                cache: "no-store"
            }
        );


        const data = await response.json();


        console.log("Weather response:", data);


        // ===============================
        // BACKEND ERROR
        // ===============================

        if (!response.ok || data.success === false) {

            alert(data.message || "City Not Found");

            return;
        }


        // ===============================
        // CURRENT WEATHER
        // ===============================

        updateCurrentWeatherOpenMeteo(data);


        // ===============================
        // HOURLY FORECAST
        // ===============================

        if (data.hourly) {

            showHourlyForecastOpenMeteo(data.hourly);
        }


        // ===============================
        // WEEKLY FORECAST
        // ===============================

        if (data.daily) {

            showWeeklyForecastOpenMeteo(data.daily);
        }


        console.log("Weather loaded successfully.");

    }
    catch (error) {

        console.error("Weather Error:", error);

        alert(
            "Unable to connect to the weather service. Please try again."
        );

    }
    finally {

        isLoading = false;

        hideLoading();


        // Enable search button
        if (searchBtn) {

            searchBtn.disabled = false;
            searchBtn.style.opacity = "1";
            searchBtn.style.cursor = "pointer";
        }
    }
}


// ===============================
// UPDATE CURRENT WEATHER
// ===============================

function updateCurrentWeatherOpenMeteo(data) {

    if (!data || !data.current) {
        return;
    }

    const current = data.current;


    // ===============================
    // WEATHER CODE
    // ===============================

    const weather = mapWeatherCode(
        current.weather_code
    );


    // ===============================
    // CITY
    // ===============================

    const cityName = document.getElementById("cityName");

    if (cityName) {

        cityName.textContent =
            `${data.name}, ${data.country}`;
    }


    // ===============================
    // TEMPERATURE
    // ===============================

    const temp = document.getElementById("temp");

    if (temp) {

        temp.textContent =
            `${Math.round(current.temperature_2m)}°C`;
    }


    // ===============================
    // WEATHER TYPE
    // ===============================

    const weatherType =
        document.getElementById("weatherType");

    if (weatherType) {

        weatherType.textContent =
            weather.label;
    }


    // ===============================
    // HUMIDITY
    // ===============================

    const humidity =
        document.getElementById("humidity");

    if (humidity) {

        humidity.textContent =
            `${current.relative_humidity_2m}%`;
    }


    // ===============================
    // WIND
    // ===============================

    const wind =
        document.getElementById("wind");

    if (wind) {

        wind.textContent =
            `${current.wind_speed_10m} km/h`;
    }


    // ===============================
    // PRESSURE
    // ===============================

    const pressure =
        document.getElementById("pressure");

    if (pressure) {

        pressure.textContent =
            `${current.pressure_msl} hPa`;
    }


    // ===============================
    // VISIBILITY
    // ===============================

    const visibility =
        document.getElementById("visibility");

    if (
        visibility &&
        typeof current.visibility === "number"
    ) {

        const visibilityKm =
            current.visibility / 1000;

        visibility.textContent =
            `${visibilityKm.toFixed(1)} km`;
    }


    // ===============================
    // RAIN
    // ===============================

    const rain =
        document.getElementById("rain");

    if (rain) {

        const precipitation =
            current.precipitation || 0;

        rain.textContent =
            `${precipitation} mm`;
    }


    // ===============================
    // SUNRISE
    // ===============================

    const sunrise =
        document.getElementById("sunrise");

    if (
        sunrise &&
        data.daily &&
        data.daily.sunrise &&
        data.daily.sunrise.length > 0
    ) {

        sunrise.textContent =
            formatTime(data.daily.sunrise[0]);
    }


    // ===============================
    // SUNSET
    // ===============================

    const sunset =
        document.getElementById("sunset");

    if (
        sunset &&
        data.daily &&
        data.daily.sunset &&
        data.daily.sunset.length > 0
    ) {

        sunset.textContent =
            formatTime(data.daily.sunset[0]);
    }


    // ===============================
    // WEATHER ICON
    // ===============================

    const weatherIcon =
        document.getElementById("weatherIcon");

    if (weatherIcon) {

        weatherIcon.src =
            `https://openweathermap.org/img/wn/${weather.icon}@4x.png`;

        weatherIcon.alt =
            weather.label;
    }


    // ===============================
    // BACKGROUND
    // ===============================

    changeBackground(weather.label);
}


// ===============================
// FORMAT TIME
// ===============================

function formatTime(value) {

    if (!value) {
        return "--";
    }

    return new Date(value).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}


// ===============================
// WEATHER CODE MAPPING
// OPEN-METEO WMO CODES
// ===============================

function mapWeatherCode(code) {

    switch (code) {

        // Clear
        case 0:
            return {
                label: "Clear",
                icon: "01d"
            };


        // Cloudy
        case 1:
        case 2:
        case 3:
            return {
                label: "Cloudy",
                icon: "04d"
            };


        // Fog
        case 45:
        case 48:
            return {
                label: "Fog",
                icon: "50d"
            };


        // Rain
        case 51:
        case 53:
        case 55:
        case 56:
        case 57:
        case 61:
        case 63:
        case 65:
        case 66:
        case 67:
        case 80:
        case 81:
        case 82:
            return {
                label: "Rain",
                icon: "10d"
            };


        // Snow
        case 71:
        case 73:
        case 75:
        case 77:
        case 85:
        case 86:
            return {
                label: "Snow",
                icon: "13d"
            };


        // Thunderstorm
        case 95:
        case 96:
        case 99:
            return {
                label: "Thunderstorm",
                icon: "11d"
            };


        // Default
        default:
            return {
                label: "Weather",
                icon: "01d"
            };
    }
}


// ===============================
// HOURLY FORECAST
// ===============================

function showHourlyForecastOpenMeteo(hourly) {

    const hourlyForecast =
        document.getElementById("hourlyForecast");


    if (
        !hourlyForecast ||
        !hourly ||
        !hourly.time ||
        !hourly.temperature_2m ||
        !hourly.weather_code
    ) {
        return;
    }


    hourlyForecast.innerHTML = "";


    const totalHours =
        Math.min(hourly.time.length, 8);


    for (
        let index = 0;
        index < totalHours;
        index++
    ) {

        const time =
            hourly.time[index];


        const temperature =
            hourly.temperature_2m[index];


        const weather =
            mapWeatherCode(
                hourly.weather_code[index]
            );


        const itemTime =
            new Date(time).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            });


        hourlyForecast.innerHTML += `
            <div class="hour-card">

                <h4>${itemTime}</h4>

                <img
                    src="https://openweathermap.org/img/wn/${weather.icon}@2x.png"
                    alt="${weather.label}"
                >

                <p>
                    ${Math.round(temperature)}°C
                </p>

            </div>
        `;
    }
}


// ===============================
// WEEKLY FORECAST
// ===============================

function showWeeklyForecastOpenMeteo(daily) {

    const weeklyForecast =
        document.getElementById("weeklyForecast");


    if (
        !weeklyForecast ||
        !daily ||
        !daily.time ||
        !daily.weather_code ||
        !daily.temperature_2m_max ||
        !daily.temperature_2m_min
    ) {
        return;
    }


    weeklyForecast.innerHTML = "";


    const totalDays =
        Math.min(daily.time.length, 7);


    for (
        let index = 0;
        index < totalDays;
        index++
    ) {

        const date =
            new Date(
                daily.time[index]
            ).toLocaleDateString(
                "en-US",
                {
                    weekday: "short"
                }
            );


        const weather =
            mapWeatherCode(
                daily.weather_code[index]
            );


        const maxTemperature =
            daily.temperature_2m_max[index];


        const minTemperature =
            daily.temperature_2m_min[index];


        weeklyForecast.innerHTML += `
            <div class="week-card">

                <h4>${date}</h4>

                <img
                    src="https://openweathermap.org/img/wn/${weather.icon}@2x.png"
                    alt="${weather.label}"
                >

                <h3>
                    ${Math.round(maxTemperature)}°C
                </h3>

                <p>
                    ${weather.label}
                </p>

                <small>
                    ${Math.round(minTemperature)}°C
                </small>

            </div>
        `;
    }
}


// ===============================
// LOADING
// ===============================

function showLoading() {

    const cityName =
        document.getElementById("cityName");

    if (cityName) {

        cityName.textContent =
            "Loading...";
    }
}


function hideLoading() {
    // Nothing required
}


// ===============================
// ERROR
// ===============================

function showError(message) {

    alert(
        message ||
        "Something went wrong."
    );
}


// ===============================
// DARK MODE BUTTON
// ===============================

const darkBtn = document.getElementById("darkModeToggle");


// ===============================
// SAVED THEME
// ===============================

let isDarkMode =
    localStorage.getItem("theme") === "dark";


applyTheme(isDarkMode);


// ===============================
// DARK MODE CLICK
// ===============================

if (darkBtn) {
    darkBtn.addEventListener(
        "click",
        function () {

            isDarkMode =
                !isDarkMode;

            applyTheme(isDarkMode);
        }
    );
}


// ===============================
// APPLY THEME
// ===============================

function applyTheme(isDark) {

    document.body.classList.toggle(
        "dark",
        isDark
    );


    if (darkBtn) {
        darkBtn.innerHTML = isDark
            ? '<i class="fa-solid fa-sun"></i>'
            : '<i class="fa-solid fa-moon"></i>';
    }


    localStorage.setItem(
        "theme",
        isDark ? "dark" : "light"
    );


    const weatherType =
        document.getElementById("weatherType");


    if (
        weatherType &&
        weatherType.textContent
    ) {

        changeBackground(
            weatherType.textContent
        );
    }
}


// ===============================
// CHANGE BACKGROUND
// ===============================

function changeBackground(weather) {

    if (!weather) {
        weather = "clear";
    }


    weather =
        weather.toLowerCase();


    const isDark =
        document.body.classList.contains("dark");


    let gradient =
        "linear-gradient(135deg, #4facfe, #00f2fe)";


    // Clear
    if (weather.includes("clear")) {

        gradient =
            isDark
                ? "linear-gradient(135deg, #07121f, #102a43)"
                : "linear-gradient(135deg, #4facfe, #00f2fe)";
    }


    // Cloudy
    else if (weather.includes("cloud")) {

        gradient =
            isDark
                ? "linear-gradient(135deg, #475569, #1e293b)"
                : "linear-gradient(135deg, #757F9A, #D7DDE8)";
    }


    // Rain
    else if (weather.includes("rain")) {

        gradient =
            isDark
                ? "linear-gradient(135deg, #1e293b, #334155)"
                : "linear-gradient(135deg, #314755, #26a0da)";
    }


    // Snow
    else if (weather.includes("snow")) {

        gradient =
            isDark
                ? "linear-gradient(135deg, #334155, #64748b)"
                : "linear-gradient(135deg, #E6DADA, #274046)";
    }


    // Thunderstorm
    else if (weather.includes("thunder")) {

        gradient =
            isDark
                ? "linear-gradient(135deg, #111827, #312e81)"
                : "linear-gradient(135deg, #373B44, #4286f4)";
    }


    // Fog
    else if (weather.includes("fog")) {

        gradient =
            isDark
                ? "linear-gradient(135deg, #374151, #111827)"
                : "linear-gradient(135deg, #bdc3c7, #2c3e50)";
    }


    // Apply background
    document.documentElement.style.setProperty(
        "--app-bg",
        gradient
    );


    document.body.style.background =
        gradient;
}

updateCurrentDateTime();
setInterval(
    updateCurrentDateTime,
    1000
);
getWeather("Delhi");