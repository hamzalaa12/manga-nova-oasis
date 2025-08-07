import { useEffect, useCallback, useRef } from 'react';

export const useThrottledScroll = (callback: () => void, delay: number = 100) => {
  const lastCall = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const throttledCallback = useCallback(() => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall.current;

    if (timeSinceLastCall >= delay) {
      lastCall.current = now;
      callback();
    } else {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        lastCall.current = Date.now();
        callback();
      }, delay - timeSinceLastCall);
    }
  }, [callback, delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
};
