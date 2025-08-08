// Performance optimization utilities

// Debounce function for search and scroll events
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function for high-frequency events
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Intersection Observer for lazy loading
export const createIntersectionObserver = (
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver => {
  const defaultOptions: IntersectionObserverInit = {
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  };

  return new IntersectionObserver(callback, defaultOptions);
};

// Image preloader
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

// Batch image preloader
export const preloadImages = async (urls: string[], maxConcurrent = 3): Promise<void> => {
  const chunks = [];
  for (let i = 0; i < urls.length; i += maxConcurrent) {
    chunks.push(urls.slice(i, i + maxConcurrent));
  }

  for (const chunk of chunks) {
    await Promise.allSettled(chunk.map(preloadImage));
  }
};

// Request idle callback polyfill
export const requestIdleCallback = (
  callback: () => void,
  options: { timeout?: number } = {}
): number => {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  }
  
  return window.setTimeout(callback, options.timeout || 1);
};

// Memory usage monitor (development only)
export const monitorMemoryUsage = () => {
  if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
    const memory = (performance as any).memory;
    console.log('Memory Usage:', {
      used: `${Math.round(memory.usedJSHeapSize / 1048576)} MB`,
      total: `${Math.round(memory.totalJSHeapSize / 1048576)} MB`,
      limit: `${Math.round(memory.jsHeapSizeLimit / 1048576)} MB`
    });
  }
};

// Bundle size analyzer
export const logBundleMetrics = () => {
  if (process.env.NODE_ENV === 'development') {
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationEntry) {
      console.log('Loading Performance:', {
        domContentLoaded: `${navigationEntry.domContentLoadedEventEnd - navigationEntry.domContentLoadedEventStart}ms`,
        loadComplete: `${navigationEntry.loadEventEnd - navigationEntry.loadEventStart}ms`,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 'N/A',
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 'N/A'
      });
    }
  }
};

// Component performance tracker
export const withPerformanceTracking = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  return (props: P) => {
    if (process.env.NODE_ENV === 'development') {
      const startTime = performance.now();
      
      React.useEffect(() => {
        const endTime = performance.now();
        console.log(`${componentName} render time: ${endTime - startTime}ms`);
      });
    }
    
    return React.createElement(Component, props);
  };
};
