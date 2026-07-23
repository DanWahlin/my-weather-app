import { fetchForecast, searchCity, WeatherApiError } from "./weather-api.js";
import {
  getInitialTheme,
  getInitialUnit,
  getNextTheme,
  getNextUnit,
  getUnitSymbol
} from "./preferences.js";

const STORAGE_KEYS = {
  theme: "weatherview:theme",
  unit: "weatherview:unit",
  forecastPrefix: "weatherview:forecast"
};
const FORECAST_CACHE_TTL_MS = 1000 * 60 * 15;

const FALLBACK_LOCATION = {
  city: "San Diego",
  region: "California",
  latitude: 32.7157,
  longitude: -117.1611
};

const memoryCache = new Map();

const elements = {
  root: document.documentElement,
  main: document.querySelector(".app-main"),
  cityForm: document.getElementById("city-form"),
  cityInput: document.getElementById("city-input"),
  unitToggle: document.getElementById("unit-toggle"),
  themeToggle: document.getElementById("theme-toggle"),
  locationLabel: document.getElementById("location-label"),
  statusMessage: document.getElementById("status-message"),
  retryButton: document.getElementById("retry-button"),
  forecastGrid: document.getElementById("forecast-grid")
};

const state = {
  theme: getInitialTheme(
    localStorage.getItem(STORAGE_KEYS.theme),
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ),
  unit: getInitialUnit(localStorage.getItem(STORAGE_KEYS.unit)),
  location: { ...FALLBACK_LOCATION },
  lastAction: null,
  activeRequestController: null
};

init();

async function init() {
  applyTheme();
  syncThemeToggle();
  syncUnitToggle();
  bindEvents();
  await loadInitialForecast();
}

function bindEvents() {
  elements.themeToggle.addEventListener("click", async () => {
    state.theme = getNextTheme(state.theme);
    localStorage.setItem(STORAGE_KEYS.theme, state.theme);
    applyTheme();
    syncThemeToggle();
  });

  elements.unitToggle.addEventListener("click", async () => {
    state.unit = getNextUnit(state.unit);
    localStorage.setItem(STORAGE_KEYS.unit, state.unit);
    syncUnitToggle();
    await loadForecastForLocation(state.location);
  });

  elements.cityForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const city = elements.cityInput.value.trim();
    if (!city) {
      setStatus("Enter a city name to search.", "error");
      return;
    }
    await loadForecastForCity(city);
  });

  elements.retryButton.addEventListener("click", async () => {
    if (state.lastAction?.kind === "city") {
      await loadForecastForCity(state.lastAction.city);
      return;
    }

    await loadForecastForLocation(state.location);
  });
}

async function loadInitialForecast() {
  setLoadingState("Getting your local forecast...");
  try {
    const location = await resolveInitialLocation();
    state.location = location;
    await loadForecastForLocation(location);
  } catch {
    await loadForecastForLocation(FALLBACK_LOCATION);
  }
}

async function resolveInitialLocation() {
  if (!("geolocation" in navigator)) {
    return { ...FALLBACK_LOCATION };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          city: "Your location",
          region: "",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      () => resolve({ ...FALLBACK_LOCATION }),
      { timeout: 7000, maximumAge: 1000 * 60 * 10 }
    );
  });
}

async function loadForecastForCity(city) {
  state.lastAction = { kind: "city", city };
  setLoadingState(`Finding ${city || "city"}...`);
  hideRetry();

  try {
    const location = await searchCity(city);
    state.location = location;
    await loadForecastForLocation(location);
  } catch (error) {
    handleError(error);
  }
}

async function loadForecastForLocation(location) {
  if (state.activeRequestController) {
    state.activeRequestController.abort();
  }
  state.activeRequestController = new AbortController();
  const signal = state.activeRequestController.signal;

  state.lastAction = { kind: "coords" };
  setLoadingState("Loading 5-day forecast...");
  hideRetry();
  setLocationLabel(location);

  const cacheKey = getCacheKey(location, state.unit);
  const cached = getCachedForecast(cacheKey);
  if (cached) {
    renderForecast(cached);
    setStatus("Forecast updated from cache.");
    return;
  }

  try {
    const forecast = await fetchForecast({
      latitude: location.latitude,
      longitude: location.longitude,
      unit: state.unit
    }, fetch, { signal });
    setCachedForecast(cacheKey, forecast);
    renderForecast(forecast);
    setStatus("Forecast updated.");
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }
    handleError(error);
  }
}

function renderForecast(forecast) {
  elements.main.setAttribute("aria-busy", "false");
  const unitSymbol = getUnitSymbol(forecast.unit);

  const cards = forecast.days
    .map((day) => {
      const date = formatDate(day.date);
      const tempSummary = `${Math.round(day.minTemp)}${unitSymbol} - ${Math.round(day.maxTemp)}${unitSymbol}`;
      return `
      <article class="weather-card">
        <header>
          <h3>${date.dayName}</h3>
          <p class="location-label">${date.formatted}</p>
        </header>
        <p class="weather-meta">
          <span class="weather-icon" aria-hidden="true">${day.icon}</span>
          <span>${day.summary}</span>
        </p>
        <ul class="weather-list">
          <li><span class="label">Temperature</span><span>${tempSummary}</span></li>
          <li><span class="label">Precipitation</span><span>${Math.round(day.precipitationProbability)}%</span></li>
          <li><span class="label">Wind</span><span>${formatWindSpeed(day.windSpeed, forecast.unit)}</span></li>
        </ul>
      </article>
    `;
    })
    .join("");

  elements.forecastGrid.innerHTML = cards;
}

function setLocationLabel(location) {
  const segments = [location.city, location.region].filter(Boolean);
  elements.locationLabel.textContent = segments.join(", ");
}

function applyTheme() {
  elements.root.dataset.theme = state.theme;
}

function syncUnitToggle() {
  const isCelsius = state.unit === "celsius";
  elements.unitToggle.setAttribute("aria-pressed", String(!isCelsius));
  elements.unitToggle.querySelector('[aria-hidden="true"]').textContent = isCelsius ? "°C" : "°F";
  elements.unitToggle.querySelector(".sr-only").textContent = isCelsius
    ? "Switch to Fahrenheit"
    : "Switch to Celsius";
}

function syncThemeToggle() {
  const isDark = state.theme === "dark";
  elements.themeToggle.setAttribute("aria-pressed", String(isDark));
  elements.themeToggle.querySelector('[aria-hidden="true"]').textContent = isDark ? "Dark" : "Light";
  elements.themeToggle.querySelector(".sr-only").textContent = isDark
    ? "Switch to light theme"
    : "Switch to dark theme";
}

function setLoadingState(message) {
  elements.main.setAttribute("aria-busy", "true");
  setStatus(message);
}

function setStatus(message, tone = "normal") {
  elements.statusMessage.textContent = message;
  if (tone === "error") {
    elements.statusMessage.dataset.tone = "error";
  } else {
    delete elements.statusMessage.dataset.tone;
  }
}

function showRetry() {
  elements.retryButton.hidden = false;
}

function hideRetry() {
  elements.retryButton.hidden = true;
}

function handleError(error) {
  elements.main.setAttribute("aria-busy", "false");
  if (error instanceof WeatherApiError) {
    setStatus(error.message, "error");
  } else {
    setStatus("Something went wrong while loading weather data.", "error");
  }
  showRetry();
}

function formatDate(value) {
  const date = new Date(`${value}T12:00:00`);
  const dayName = date.toLocaleDateString(undefined, { weekday: "long" });
  const formatted = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return { dayName, formatted };
}

function formatWindSpeed(windKmh, unit) {
  if (unit === "fahrenheit") {
    return `${Math.round(windKmh * 0.621371)} mph`;
  }
  return `${Math.round(windKmh)} km/h`;
}

function getCacheKey(location, unit) {
  return `${STORAGE_KEYS.forecastPrefix}:${location.latitude.toFixed(3)}:${location.longitude.toFixed(3)}:${unit}`;
}

function getCachedForecast(key) {
  if (memoryCache.has(key)) {
    const entry = memoryCache.get(key);
    if (Date.now() - entry.savedAt <= FORECAST_CACHE_TTL_MS) {
      return entry.forecast;
    }
    memoryCache.delete(key);
    localStorage.removeItem(key);
    return null;
  }

  const raw = localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    const hasValidForecast = Array.isArray(parsed?.forecast?.days) && parsed.forecast.days.length === 5;
    const isFresh = Number.isFinite(parsed?.savedAt) && Date.now() - parsed.savedAt <= FORECAST_CACHE_TTL_MS;
    if (!hasValidForecast || !isFresh) {
      localStorage.removeItem(key);
      return null;
    }
    memoryCache.set(key, parsed);
    return parsed.forecast;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function setCachedForecast(key, forecast) {
  const entry = {
    savedAt: Date.now(),
    forecast
  };
  memoryCache.set(key, entry);
  localStorage.setItem(key, JSON.stringify(entry));
}
