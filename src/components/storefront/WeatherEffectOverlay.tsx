'use client';

import React from 'react';

// Map real OpenWeatherMap descriptions to the 7 weather rows
export const getWeatherCategory = (
  condition: string,
  description: string
): 'cerah' | 'cerah_berawan' | 'berawan' | 'berawan_tebal' | 'gerimis' | 'hujan_ringan' | 'hujan_sedang' => {
  const cond = condition.toLowerCase();
  const desc = description.toLowerCase();

  if (desc.includes('gerimis') || desc.includes('drizzle') || desc.includes('rindu gerimis')) return 'gerimis';
  if (desc.includes('hujan ringan') || desc.includes('light rain') || desc.includes('rindu hujan ringan')) return 'hujan_ringan';
  if (cond.includes('rain') || cond.includes('storm') || desc.includes('hujan')) return 'hujan_sedang';
  if (desc.includes('berawan tebal') || desc.includes('overcast') || desc.includes('kabut') || desc.includes('fog')) return 'berawan_tebal';
  if (desc.includes('cerah berawan') || desc.includes('partly cloudy')) return 'cerah_berawan';
  if (cond.includes('cloud') || desc.includes('berawan')) return 'berawan';
  return 'cerah';
};

export interface WeatherEffectOverlayProps {
  timePeriod: 'pagi' | 'siang' | 'sore' | 'malam';
  category: 'cerah' | 'cerah_berawan' | 'berawan' | 'berawan_tebal' | 'gerimis' | 'hujan_ringan' | 'hujan_sedang';
}

// Animated Weather SVG/CSS Overlay Component
export function WeatherEffectOverlay({
  timePeriod,
  category,
}: WeatherEffectOverlayProps) {
  const isNight = timePeriod === 'malam';

  // Render rain drops falling dynamically
  const renderRain = (count: number, speed: number) => {
    return Array.from({ length: count }).map((_, i) => {
      const left = Math.random() * 100;
      const delay = Math.random() * 2;
      const duration = 0.5 + Math.random() * speed;
      return (
        <div
          key={i}
          className="absolute w-[1.5px] h-3.5 bg-blue-100/40 rounded-full"
          style={{
            left: `${left}%`,
            top: `-20px`,
            animation: `fall-rain ${duration}s linear infinite`,
            animationDelay: `${delay}s`,
          }}
        />
      );
    });
  };

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden select-none pointer-events-none z-10">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes float-cloud-1 {
          0% { transform: translateX(-10px) translateY(0); }
          50% { transform: translateX(10px) translateY(-2px); }
          100% { transform: translateX(-10px) translateY(0); }
        }
        @keyframes float-cloud-2 {
          0% { transform: translateX(15px) translateY(0); }
          50% { transform: translateX(-10px) translateY(1.5px); }
          100% { transform: translateX(15px) translateY(0); }
        }
        @keyframes spin-sun {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes twinkle-star {
          0%, 100% { opacity: 0.2; transform: scale(0.7); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes fall-rain {
          0% { transform: translateY(-10px) rotate(15deg); opacity: 0; }
          40% { opacity: 0.65; }
          100% { transform: translateY(160px) rotate(15deg); opacity: 0; }
        }
        @keyframes flash-lightning {
          0%, 94%, 96%, 98%, 100% { opacity: 0; }
          95%, 97% { opacity: 0.45; }
        }
      `,
        }}
      />

      {/* Lightning Flash effect for heavy rain */}
      {category === 'hujan_sedang' && (
        <div
          className="absolute inset-0 bg-white z-0 pointer-events-none"
          style={{ animation: 'flash-lightning 7s ease-in-out infinite' }}
        />
      )}

      {/* Stars for Night Period */}
      {isNight && (
        <div className="absolute inset-0 z-0">
          {[
            { top: '15%', left: '12%', delay: '0.4s' },
            { top: '22%', left: '28%', delay: '1.1s' },
            { top: '10%', left: '42%', delay: '0.7s' },
            { top: '28%', left: '58%', delay: '1.9s' },
            { top: '12%', left: '72%', delay: '1.4s' },
            { top: '24%', left: '88%', delay: '0.2s' },
          ].map((star, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full shadow-[0_0_3px_#fff]"
              style={{
                top: star.top,
                left: star.left,
                animation: `twinkle-star 2.2s ease-in-out infinite`,
                animationDelay: star.delay,
              }}
            />
          ))}
        </div>
      )}

      {/* Sun/Moon rendering based on Cerah / Partly Cloudy */}
      {(category === 'cerah' || category === 'cerah_berawan') && (
        <div className="absolute top-3 right-6 z-0">
          {isNight ? (
            /* Premium Crescent Moon */
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              className="text-amber-100 drop-shadow-[0_0_8px_rgba(254,240,138,0.55)]"
            >
              <path
                d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                fill="currentColor"
              />
            </svg>
          ) : (
            /* Premium Sun with animation */
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              className={`${
                timePeriod === 'sore'
                  ? 'text-orange-500 drop-shadow-[0_0_12px_rgba(249,115,22,0.6)]'
                  : 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]'
              }`}
              style={{ animation: 'spin-sun 25s linear infinite' }}
            >
              <circle cx="12" cy="12" r="5" fill="currentColor" />
              <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </div>
      )}

      {/* Cloud Layers based on category */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Cerah Berawan (Partly Cloudy) - 1 wispy cloud */}
        {category === 'cerah_berawan' && (
          <svg
            width="55"
            height="32"
            viewBox="0 0 24 16"
            fill="currentColor"
            className="absolute top-4 right-12 text-white/70 drop-shadow-sm"
            style={{ animation: 'float-cloud-1 6s ease-in-out infinite' }}
          >
            <path d="M18 10h-1.26A8 8 0 1 0 9 10H4a4 4 0 0 0 0 8h14a4 4 0 0 0 0-8z" />
          </svg>
        )}

        {/* Berawan (Cloudy) - 2 floating clouds */}
        {category === 'berawan' && (
          <>
            <svg
              width="65"
              height="38"
              viewBox="0 0 24 16"
              fill="currentColor"
              className="absolute top-3 left-10 text-white/75 drop-shadow-sm"
              style={{ animation: 'float-cloud-1 7.5s ease-in-out infinite' }}
            >
              <path d="M18 10h-1.26A8 8 0 1 0 9 10H4a4 4 0 0 0 0 8h14a4 4 0 0 0 0-8z" />
            </svg>
            <svg
              width="55"
              height="32"
              viewBox="0 0 24 16"
              fill="currentColor"
              className="absolute top-4 right-8 text-white/70 drop-shadow-sm"
              style={{ animation: 'float-cloud-2 5.5s ease-in-out infinite' }}
            >
              <path d="M18 10h-1.26A8 8 0 1 0 9 10H4a4 4 0 0 0 0 8h14a4 4 0 0 0 0-8z" />
            </svg>
          </>
        )}

        {/* Berawan Tebal (Overcast) - Multiple overlapping greyish clouds */}
        {category === 'berawan_tebal' && (
          <>
            <svg
              width="85"
              height="48"
              viewBox="0 0 24 16"
              fill="currentColor"
              className="absolute top-1 left-6 text-neutral-300/80 drop-shadow-md"
              style={{ animation: 'float-cloud-1 9s ease-in-out infinite' }}
            >
              <path d="M18 10h-1.26A8 8 0 1 0 9 10H4a4 4 0 0 0 0 8h14a4 4 0 0 0 0-8z" />
            </svg>
            <svg
              width="75"
              height="42"
              viewBox="0 0 24 16"
              fill="currentColor"
              className="absolute top-2 right-4 text-neutral-400/70 drop-shadow-md"
              style={{ animation: 'float-cloud-2 7.2s ease-in-out infinite' }}
            >
              <path d="M18 10h-1.26A8 8 0 1 0 9 10H4a4 4 0 0 0 0 8h14a4 4 0 0 0 0-8z" />
            </svg>
            <svg
              width="65"
              height="38"
              viewBox="0 0 24 16"
              fill="currentColor"
              className="absolute top-3 left-1/3 text-neutral-200/85 drop-shadow-sm"
              style={{ animation: 'float-cloud-1 6.5s ease-in-out infinite', animationDelay: '0.8s' }}
            >
              <path d="M18 10h-1.26A8 8 0 1 0 9 10H4a4 4 0 0 0 0 8h14a4 4 0 0 0 0-8z" />
            </svg>
          </>
        )}

        {/* Gerimis / Hujan Ringan / Hujan Sedang Clouds */}
        {['gerimis', 'hujan_ringan', 'hujan_sedang'].includes(category) && (
          <>
            <svg
              width="85"
              height="48"
              viewBox="0 0 24 16"
              fill="currentColor"
              className={`absolute top-1 left-6 drop-shadow-md ${
                category === 'hujan_sedang' ? 'text-neutral-500/75' : 'text-neutral-400/75'
              }`}
              style={{ animation: 'float-cloud-1 8s ease-in-out infinite' }}
            >
              <path d="M18 10h-1.26A8 8 0 1 0 9 10H4a4 4 0 0 0 0 8h14a4 4 0 0 0 0-8z" />
            </svg>
            <svg
              width="75"
              height="42"
              viewBox="0 0 24 16"
              fill="currentColor"
              className={`absolute top-2 right-4 drop-shadow-md ${
                category === 'hujan_sedang' ? 'text-neutral-600/70' : 'text-neutral-500/65'
              }`}
              style={{ animation: 'float-cloud-2 6.2s ease-in-out infinite' }}
            >
              <path d="M18 10h-1.26A8 8 0 1 0 9 10H4a4 4 0 0 0 0 8h14a4 4 0 0 0 0-8z" />
            </svg>
          </>
        )}
      </div>

      {/* Falling raindrops overlays */}
      {category === 'gerimis' && renderRain(15, 0.75)}
      {category === 'hujan_ringan' && renderRain(26, 0.45)}
      {category === 'hujan_sedang' && renderRain(42, 0.28)}
    </div>
  );
}

export default WeatherEffectOverlay;
