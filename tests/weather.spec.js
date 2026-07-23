import test from "node:test";
import assert from "node:assert/strict";
import { buildForecastUrl, normalizeForecastPayload, WeatherApiError } from "../weather-api.js";
import { getWeatherPresentation } from "../weather-maps.js";
import {
  getInitialTheme,
  getInitialUnit,
  getNextTheme,
  getNextUnit,
  getUnitSymbol
} from "../preferences.js";

const mockPayload = {
  latitude: 47.6,
  longitude: -122.3,
  timezone: "America/Los_Angeles",
  daily: {
    time: ["2026-07-23", "2026-07-24", "2026-07-25", "2026-07-26", "2026-07-27"],
    weather_code: [0, 1, 3, 61, 95],
    temperature_2m_max: [24, 25, 23, 21, 20],
    temperature_2m_min: [14, 15, 13, 12, 11],
    precipitation_probability_max: [5, 12, 20, 45, 60],
    wind_speed_10m_max: [9, 12, 11, 14, 17]
  }
};

test("buildForecastUrl includes expected query values", () => {
  const url = buildForecastUrl({ latitude: 47.6, longitude: -122.3, unit: "fahrenheit" });
  assert.match(url, /latitude=47.6/);
  assert.match(url, /longitude=-122.3/);
  assert.match(url, /forecast_days=5/);
  assert.match(url, /temperature_unit=fahrenheit/);
});

test("normalizeForecastPayload maps forecast into five normalized days", () => {
  const result = normalizeForecastPayload(mockPayload, "celsius");
  assert.equal(result.days.length, 5);
  assert.equal(result.days[0].summary, "Clear sky");
  assert.equal(result.days[0].icon, "☀️");
  assert.equal(result.unit, "celsius");
});

test("normalizeForecastPayload throws when required arrays are incomplete", () => {
  const broken = {
    ...mockPayload,
    daily: { ...mockPayload.daily, weather_code: [0, 1] }
  };

  assert.throws(
    () => normalizeForecastPayload(broken, "celsius"),
    (error) => error instanceof WeatherApiError && error.code === "INVALID_PAYLOAD"
  );
});

test("weather code mapping returns fallback for unknown code", () => {
  assert.deepEqual(getWeatherPresentation(999), { label: "Unknown conditions", icon: "🌡️" });
});

test("theme and unit preference helpers return expected values", () => {
  assert.equal(getInitialTheme(null, true), "dark");
  assert.equal(getInitialTheme("light", true), "light");
  assert.equal(getInitialUnit("bad"), "celsius");
  assert.equal(getNextTheme("dark"), "light");
  assert.equal(getNextUnit("celsius"), "fahrenheit");
  assert.equal(getUnitSymbol("fahrenheit"), "°F");
});
