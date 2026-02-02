import { useState, useEffect } from 'react';

const STALE_THRESHOLD = 15 * 1000; // 15 seconds

export const useDataFreshness = (timestamp: number | null): boolean => {
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    if (timestamp === null) {
      setIsStale(true);
      return;
    }

    const checkStaleness = () => {
      const now = Date.now();
      const timeDiff = now - timestamp;
      setIsStale(timeDiff > STALE_THRESHOLD);
    };

    checkStaleness(); // Initial check

    const intervalId = setInterval(checkStaleness, 5000); // Check every 5 seconds

    return () => clearInterval(intervalId);
  }, [timestamp]);

  return isStale;
};
