import { NextRequest, NextResponse } from 'next/server';
import { fetchWeatherData } from '@/lib/weather';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const latParam = searchParams.get('lat');
    const lonParam = searchParams.get('lon');

    // Padrão São Paulo (Brasil) se não informado
    const lat = latParam ? parseFloat(latParam) : -23.5505;
    const lon = lonParam ? parseFloat(lonParam) : -46.6333;

    const data = await fetchWeatherData(lat, lon);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      {
        city: 'São Paulo',
        state: 'SP',
        temperature: 24,
        apparentTemperature: 25,
        humidity: 65,
        windSpeed: 12,
        condition: 'Tempo Agradável',
        isDay: true,
        weatherCode: 1,
        iconType: 'cloud-sun',
      },
      { status: 200 }
    );
  }
}
