'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface PromoCountdownProps {
  endDate: string;
  onExpire?: () => void;
  className?: string;
  compact?: boolean;
}

export function PromoCountdown({ endDate, onExpire, className = '', compact = false }: PromoCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(endDate) - +new Date();
      
      if (difference <= 0) {
        setTimeLeft('Expired');
        setIsExpired(true);
        if (onExpire) onExpire();
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      const pad = (num: number) => num.toString().padStart(2, '0');

      if (days > 0) {
        setTimeLeft(`${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
      } else {
        setTimeLeft(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endDate, onExpire]);

  if (isExpired) return null;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500 text-white text-[8px] font-black tracking-wider uppercase ${className}`}>
        <Clock className="w-2.5 h-2.5 animate-pulse" />
        {timeLeft}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-600/90 text-white text-[10px] font-extrabold tracking-wider uppercase shadow-sm backdrop-blur-sm ${className}`}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
      </span>
      <Clock className="w-3.5 h-3.5" />
      <span>Ends in: {timeLeft}</span>
    </div>
  );
}
