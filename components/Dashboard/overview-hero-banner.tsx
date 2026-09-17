'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, CloudSun, Sun, Moon, CloudRain, CloudLightning, 
  Wind, Droplets, MapPin, RefreshCw, Copy, Check, Compass, Thermometer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WeatherData } from '@/lib/weather';

interface OverviewHeroBannerProps {
  userName: string;
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const CACHE_KEY = 'lucas_ai_motivational_cache';

export function OverviewHeroBanner({ userName }: OverviewHeroBannerProps) {
  // Estado de Meteorologia
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [locPermission, setLocPermission] = useState<'pending' | 'granted' | 'denied'>('pending');

  // Estado da Mensagem Gemini
  const [quote, setQuote] = useState<string>('');
  const [greeting, setGreeting] = useState<string>('Bom dia');
  const [loadingQuote, setLoadingQuote] = useState(true);
  const [copied, setCopied] = useState(false);
  const [nextRefreshTime, setNextRefreshTime] = useState<string>('');

  // 1. Carregar Meteorologia
  const loadWeather = useCallback(async (lat?: number, lon?: number) => {
    setLoadingWeather(true);
    try {
      const url = lat && lon 
        ? `/api/weather?lat=${lat}&lon=${lon}` 
        : `/api/weather`;
      const res = await fetch(url);
      if (res.ok) {
        const data: WeatherData = await res.json();
        setWeather(data);
      }
    } catch (err) {
      console.error('Falha ao carregar clima:', err);
    } finally {
      setLoadingWeather(false);
    }
  }, []);

  // Detectar Geolocalização
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocPermission('granted');
          loadWeather(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.warn('Geolocalização não concedida, usando fallback:', error.message);
          setLocPermission('denied');
          loadWeather(); // Fallback para São Paulo
        },
        { timeout: 8000 }
      );
    } else {
      loadWeather();
    }
  }, [loadWeather]);

  // 2. Carregar Mensagem Gemini (com regra de 2 horas)
  const fetchGeminiQuote = useCallback(async (force = false) => {
    setLoadingQuote(true);
    try {
      // Verificar cache local
      if (!force && typeof window !== 'undefined') {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            const age = Date.now() - parsed.timestamp;
            if (age < TWO_HOURS_MS) {
              setQuote(parsed.quote);
              setGreeting(parsed.saudacao || 'Bom dia');
              const remainingMinutes = Math.round((TWO_HOURS_MS - age) / 60000);
              setNextRefreshTime(`${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m`);
              setLoadingQuote(false);
              return;
            }
          } catch (e) {
            console.error('Erro ao ler cache do Gemini:', e);
          }
        }
      }

      // Buscar nova mensagem da API
      const res = await fetch('/api/gemini/motivation');
      if (res.ok) {
        const data = await res.json();
        setQuote(data.quote);
        setGreeting(data.saudacao || 'Bom dia');
        setNextRefreshTime('2h 00m');

        if (typeof window !== 'undefined') {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              quote: data.quote,
              saudacao: data.saudacao,
              timestamp: Date.now(),
            })
          );
        }
      }
    } catch (err) {
      console.error('Erro ao buscar mensagem do Gemini:', err);
      setQuote(
        'Grandes conquistas são construídas na consistência dos atendimentos de hoje. Mantenha a clareza e avance com propósito.'
      );
    } finally {
      setLoadingQuote(false);
    }
  }, []);

  // Efeito para buscar no acesso inicial e verificar o timer de 2 horas
  useEffect(() => {
    fetchGeminiQuote(false);

    // Verificar a cada 5 minutos se já passaram 2 horas de sessão
    const interval = setInterval(() => {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          const age = Date.now() - parsed.timestamp;
          if (age >= TWO_HOURS_MS) {
            fetchGeminiQuote(true);
          } else {
            const remainingMinutes = Math.round((TWO_HOURS_MS - age) / 60000);
            setNextRefreshTime(`${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m`);
          }
        }
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchGeminiQuote]);

  // Copiar reflexão
  const handleCopyQuote = () => {
    if (!quote) return;
    navigator.clipboard.writeText(`"${quote}" — Lucas.ai`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Ícone climático dinâmico
  const renderWeatherIcon = () => {
    if (!weather) return <CloudSun className="h-9 w-9 text-amber-500 animate-pulse" />;
    switch (weather.iconType) {
      case 'sun':
        return <Sun className="h-10 w-10 text-amber-500 animate-[spin_16s_linear_infinite]" />;
      case 'moon':
        return <Moon className="h-9 w-9 text-indigo-400" />;
      case 'rain':
        return <CloudRain className="h-9 w-9 text-blue-400 animate-bounce" />;
      case 'thunder':
        return <CloudLightning className="h-9 w-9 text-purple-400 animate-pulse" />;
      default:
        return <CloudSun className="h-10 w-10 text-amber-500" />;
    }
  };

  return (
    <div className="relative rounded-3xl overflow-hidden glass-panel border border-slate-200/80 dark:border-slate-800/80 p-6 md:p-8 shadow-xl">
      {/* Luzes de Fundo Ambientais (Glow Orbs) */}
      <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 rounded-full bg-linear-to-br from-blue-500/15 via-indigo-500/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-16 w-72 h-72 rounded-full bg-linear-to-tr from-cyan-500/10 via-purple-500/10 to-transparent blur-3xl pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* Bloco 1: Boas-vindas e Mensagem Gemini AI (7 colunas) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Header com Saudação e Badge */}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {greeting}, <span className="shimmer-text">{userName}</span>
            </h1>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 shadow-2xs">
              <Sparkles className="h-3.5 w-3.5 text-blue-500 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Lucas.ai Intelligence</span>
            </div>
          </div>

          {/* Citação Motivacional do Gemini */}
          <div className="relative p-4 md:p-5 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800/70 backdrop-blur-md transition-all">
            <AnimatePresence mode="wait">
              {loadingQuote ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 py-2 text-sm text-slate-500 dark:text-slate-400"
                >
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                  <span>Consultando inteligência estratégica para o seu dia...</span>
                </motion.div>
              ) : (
                <motion.div
                  key={quote}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-2"
                >
                  <p className="text-sm md:text-base text-slate-700 dark:text-slate-200 font-medium leading-relaxed italic">
                    "{quote}"
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      Renovação a cada 2h • Próxima em: <strong className="text-slate-700 dark:text-slate-300">{nextRefreshTime || '2h'}</strong>
                    </span>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyQuote}
                        className="h-7 px-2 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        title="Copiar citação"
                      >
                        {copied ? <Check className="h-3 w-3 text-emerald-500 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                        {copied ? 'Copiado' : 'Copiar'}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchGeminiQuote(true)}
                        disabled={loadingQuote}
                        className="h-7 px-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                        title="Gerar nova reflexão agora"
                      >
                        <RefreshCw className={cn("h-3 w-3 mr-1", loadingQuote && "animate-spin")} />
                        Inspirar
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bloco 2: Clima em Tempo Real no Brasil (4 colunas) */}
        <div className="lg:col-span-4">
          <div className="rounded-2xl p-4 md:p-5 bg-linear-to-br from-slate-50/80 to-blue-50/40 dark:from-slate-900/80 dark:to-blue-950/30 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md shadow-sm">
            
            {/* Topo do Card de Clima */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <MapPin className="h-3.5 w-3.5 text-blue-500" />
                <span className="truncate max-w-[170px]">
                  {weather ? `${weather.city}, ${weather.state}` : 'Localizando...'}
                </span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => loadWeather()}
                disabled={loadingWeather}
                className="h-6 w-6 text-slate-400 hover:text-blue-600"
                title="Atualizar clima"
              >
                <RefreshCw className={cn("h-3 w-3", loadingWeather && "animate-spin")} />
              </Button>
            </div>

            {/* Conteúdo Central do Clima */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 shadow-xs border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center">
                  {renderWeatherIcon()}
                </div>
                <div>
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-baseline">
                    {weather ? weather.temperature : '--'}
                    <span className="text-lg font-semibold text-blue-600 dark:text-blue-400 ml-0.5">°C</span>
                  </div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {weather ? weather.condition : 'Carregando...'}
                  </p>
                </div>
              </div>

              {/* Sensação Térmica */}
              {weather && (
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Sensação</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {weather.apparentTemperature}°C
                  </span>
                </div>
              )}
            </div>

            {/* Rodapé do Clima: Umidade e Vento */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 text-xs">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Droplets className="h-3.5 w-3.5 text-cyan-500" />
                <span>Umidade: <strong className="text-slate-700 dark:text-slate-300">{weather?.humidity ?? '--'}%</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 justify-end">
                <Wind className="h-3.5 w-3.5 text-indigo-400" />
                <span>Vento: <strong className="text-slate-700 dark:text-slate-300">{weather?.windSpeed ?? '--'} km/h</strong></span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
