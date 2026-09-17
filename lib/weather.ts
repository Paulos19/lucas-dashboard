export interface WeatherData {
  city: string;
  state: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  isDay: boolean;
  weatherCode: number;
  iconType: 'sun' | 'moon' | 'cloud-sun' | 'cloud-moon' | 'cloud' | 'rain' | 'thunder' | 'fog';
}

export function translateWeatherCode(code: number, isDay: boolean): { condition: string; iconType: WeatherData['iconType'] } {
  switch (code) {
    case 0:
      return { condition: isDay ? 'Céu Limpo' : 'Noite Limpa', iconType: isDay ? 'sun' : 'moon' };
    case 1:
    case 2:
      return { condition: isDay ? 'Poucas Nuvens' : 'Parcialmente Nublado', iconType: isDay ? 'cloud-sun' : 'cloud-moon' };
    case 3:
      return { condition: 'Encoberto', iconType: 'cloud' };
    case 45:
    case 48:
      return { condition: 'Nevoeiro', iconType: 'fog' };
    case 51:
    case 53:
    case 55:
      return { condition: 'Garoa Leve', iconType: 'rain' };
    case 61:
    case 63:
      return { condition: 'Chuva Moderada', iconType: 'rain' };
    case 65:
      return { condition: 'Chuva Forte', iconType: 'rain' };
    case 80:
    case 81:
    case 82:
      return { condition: 'Pancadas de Chuva', iconType: 'rain' };
    case 95:
    case 96:
    case 99:
      return { condition: 'Tempestade com Trovões', iconType: 'thunder' };
    default:
      return { condition: 'Estável', iconType: isDay ? 'sun' : 'moon' };
  }
}

export async function fetchWeatherData(lat: number, lon: number): Promise<WeatherData> {
  // 1. Obter clima em tempo real
  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&timezone=America%2FSao_Paulo`,
    { next: { revalidate: 900 } } // Cache de 15 minutos
  );

  if (!weatherRes.ok) {
    throw new Error('Falha ao obter dados meteorológicos');
  }

  const weatherJson = await weatherRes.json();
  const current = weatherJson.current;
  const isDay = Boolean(current.is_day);
  const { condition, iconType } = translateWeatherCode(current.weather_code, isDay);

  // 2. Obter cidade/estado por Geocodificação reversa
  let city = 'São Paulo';
  let state = 'SP';

  try {
    const geoRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`,
      { next: { revalidate: 3600 } }
    );
    if (geoRes.ok) {
      const geoJson = await geoRes.json();
      city = geoJson.city || geoJson.locality || geoJson.principalSubdivision || 'Sua Região';
      const subCode = geoJson.principalSubdivisionCode || '';
      state = subCode.replace('BR-', '') || geoJson.countryCode || 'BR';
    }
  } catch (err) {
    console.warn('Erro ao obter nome da localidade:', err);
  }

  return {
    city,
    state,
    temperature: Math.round(current.temperature_2m),
    apparentTemperature: Math.round(current.apparent_temperature),
    humidity: Math.round(current.relative_humidity_2m),
    windSpeed: Math.round(current.wind_speed_10m),
    condition,
    isDay,
    weatherCode: current.weather_code,
    iconType,
  };
}
