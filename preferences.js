export function getInitialTheme(storedTheme, prefersDark) {
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }
  return prefersDark ? "dark" : "light";
}

export function getInitialUnit(storedUnit) {
  if (storedUnit === "celsius" || storedUnit === "fahrenheit") {
    return storedUnit;
  }
  return "celsius";
}

export function getNextTheme(currentTheme) {
  return currentTheme === "dark" ? "light" : "dark";
}

export function getNextUnit(currentUnit) {
  return currentUnit === "celsius" ? "fahrenheit" : "celsius";
}

export function getUnitSymbol(unit) {
  return unit === "fahrenheit" ? "°F" : "°C";
}
