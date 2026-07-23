# WeatherView

WeatherView is a lightweight browser weather app that shows a **5-day forecast** using the Open-Meteo APIs.  
It supports city search, local geolocation fallback, unit switching (C/F), theme switching (light/dark), and short-term forecast caching.

## Features

- 5-day daily forecast cards (summary, temperatures, precipitation, wind)
- City lookup with geocoding and helpful error states
- Automatic initial location detection with fallback to San Diego
- Celsius/Fahrenheit toggle persisted in `localStorage`
- Light/dark theme toggle persisted in `localStorage`
- In-memory + `localStorage` forecast cache (15-minute TTL)
- Unit tests for API normalization, URL building, weather mapping, and preferences helpers

## Project structure

- `index.html` - app shell and controls
- `app.js` - UI behavior, state management, rendering, and caching
- `weather-api.js` - Open-Meteo API calls and payload normalization
- `weather-maps.js` - weather code to label/icon mapping
- `preferences.js` - theme and unit preference utilities
- `styles.css` - app styling
- `tests/weather.spec.js` - Node test suite

## Run tests

```bash
npm test
```

## Data sources

- Forecast API: `https://api.open-meteo.com/v1/forecast`
- Geocoding API: `https://geocoding-api.open-meteo.com/v1/search`
