import { getWeatherPresentation } from "./weather-maps.js";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const DAILY_FIELDS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_probability_max",
  "wind_speed_10m_max"
];

export class WeatherApiError extends Error {
  constructor(code, message, cause) {
    super(message);
    this.name = "WeatherApiError";
    this.code = code;
    this.cause = cause;
  }
}

export function buildForecastUrl({ latitude, longitude, unit }) {
  const safeUnit = unit === "fahrenheit" ? "fahrenheit" : "celsius";
  const searchParams = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: DAILY_FIELDS.join(","),
    timezone: "auto",
    forecast_days: "5",
    temperature_unit: safeUnit,
    wind_speed_unit: "kmh"
  });
  return `${FORECAST_URL}?${searchParams.toString()}`;
}

export async function searchCity(city, fetchImpl = fetch, options = {}) {
  const query = String(city || "").trim();
  if (!query) {
    throw new WeatherApiError("INVALID_CITY", "Enter a city name.");
  }

  const url = `${GEOCODE_URL}?${new URLSearchParams({
    name: query,
    count: "1",
    language: "en",
    format: "json"
  })}`;

  let response;
  try {
    response = await fetchImpl(url, { signal: options.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }
    throw new WeatherApiError("NETWORK", "Unable to reach city search service.", error);
  }

  if (!response.ok) {
    throw new WeatherApiError("HTTP", "City search is temporarily unavailable.");
  }

  const payload = await response.json();
  const result = payload?.results?.[0];
  if (!Number.isFinite(result?.latitude) || !Number.isFinite(result?.longitude)) {
    throw new WeatherApiError("CITY_NOT_FOUND", "City not found. Try a different name.");
  }

  return {
    latitude: result.latitude,
    longitude: result.longitude,
    city: result.name,
    region: result.admin1 ?? result.country ?? ""
  };
}

export async function fetchForecast({ latitude, longitude, unit }, fetchImpl = fetch, options = {}) {
  const url = buildForecastUrl({ latitude, longitude, unit });
  let response;

  try {
    response = await fetchImpl(url, { signal: options.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }
    throw new WeatherApiError("NETWORK", "Unable to reach weather service.", error);
  }

  if (!response.ok) {
    throw new WeatherApiError("HTTP", "Weather service returned an unexpected response.");
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new WeatherApiError("PARSE", "Weather data could not be read.", error);
  }

  return normalizeForecastPayload(payload, unit);
}

function getRequiredArray(daily, fieldName) {
  const value = daily?.[fieldName];
  if (!Array.isArray(value) || value.length < 5) {
    throw new WeatherApiError("INVALID_PAYLOAD", "Incomplete forecast data returned from API.");
  }
  return value;
}

export function normalizeForecastPayload(payload, unit) {
  const daily = payload?.daily;
  const time = getRequiredArray(daily, "time");
  const weatherCode = getRequiredArray(daily, "weather_code");
  const maxTemp = getRequiredArray(daily, "temperature_2m_max");
  const minTemp = getRequiredArray(daily, "temperature_2m_min");
  const precipitation = getRequiredArray(daily, "precipitation_probability_max");
  const wind = getRequiredArray(daily, "wind_speed_10m_max");

  const days = time.slice(0, 5).map((date, index) => {
    const presentation = getWeatherPresentation(weatherCode[index]);
    return {
      date,
      weatherCode: Number(weatherCode[index]),
      summary: presentation.label,
      icon: presentation.icon,
      maxTemp: Number(maxTemp[index]),
      minTemp: Number(minTemp[index]),
      precipitationProbability: Number(precipitation[index]),
      windSpeed: Number(wind[index])
    };
  });

  for (const day of days) {
    const values = [
      day.maxTemp,
      day.minTemp,
      day.precipitationProbability,
      day.windSpeed,
      day.weatherCode
    ];

    if (values.some((value) => !Number.isFinite(value))) {
      throw new WeatherApiError("INVALID_PAYLOAD", "Malformed forecast values received.");
    }
  }

  return {
    latitude: Number(payload?.latitude),
    longitude: Number(payload?.longitude),
    timezone: String(payload?.timezone || "UTC"),
    unit,
    days
  };
}
