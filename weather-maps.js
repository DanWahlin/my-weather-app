const WEATHER_GROUPS = [
  { codes: [0], label: "Clear sky", icon: "☀️" },
  { codes: [1, 2], label: "Partly cloudy", icon: "⛅" },
  { codes: [3], label: "Overcast", icon: "☁️" },
  { codes: [45, 48], label: "Fog", icon: "🌫️" },
  { codes: [51, 53, 55], label: "Drizzle", icon: "🌦️" },
  { codes: [56, 57], label: "Freezing drizzle", icon: "🌧️" },
  { codes: [61, 63, 65], label: "Rain", icon: "🌧️" },
  { codes: [66, 67], label: "Freezing rain", icon: "🌧️" },
  { codes: [71, 73, 75, 77], label: "Snow", icon: "❄️" },
  { codes: [80, 81, 82], label: "Rain showers", icon: "🌦️" },
  { codes: [85, 86], label: "Snow showers", icon: "🌨️" },
  { codes: [95], label: "Thunderstorm", icon: "⛈️" },
  { codes: [96, 99], label: "Thunderstorm with hail", icon: "⛈️" }
];

const DEFAULT_WEATHER = { label: "Unknown conditions", icon: "🌡️" };

export function getWeatherPresentation(code) {
  const safeCode = Number(code);
  if (!Number.isFinite(safeCode)) {
    return DEFAULT_WEATHER;
  }

  for (const group of WEATHER_GROUPS) {
    if (group.codes.includes(safeCode)) {
      return { label: group.label, icon: group.icon };
    }
  }

  return DEFAULT_WEATHER;
}
