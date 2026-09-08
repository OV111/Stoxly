'use client';

import { useState, useEffect } from 'react';

type MarketStatus = 'open' | 'closed' | 'pre-market' | 'after-hours';


export function useMarketStatus() {
  const [status, setStatus] = useState<MarketStatus>('open');
  const [marketTime, setMarketTime] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMarketStatus() {
      try {
        const res = await fetch('/api/market/status');
        const data = await res.json();
        setStatus(data.status);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to fetch market status:', err);
        setIsLoading(false);
        // Fallback: determine locally
        determineMarketStatus();
      }
    }

    function determineMarketStatus() {
      const now = new Date();
      const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const hour = nyTime.getHours();
      const minute = nyTime.getMinutes();
      const time = hour + minute / 60;
      const day = nyTime.getDay();

      // Weekend
      if (day === 0 || day === 6) {
        setStatus('closed');
        return;
      }

      // Market hours: 9:30 AM – 4:00 PM ET
      if (time >= 9.5 && time < 16) {
        setStatus('open');
      } else if (time >= 4 && time < 9.5) {
        setStatus('pre-market');
      } else if (time >= 16 && time < 20) {
        setStatus('after-hours');
      } else {
        setStatus('closed');
      }
    }

    fetchMarketStatus();

    // Update time every second and it's running in the background! (New York Time)
    const interval = setInterval(() => {
      setMarketTime(
        new Date().toLocaleTimeString('en-US', {
          timeZone: 'America/New_York',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return { status, marketTime, isLoading };
}