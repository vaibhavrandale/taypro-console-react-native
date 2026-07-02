import { SiteWeather } from '../types/siteDetails';

export type WeatherCondition =
  | 'sunny'
  | 'cloudy'
  | 'rainy'
  | 'stormy'
  | 'foggy'
  | 'unknown';

export function getWeatherCondition(weather: SiteWeather): WeatherCondition {
  const text = `${weather.description ?? ''} ${weather.weather_description ?? ''}`
    .toLowerCase()
    .trim();

  if (weather.is_rain) {
    return text.includes('thunder') || text.includes('storm') ? 'stormy' : 'rainy';
  }

  if (
    text.includes('thunder') ||
    text.includes('storm') ||
    text.includes('lightning')
  ) {
    return 'stormy';
  }

  if (
    text.includes('rain') ||
    text.includes('drizzle') ||
    text.includes('shower')
  ) {
    return 'rainy';
  }

  if (text.includes('fog') || text.includes('mist') || text.includes('haze')) {
    return 'foggy';
  }

  if (
    text.includes('cloud') ||
    text.includes('overcast') ||
    (weather.cloudiness != null && weather.cloudiness >= 60)
  ) {
    return 'cloudy';
  }

  if (
    text.includes('clear') ||
    text.includes('sun') ||
    (weather.cloudiness != null && weather.cloudiness < 30)
  ) {
    return 'sunny';
  }

  if (weather.cloudiness != null && weather.cloudiness >= 30) {
    return 'cloudy';
  }

  return 'unknown';
}

export function getWeatherLabel(condition: WeatherCondition, weather: SiteWeather) {
  if (weather.weather_description) return weather.weather_description;
  if (weather.description) return weather.description;

  switch (condition) {
    case 'sunny':
      return 'Sunny';
    case 'cloudy':
      return 'Cloudy';
    case 'rainy':
      return 'Rainy';
    case 'stormy':
      return 'Stormy';
    case 'foggy':
      return 'Foggy';
    default:
      return 'Weather';
  }
}
