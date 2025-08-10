import React from 'react';

// Performance optimization utilities

// Enhanced debounce function with immediate execution option
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    const callNow = immediate && !timeout;
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      timeout = null;
      if (!immediate) func(...args);
    }, wait);
    
    if (callNow) func(...args);
  };
};

// Enhanced throttle function with trailing edge control
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number,
  trailing = true
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  let lastFunc: NodeJS.Timeout;
  let lastRan: number;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      lastRan = Date.now();
      inThrottle = true;
    } else if (trailing) {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if (Date.now() - lastRan >= limit) {
          func(...args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
    
    setTimeout(() => inThrottle = false, limit);
  };
};

// Enhanced intersection observer with performance metrics
export const createIntersectionObserver = (
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver => {
  const defaultOptions: IntersectionObserverInit = {
    rootMargin: '50px',
    threshold: [0, 0.1, 0.5, 1],
    ...options
  };

  const enhancedCallback = (entries: IntersectionObserverEntry[]) => {
    const start = performance.now();
    callback(entries);
    const end = performance.now();
    
    if (process.env.NODE_ENV === 'development') {
      console.debug(`Intersection observer callback took ${end - start}ms`);
    }
  };

  return new IntersectionObserver(enhancedCallback, defaultOptions);
};

// Enhanced image preloader with retry and timeout
export const preloadImage = (
  src: string, 
  timeout = 10000,
  retries = 2
): Promise<void> => {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const attemptLoad = () => {
      const img = new Image();
      const timeoutId = setTimeout(() => {
        reject(new Error(`Image load timeout: ${src}`));
      }, timeout);
      
      img.onload = () => {
        clearTimeout(timeoutId);
        resolve();
      };
      
      img.onerror = () => {
        clearTimeout(timeoutId);
        attempts++;
        
        if (attempts <= retries) {
          setTimeout(attemptLoad, 1000 * attempts); // Exponential backoff
        } else {
          reject(new Error(`Failed to load image after ${retries} retries: ${src}`));
        }
      };
      
      img.src = src;
    };
    
    attemptLoad();
  });
};

// Enhanced batch image preloader with priority queue
export const preloadImages = async (
  urls: string[], 
  maxConcurrent = 3,
  priorityUrls: string[] = []
): Promise<{ loaded: string[], failed: string[] }> => {
  const prioritySet = new Set(priorityUrls);
  const sortedUrls = urls.sort((a, b) => {
    if (prioritySet.has(a) && !prioritySet.has(b)) return -1;
    if (!prioritySet.has(a) && prioritySet.has(b)) return 1;
    return 0;
  });
  
  const chunks = [];
  for (let i = 0; i < sortedUrls.length; i += maxConcurrent) {
    chunks.push(sortedUrls.slice(i, i + maxConcurrent));
  }

  const loaded: string[] = [];
  const failed: string[] = [];

  for (const chunk of chunks) {
    const results = await Promise.allSettled(
      chunk.map(async (url) => {
        try {
          await preloadImage(url);
          return url;
        } catch (error) {
          throw { url, error };
        }
      })
    );
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        loaded.push(result.value);
      } else {
        failed.push(chunk[index]);
        console.warn(`Failed to preload image:`, result.reason);
      }
    });
  }

  return { loaded, failed };
};

// Enhanced request idle callback with deadline tracking
export const requestIdleCallback = (
  callback: (deadline?: IdleDeadline) => void,
  options: { timeout?: number } = {}
): number => {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  }
  
  // Polyfill with timeout support
  const start = performance.now();
  return window.setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining() {
        return Math.max(0, 50 - (performance.now() - start));
      }
    } as IdleDeadline);
  }, options.timeout || 1);
};

// Enhanced memory monitoring with leak detection
export const monitorMemoryUsage = (logInterval = 30000) => {
  if (process.env.NODE_ENV !== 'development' || !('memory' in performance)) {
    return () => {}; // Return cleanup function
  }

  const memory = (performance as any).memory;
  let lastUsed = memory.usedJSHeapSize;
  let increasingTrend = 0;
  
  const logMemory = () => {
    const current = memory.usedJSHeapSize;
    const used = Math.round(current / 1048576);
    const total = Math.round(memory.totalJSHeapSize / 1048576);
    const limit = Math.round(memory.jsHeapSizeLimit / 1048576);
    const trend = current > lastUsed ? '↗️' : '↘️';
    
    // Track increasing memory trend
    if (current > lastUsed) {
      increasingTrend++;
    } else {
      increasingTrend = 0;
    }
    
    console.groupCollapsed(`Memory Usage: ${used}MB ${trend}`);
    console.log(`Used: ${used}MB / Total: ${total}MB / Limit: ${limit}MB`);
    console.log(`Usage: ${((used / limit) * 100).toFixed(1)}%`);
    
    if (increasingTrend > 5) {
      console.warn('⚠️ Potential memory leak detected - memory increasing for 5 consecutive checks');
    }
    
    if (used > limit * 0.8) {
      console.error('🚨 High memory usage - approaching limit!');
    }
    
    console.groupEnd();
    lastUsed = current;
  };

  const interval = setInterval(logMemory, logInterval);
  
  // Return cleanup function
  return () => clearInterval(interval);
};

// Enhanced performance metrics with Core Web Vitals
export const logBundleMetrics = () => {
  if (process.env.NODE_ENV !== 'development') return;

  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.entryType === 'measure') {
        console.log(`📊 ${entry.name}: ${entry.duration.toFixed(2)}ms`);
      }
    });
  });
  
  observer.observe({ entryTypes: ['measure', 'navigation'] });

  // Wait for page load to complete
  window.addEventListener('load', () => {
    setTimeout(() => {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigationEntry) {
        console.group('🚀 Performance Metrics');
        
        // Core timing metrics
        console.log(`DOM Content Loaded: ${navigationEntry.domContentLoadedEventEnd - navigationEntry.domContentLoadedEventStart}ms`);
        console.log(`Load Complete: ${navigationEntry.loadEventEnd - navigationEntry.loadEventStart}ms`);
        console.log(`First Byte: ${navigationEntry.responseStart - navigationEntry.requestStart}ms`);
        console.log(`DNS Lookup: ${navigationEntry.domainLookupEnd - navigationEntry.domainLookupStart}ms`);
        console.log(`Connection: ${navigationEntry.connectEnd - navigationEntry.connectStart}ms`);
        
        // Paint timing
        const paintEntries = performance.getEntriesByType('paint');
        paintEntries.forEach((entry) => {
          console.log(`${entry.name}: ${entry.startTime.toFixed(2)}ms`);
        });
        
        // Largest Contentful Paint
        const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
        if (lcpEntries.length > 0) {
          const lcp = lcpEntries[lcpEntries.length - 1];
          console.log(`Largest Contentful Paint: ${lcp.startTime.toFixed(2)}ms`);
        }
        
        console.groupEnd();
      }
      
      // Resource timing summary
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const resourceSummary = resources.reduce((acc, resource) => {
        const type = resource.initiatorType || 'other';
        if (!acc[type]) acc[type] = { count: 0, totalSize: 0, totalTime: 0 };
        acc[type].count++;
        acc[type].totalTime += resource.responseEnd - resource.requestStart;
        if (resource.transferSize) acc[type].totalSize += resource.transferSize;
        return acc;
      }, {} as Record<string, { count: number; totalSize: number; totalTime: number }>);
      
      console.table(resourceSummary);
    }, 100);
  });
};

// Frame rate monitor
export const monitorFrameRate = (duration = 10000) => {
  if (process.env.NODE_ENV !== 'development') return;
  
  let frames = 0;
  let startTime = performance.now();
  let lastTime = startTime;
  
  const frame = () => {
    frames++;
    const now = performance.now();
    
    if (now - startTime >= duration) {
      const fps = Math.round((frames * 1000) / (now - startTime));
      console.log(`📺 Average FPS over ${duration}ms: ${fps}`);
      
      if (fps < 30) {
        console.warn('⚠️ Low frame rate detected');
      }
      
      return;
    }
    
    lastTime = now;
    requestAnimationFrame(frame);
  };
  
  requestAnimationFrame(frame);
};

// Component performance tracker with profiling
export const withPerformanceTracking = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string,
  enableProfiling = false
) => {
  return React.memo((props: P) => {
    if (process.env.NODE_ENV === 'development') {
      const renderStartTime = performance.now();
      
      React.useEffect(() => {
        const renderEndTime = performance.now();
        const renderTime = renderEndTime - renderStartTime;
        
        performance.mark(`${componentName}-render-start`);
        performance.mark(`${componentName}-render-end`);
        performance.measure(
          `${componentName}-render`,
          `${componentName}-render-start`,
          `${componentName}-render-end`
        );
        
        if (renderTime > 16) { // Warn if render takes longer than 1 frame
          console.warn(`🐌 Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`);
        }
        
        if (enableProfiling) {
          console.log(`⚡ ${componentName} render time: ${renderTime.toFixed(2)}ms`);
        }
      });
    }
    
    return React.createElement(Component, props);
  });
};

// Bundle analyzer for code splitting insights
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV !== 'development') return;
  
  const startTime = performance.now();
  let scriptsLoaded = 0;
  let totalScriptSize = 0;
  
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.name.includes('.js') && entry.entryType === 'resource') {
        const resource = entry as PerformanceResourceTiming;
        scriptsLoaded++;
        totalScriptSize += resource.transferSize || 0;
      }
    });
  });
  
  observer.observe({ entryTypes: ['resource'] });
  
  window.addEventListener('load', () => {
    setTimeout(() => {
      console.group('📦 Bundle Analysis');
      console.log(`Scripts loaded: ${scriptsLoaded}`);
      console.log(`Total script size: ${(totalScriptSize / 1024).toFixed(2)} KB`);
      console.log(`Load time: ${(performance.now() - startTime).toFixed(2)}ms`);
      console.groupEnd();
      
      observer.disconnect();
    }, 1000);
  });
};

// Cleanup utility for performance monitoring
export const createPerformanceMonitor = () => {
  const cleanupFunctions: (() => void)[] = [];
  
  return {
    startMemoryMonitoring: (interval?: number) => {
      const cleanup = monitorMemoryUsage(interval);
      cleanupFunctions.push(cleanup);
      return cleanup;
    },
    
    startFrameRateMonitoring: (duration?: number) => {
      monitorFrameRate(duration);
    },
    
    logMetrics: () => {
      logBundleMetrics();
      analyzeBundleSize();
    },
    
    cleanup: () => {
      cleanupFunctions.forEach(cleanup => cleanup());
      cleanupFunctions.length = 0;
    }
  };
};
